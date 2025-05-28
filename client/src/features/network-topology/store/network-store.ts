import { create } from "zustand";
import {
  Device,
  Port,
  Connection,
  NetworkPacket,
  MacTableEntry,
} from "../types";

const MAC_TABLE_ENTRY_TTL = 300_000;
let simulationTimeout: ReturnType<typeof setTimeout> | null = null;
let macAgingInterval: ReturnType<typeof setInterval> | null = null;

export interface NetworkState {
  devices: Record<string, Device>;
  connections: Connection[];
  macTables: {
    [switchId: string]: {
      [vlanId: number]: { [macAddress: string]: MacTableEntry };
    };
  };
  packets: Record<string, NetworkPacket>;
  activeConnections: Record<string, { floodCount: number }>;
  isSimulationRunning: boolean;
  addDevice: (device: Device) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (deviceId: string) => void;
  clearTopology: () => void;
  connectPorts: (from: Port, to: Port) => void;
  addPacket: (packet: NetworkPacket) => void;
  updatePacket: (id: string, updates: Partial<NetworkPacket>) => void;
  removePacket: (id: string) => void;
  clearPackets: () => void;
  sendPacket: (packetId: string) => Promise<void>;
  processPacket: (
    packetId: string,
    deviceId: string,
    portId: string
  ) => Promise<void>;
  updateMacTable: (
    deviceId: string,
    macAddress: string,
    portId: string,
    vlanId?: number
  ) => void;
  tickSimulation: () => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  setActiveConnection: (connectionId: string) => void;
  clearActiveConnection: (connectionId: string) => void;
  ageMacTables: () => void;
  sendPing: (fromDeviceId: string, targetIp: string) => Promise<void>;
  arpTables: { [deviceId: string]: { [ip: string]: string } };
  updateArpTable: (deviceId: string, ip: string, mac: string) => void;
  notifications: { id: string; message: string }[];
  addNotification: (message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

function findDeviceByIp(
  ip: string,
  devices: Record<string, Device>
): Device | undefined {
  return Object.values(devices).find((d) => d.ip_address === ip);
}

function buildPathBFS(
  fromDeviceId: string,
  toDeviceId: string,
  devices: Record<string, Device>,
  connections: Connection[]
): Array<{ deviceId: string; portId: string; process: any }> | null {
  type Hop = { deviceId: string; portId: string; prev?: Hop };
  const visited = new Set<string>(); // Track deviceId:portId
  const queue: Hop[] = [];

  const fromDevice = devices[fromDeviceId];
  if (!fromDevice) {
    console.log(
      `[DEBUG] buildPathBFS: Source device ${fromDeviceId} not found`
    );
    return null;
  }

  for (const port of fromDevice.ports) {
    if (port.connectedTo) {
      queue.push({ deviceId: fromDeviceId, portId: port.id });
      visited.add(`${fromDeviceId}:${port.id}`);
    }
  }

  let found: Hop | null = null;
  while (queue.length > 0) {
    const hop = queue.shift()!;
    // Если дошли до нужного устройства
    if (hop.deviceId === toDeviceId) {
      found = hop;
      break;
    }

    const device = devices[hop.deviceId];
    if (!device) continue;

    // Если это switch, добавляем переходы между всеми его портами (кроме текущего)
    if (device.type === "switch") {
      for (const port of device.ports) {
        const hopKey = `${device.id}:${port.id}`;
        if (port.id !== hop.portId && !visited.has(hopKey)) {
          visited.add(hopKey);
          queue.push({
            deviceId: device.id,
            portId: port.id,
            prev: hop,
          });
        }
      }
    }

    // Check connections, interpreting them as bidirectional
    for (const conn of connections) {
      let nextDeviceId: string | null = null;
      let nextPortId: string | null = null;

      // Forward direction
      if (
        conn.from.deviceId === hop.deviceId &&
        conn.from.portId === hop.portId
      ) {
        nextDeviceId = conn.to.deviceId;
        nextPortId = conn.to.portId;
      }
      // Reverse direction
      else if (
        conn.to.deviceId === hop.deviceId &&
        conn.to.portId === hop.portId
      ) {
        nextDeviceId = conn.from.deviceId;
        nextPortId = conn.from.portId;
      }

      const hopKey = `${nextDeviceId}:${nextPortId}`;
      if (nextDeviceId && nextPortId && !visited.has(hopKey)) {
        visited.add(hopKey);
        queue.push({
          deviceId: nextDeviceId,
          portId: nextPortId,
          prev: hop,
        });
      }
    }
  }

  if (!found) {
    return null;
  }

  const path: Array<{ deviceId: string; portId: string; process: any }> = [];
  let cur: Hop | undefined = found;
  while (cur) {
    path.unshift({
      deviceId: cur.deviceId,
      portId: cur.portId,
      process: (p: any, devId: string) => {},
    });
    cur = cur.prev;
  }
  return path;
}

function buildArpReplyPath(
  fromDevice: Device,
  toDevice: Device,
  devices: Record<string, Device>,
  connections: Connection[]
): Array<{ deviceId: string; portId: string; process: any }> {
  const path = buildPathBFS(fromDevice.id, toDevice.id, devices, connections);
  console.log(
    `[DEBUG] ARP Reply Path from ${fromDevice.id} to ${toDevice.id}:`,
    path,
    "Connections:",
    connections
  );

  if (!path || path.length < 2) {
    console.error(
      `[ARP] Не удалось построить путь ARP-REPLY от ${fromDevice.id} к ${toDevice.id}.`
    );
    return [];
  }
  return path.map((step) => ({
    deviceId: step.deviceId,
    portId: step.portId,
    process: (p: NetworkPacket, devId: string) => {},
  }));
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useNetworkStore = create<NetworkState>((set, get) => ({
  devices: {},
  connections: [],
  packets: {},
  macTables: {},
  activeConnections: {},
  isSimulationRunning: false,

  addDevice: (device) =>
    set((state) => ({
      devices: { ...state.devices, [device.id]: device },
    })),

  updateDevice: (deviceId, updates) =>
    set((state) => {
      const prev = state.devices[deviceId];
      if (!prev) return {};
      const safeUpdates =
        typeof updates === "object" && updates !== null ? updates : {};
      let updated: Device;
      if (prev.type === "host") {
        updated = {
          ...prev,
          ...safeUpdates,
          type: "host",
          gateway:
            "gateway" in safeUpdates
              ? (safeUpdates as any).gateway
              : prev.gateway,
        };
      } else if (prev.type === "switch") {
        updated = {
          ...prev,
          ...safeUpdates,
          type: "switch",
        };
      } else {
        updated = {
          ...prev,
          ...safeUpdates,
        };
      }
      return {
        devices: {
          ...state.devices,
          [deviceId]: updated,
        },
      };
    }),

  removeDevice: (deviceId: string) =>
    set((state) => {
      const newDevices = { ...state.devices };
      delete newDevices[deviceId];

      const newConnections = state.connections
        ? state.connections.filter(
            (conn) =>
              conn.from.deviceId !== deviceId && conn.to.deviceId !== deviceId
          )
        : [];

      // Create new devices object with cleaned ports
      const cleanedDevices: typeof newDevices = {};
      Object.entries(newDevices).forEach(([id, device]) => {
        cleanedDevices[id] = {
          ...device,
          ports: device.ports.map((port) =>
            port.connectedTo && port.connectedTo.deviceId === deviceId
              ? { ...port, connectedTo: undefined }
              : port
          ),
        };
      });

      return {
        devices: cleanedDevices,
        connections: newConnections,
      };
    }),
  clearTopology: () =>
    set(() => ({
      devices: {},
      connections: [],
      packets: {},
      macTables: {},
      activeConnections: {},
      arpTables: {},
    })),

  connectPorts: (from: Port, to: Port) =>
    set((state) => {
      const fromDevice = state.devices[from.deviceId];
      const toDevice = state.devices[to.deviceId];
      if (!fromDevice || !toDevice) {
        console.warn(`Device ${from.deviceId} or ${to.deviceId} not found`);
        return state;
      }

      const alreadyConnected = state.connections.some(
        (conn) =>
          (conn.from.deviceId === from.deviceId &&
            conn.to.deviceId === to.deviceId) ||
          (conn.from.deviceId === to.deviceId &&
            conn.to.deviceId === from.deviceId)
      );
      if (alreadyConnected) {
        alert(
          `Устройства "${fromDevice.name}" и "${toDevice.name}" уже соединены!`
        );
        window.electronAPI?.focus?.forceFocus?.();
        return state;
      }

      const isVlanCompatible = checkVlanCompatibility(
        from,
        to,
        fromDevice,
        toDevice
      );
      if (!isVlanCompatible) {
        alert(
          `VLAN mismatch: port ${from.name} (VLAN ${getPortVlan(
            from
          )}) cannot be connected to port ${to.name} (VLAN ${getPortVlan(to)}).`
        );
        window.electronAPI?.focus.forceFocus();
        return state;
      }

      const connectionId = `conn-${Date.now()}`;
      const newConnections = [
        ...state.connections,
        {
          id: connectionId,
          from: { deviceId: from.deviceId, portId: from.id },
          to: { deviceId: to.deviceId, portId: to.id },
        },
      ];
      const updatedDevices = {
        ...state.devices,
        [from.deviceId]: {
          ...fromDevice,
          ports: fromDevice.ports.map((p) =>
            p.id === from.id
              ? {
                  ...p,
                  connectedTo: {
                    name: to.name || `port-${to.id}`,
                    deviceId: to.deviceId,
                    portId: to.id,
                  },
                  active: true,
                  // Если VLAN не активен, тип становится access
                  type: p.isVlanEnabled ? p.type : "access",
                }
              : p
          ),
        },
        [to.deviceId]: {
          ...toDevice,
          ports: toDevice.ports.map((p) =>
            p.id === to.id
              ? {
                  ...p,
                  connectedTo: {
                    name: from.name || `port-${from.id}`,
                    deviceId: from.deviceId,
                    portId: from.id,
                  },
                  active: true,
                  // Если VLAN не активен, тип становится access
                  type: p.isVlanEnabled ? p.type : "access",
                }
              : p
          ),
        },
      };
      return {
        devices: updatedDevices,
        connections: newConnections,
      };
    }),

  updateMacTable: (deviceId, macAddress, portId, vlanId = 0) =>
    set((state) => ({
      macTables: {
        ...state.macTables,
        [deviceId]: {
          ...state.macTables[deviceId],
          [vlanId]: {
            ...state.macTables[deviceId]?.[vlanId],
            [macAddress]: { portId, timestamp: Date.now() },
          },
        },
      },
    })),

  addPacket: (packet) =>
    set((state) => {
      const { sourceDeviceId, sourcePortId, destMAC } = packet;
      const sourceDevice = state.devices[sourceDeviceId];
      if (!sourceDevice) return state;
      const sourcePort = sourceDevice.ports.find((p) => p.id === sourcePortId);
      if (!sourcePort || !sourcePort.connectedTo) return state;

      // VLAN обработка (оставь как есть)
      let effectiveVlanId = packet.vlanId;
      if (
        sourcePort.isVlanEnabled &&
        sourcePort.type === "access" &&
        !packet.vlanId
      ) {
        effectiveVlanId = sourcePort.accessVlan;
      }

      // --- ВАЖНО: path ---
      let path = packet.path;
      const isUnicast =
        destMAC &&
        destMAC !== "FF:FF:FF:FF:FF:FF" &&
        packet.type !== "ARP" &&
        packet.type !== "PING";

      if (!Array.isArray(path) || path.length === 0) {
        if (isUnicast && packet.type === "DATA") {
          // DATA: только первый хоп
          path = [
            {
              deviceId: sourceDeviceId,
              portId: sourcePortId,
              process: (p: NetworkPacket, devId: string) => {},
            },
            {
              deviceId: sourcePort.connectedTo.deviceId,
              portId: sourcePort.connectedTo.portId,
              process: (p: NetworkPacket, devId: string) => {},
            },
          ];
        } else if (isUnicast) {
          // Остальные unicast (PING, ARP-REPLY): полный маршрут
          const destDevice = Object.values(state.devices).find(
            (d) => d.mac_address === destMAC
          );
          if (destDevice) {
            path = buildPathBFS(
              sourceDeviceId,
              destDevice.id,
              state.devices,
              state.connections
            );
          }
        }
        // Fallback: если path всё ещё не построен
        if (!path || path.length === 0) {
          path = [
            {
              deviceId: sourceDeviceId,
              portId: sourcePortId,
              process: (p: NetworkPacket, devId: string) => {},
            },
            {
              deviceId: sourcePort.connectedTo.deviceId,
              portId: sourcePort.connectedTo.portId,
              process: (p: NetworkPacket, devId: string) => {},
            },
          ];
        }
      }

      const safePacket: NetworkPacket = {
        ...packet,
        path,
        currentHop: 0,
        x: sourceDevice.x ?? 0,
        y: sourceDevice.y ?? 0,
        isFlooded: packet.isFlooded ?? destMAC === "FF:FF:FF:FF:FF:FF",
        isResponse: packet.isResponse ?? false,
        ttl: packet.ttl ?? 64,
        visited: packet.visited ?? new Set<string>(),
        vlanId: effectiveVlanId,
        isProcessed: false,
        isPlaying: packet.isPlaying ?? get().isSimulationRunning,
      };
      return {
        packets: { ...state.packets, [safePacket.id]: safePacket },
      };
    }),

  updatePacket: (packetId, updates) =>
    set((state) => {
      if (!state.packets[packetId]) return state;
      const updatedPacket = {
        ...state.packets[packetId],
        ...updates,
        originalPath:
          updates.originalPath || state.packets[packetId].originalPath || [],
      };
      return {
        packets: {
          ...state.packets,
          [packetId]: updatedPacket,
        },
      };
    }),

  removePacket: (packetId) =>
    set((state) => {
      const newPackets = { ...state.packets };
      delete newPackets[packetId];
      return { packets: newPackets };
    }),

  clearPackets: () => set({ packets: {} }),

  sendPacket: async (packetId: string) => {
    const state = get();
    const packet = state.packets[packetId];
    if (!packet) {
      console.warn(`[ERROR] Packet ${packetId} not found`);
      return;
    }

    if (!packet.isPlaying) {
      console.warn(`[ERROR] Packet ${packetId} is not playing`);
      return;
    }

    if (packet.currentHop >= packet.path.length) {
      console.log(
        `[DELIVERY] Packet ${packetId} successfully delivered to ${
          packet.path[packet.path.length - 1]?.deviceId
        }`
      );
      setTimeout(() => get().removePacket(packetId), 2000);
      return;
    }

    const hop = packet.path[packet.currentHop];
    if (!hop) {
      console.error(
        `[ERROR] No hop at currentHop ${packet.currentHop} for packet ${packetId}, path:`,
        packet.path
      );
      get().removePacket(packetId);
      return;
    }

    const device = state.devices[hop.deviceId];
    if (!device) {
      console.error(
        `[ERROR] Device ${hop.deviceId} not found for packet ${packetId}`
      );
      get().removePacket(packetId);
      return;
    }

    console.log(
      `[DEBUG] Sending packet ${packetId} to device ${hop.deviceId} at hop ${packet.currentHop}, path:`,
      packet.path
    );

    await hop.process?.(packet, hop.deviceId);
    await delay(1500);
    await get().processPacket(packetId, hop.deviceId, hop.portId);
  },

  processPacket: async (packetId, deviceId, portId) => {
    const state = get();
    const packet = state.packets[packetId];
    if (!packet) return;
    const device = state.devices[deviceId];
    if (!device) return;
    const port = device.ports.find((p) => p.id === portId);
    if (!port) return;

    if (packet.isProcessed) {
      console.log(`[PROCESS] Packet ${packetId} already processed, skipping`);
      return;
    }

    // TTL
    if (packet.ttl <= 0) {
      get().removePacket(packetId);
      return;
    }
    get().updatePacket(packetId, { ttl: packet.ttl - 1 });

    if (device.type === "switch" && packet.sourceMAC) {
      get().updateMacTable(
        deviceId,
        packet.sourceMAC,
        portId,
        packet.vlanId ?? 0
      );
    }

    // === HOST ===
    if (device.type === "host") {
      if (port.isVlanEnabled && port.type === "access") {
        if (packet.vlanId !== port.accessVlan) {
          setTimeout(() => get().removePacket(packetId), 1000);
          return;
        }
      }

      // Flood highlight
      const connection = state.connections.find(
        (c) =>
          (c.from.deviceId === deviceId && c.from.portId === portId) ||
          (c.to.deviceId === deviceId && c.to.portId === portId)
      );
      if (connection && packet.isFlooded) {
        get().setActiveConnection(connection.id);
        setTimeout(() => get().clearActiveConnection(connection.id), 4000);
      }

      // --- ARP ---
      if (packet.type === "ARP" && packet.payload) {
        try {
          const arpPayload = JSON.parse(packet.payload);
          if (
            arpPayload.type === "ARP-REQUEST" &&
            device.ip_address === arpPayload.targetIp
          ) {
            get().addNotification(
              `Устройство ${device.name} (${device.ip_address}) получило ARP-REQUEST от ${packet.sourceMAC}`
            );
            get().updatePacket(packetId, { isProcessed: true });

            const allDevices = get().devices;
            const senderDevice = Object.values(allDevices).find(
              (d) => d.mac_address === packet.sourceMAC
            );
            if (!senderDevice) {
              console.warn(
                `[ERROR] Sender device for MAC ${packet.sourceMAC} not found`
              );
              get().removePacket(packetId);
              return;
            }
            const replyPath = buildArpReplyPath(
              device,
              senderDevice,
              get().devices,
              get().connections
            );
            if (!replyPath || replyPath.length === 0) {
              console.error(
                `[ERROR] No path for ARP-REPLY from ${device.id} to ${senderDevice.id}`
              );
              get().removePacket(packetId);
              return;
            }
            const replyPacket: NetworkPacket = {
              id: `arp-reply-${Date.now()}-${device.id}`,
              sourceDeviceId: device.id,
              sourcePortId: device.ports[0].id,
              destMAC: packet.sourceMAC,
              sourceMAC: device.mac_address,
              vlanId: packet.vlanId,
              payload: JSON.stringify({
                type: "ARP-REPLY",
                targetIp: arpPayload.targetIp,
                senderIp: device.ip_address,
                senderMac: device.mac_address,
              }),
              path: replyPath,
              currentHop: 0,
              x: device.x ?? 0,
              y: device.y ?? 0,
              isFlooded: false,
              isResponse: true,
              ttl: 64,
              type: "ARP",
              visited: new Set<string>(),
              isProcessed: false,
              isPlaying: true,
            };
            get().addPacket(replyPacket);
            if (!get().isSimulationRunning) {
              set({ isSimulationRunning: true });
              get().tickSimulation();
            }
            get().removePacket(packetId);
            console.log(
              `[DEBUG] Created ARP-REPLY packet ${replyPacket.id} with path:`,
              replyPacket.path
            );
            if (replyPacket.path[0]?.deviceId !== device.id) {
              replyPacket.path.unshift({
                deviceId: device.id,
                portId: device.ports[0].id,
                process: (p: NetworkPacket, devId: string) => {},
              });
            }
            return;
          }
          if (
            arpPayload.type === "ARP-REPLY" &&
            device.mac_address === packet.destMAC
          ) {
            get().updateArpTable(
              device.id,
              arpPayload.senderIp,
              arpPayload.senderMac
            );
            get().addNotification(
              `Устройство ${device.name} (${device.ip_address}) получило ARP-REPLY от ${packet.sourceMAC}`
            );
            console.log(
              `[ARP-REPLY] Delivered to host ${device.id} (${device.mac_address}), updating ARP table and removing packet`
            );
            get().updatePacket(packetId, { isProcessed: true });
            get().removePacket(packetId);
            return;
          }
        } catch (e) {
          console.error(`[ERROR] Parsing ARP payload: ${e}`);
        }
      }

      // --- PING ---
      if (packet.type === "PING" && packet.payload) {
        try {
          const pingPayload = JSON.parse(packet.payload);
          // Recipient of ping request
          if (
            pingPayload.type === "PING-REQUEST" &&
            device.mac_address === packet.destMAC
          ) {
            get().updatePacket(packetId, { isProcessed: true });

            const allDevices = get().devices;
            const senderDevice = Object.values(allDevices).find(
              (d) => d.mac_address === packet.sourceMAC
            );
            if (!senderDevice) {
              get().removePacket(packetId);
              return;
            }
            const replyPath = buildArpReplyPath(
              device,
              senderDevice,
              get().devices,
              get().connections
            );
            const replyPacket: NetworkPacket = {
              id: `ping-reply-${Date.now()}-${device.id}`,
              sourceDeviceId: device.id,
              sourcePortId: device.ports[0].id,
              destMAC: packet.sourceMAC,
              sourceMAC: device.mac_address,
              vlanId: packet.vlanId,
              payload: JSON.stringify({
                type: "PING-REPLY",
                macSource: packet.destMAC,
              }),
              path: replyPath,
              currentHop: 0,
              x: device.x ?? 0,
              y: device.y ?? 0,
              isFlooded: false,
              isResponse: true,
              ttl: 64,
              type: "PING",
              visited: new Set<string>(),
              sentAt: Date.now(), // Update sentAt for accurate RTT
              isProcessed: false,
              isPlaying: get().isSimulationRunning ? true : false,
            };
            get().addPacket(replyPacket);
            get().removePacket(packetId);
            const totalHops = replyPath.length - 1;
            const pingDelay = totalHops * 2000 + 2000; // Увеличиваем задержку
            console.log(
              `[DEBUG] PING reply delay set to ${pingDelay} ms for ${totalHops} hops`
            );
            setTimeout(async () => {
              get().updatePacket(replyPacket.id, { isPlaying: true });
              if (!get().isSimulationRunning) {
                set({ isSimulationRunning: true });
                get().tickSimulation();
              }
              // await get().sendPacket(replyPacket.id); // tickSimulation сам подхватит
            }, pingDelay);

            return;
          }
          if (
            pingPayload.type === "PING-REPLY" &&
            device.mac_address === packet.destMAC
          ) {
            const rtt = packet.sentAt ? Date.now() - packet.sentAt : undefined;
            console.log(
              `[PING] Host ${device.name} (${device.mac_address}) received reply, RTT = ${rtt} ms, packet:`,
              packet
            );
            // Сразу помечаем пакет как завершённый
            get().updatePacket(packetId, {
              isPlaying: false,
              isProcessed: true,
            });
            const totalHops = packet.path.length - 1;
            const removalDelay = totalHops * 1500 + 2000;
            setTimeout(() => get().removePacket(packetId), removalDelay);
            return;
          }
        } catch (e) {
          console.error(`[ERROR] Parsing PING payload: ${e}`);
        }
      }

      // Flood packet disappears on any host except sender (currentHop > 0)
      if (packet.isFlooded && packet.currentHop > 0) {
        setTimeout(() => get().removePacket(packetId), 4000);
        return;
      }

      if (packet.destMAC === device.mac_address) {
        get().updatePacket(packetId, {
          currentHop: packet.currentHop + 1,
        });
        setTimeout(() => get().removePacket(packetId), 5000);
        return;
      }

      // If there’s a next hop, forward it
      if (packet.currentHop < packet.path.length - 1) {
        const nextHop = packet.path[packet.currentHop + 1];
        const nextDevice = state.devices[nextHop.deviceId];
        const nextPort = nextDevice?.ports.find((p) => p.id === nextHop.portId);
        if (nextPort?.isVlanEnabled) {
          if (
            nextPort.type === "access" &&
            packet.vlanId !== nextPort.accessVlan
          ) {
            setTimeout(() => get().removePacket(packetId), 1000);
            return;
          }
          if (
            nextPort.type === "trunk" &&
            !nextPort.allowedVlanList?.includes(packet.vlanId!)
          ) {
            setTimeout(() => get().removePacket(packetId), 1000);
            return;
          }
        }
        // Update state atomically
        get().updatePacket(packetId, {
          currentHop: packet.currentHop + 1,
          x: nextDevice?.x ?? packet.x,
          y: nextDevice?.y ?? packet.y,
        });
        // Wait for the animation duration (1500 ms) before processing the next hop
        await delay(1500);
        await get().processPacket(packetId, nextHop.deviceId, nextHop.portId);
        return;
      }
      get().removePacket(packetId);
      return;
    }

    // === SWITCH ===
    if (device.type === "switch") {
      console.log(
        `[DEBUG] SWITCH ${deviceId} processing packet ${packet.id} at hop ${packet.currentHop}, port ${port.id}`
      );
      let effectiveVlanId = packet.vlanId;
      if (
        port.type === "access" &&
        port.isVlanEnabled &&
        packet.vlanId == null
      ) {
        effectiveVlanId = port.accessVlan;
        get().updatePacket(packetId, { vlanId: effectiveVlanId });
        console.log(
          `[SWITCH] ${deviceId} tagging packet ${packet.id} with VLAN=${effectiveVlanId} on access port ${portId}`
        );
      }

      let visited =
        packet.visited instanceof Set
          ? packet.visited
          : new Set(packet.visited || []);
      const hopKey = `${device.id}:${port.id}`; // Упрощённый ключ

      // Проверку loop делаем только для flood-пакетов
      if (packet.isFlooded && visited.has(hopKey)) {
        console.log(
          `[SWITCH] ${deviceId} drops packet ${packet.id}: forwarding loop detected, visited:`,
          Array.from(visited),
          "hopKey:",
          hopKey
        );
        get().removePacket(packetId);
        return;
      }
      visited.add(hopKey);
      get().updatePacket(packetId, { visited });

      // Update macTables for ARP-REPLY
      if (packet.type === "ARP" && packet.payload) {
        try {
          const arpPayload = JSON.parse(packet.payload);
          if (arpPayload.type === "ARP-REPLY" && arpPayload.senderMac) {
            get().updateMacTable(
              deviceId,
              arpPayload.senderMac,
              portId,
              effectiveVlanId ?? 0
            );
            console.log(
              `[SWITCH] ${deviceId} updated macTables: ${arpPayload.senderMac} → port ${portId}`
            );
          }
        } catch (e) {
          console.error(`[ERROR] Parsing ARP payload in switch: ${e}`);
        }
      }

      // If there’s a next hop in path, check VLAN and forward
      if (packet.currentHop < packet.path.length - 1) {
        const nextHop = packet.path[packet.currentHop + 1];
        const nextDevice = state.devices[nextHop.deviceId];
        const nextPort = nextDevice?.ports.find((p) => p.id === nextHop.portId);
        if (nextPort?.isVlanEnabled) {
          if (
            nextPort.type === "access" &&
            packet.vlanId !== nextPort.accessVlan
          ) {
            setTimeout(() => get().removePacket(packetId), 1000);
            return;
          }
          if (
            nextPort.type === "trunk" &&
            !nextPort.allowedVlanList?.includes(packet.vlanId!)
          ) {
            setTimeout(() => get().removePacket(packetId), 1000);
            return;
          }
        }
        // Update state atomically
        get().updatePacket(packetId, {
          currentHop: packet.currentHop + 1,
          x: nextDevice?.x ?? packet.x,
          y: nextDevice?.y ?? packet.y,
        });
        // Dynamic delay based on remaining hops (minimum 1500 ms per hop)
        const remainingHops = packet.path.length - (packet.currentHop + 1);
        const delayTime = Math.max(1500, remainingHops * 1500); // Ensure at least 1500 ms
        await delay(delayTime);
        await get().processPacket(packetId, nextHop.deviceId, nextHop.portId);
        return;
      }

      // If no next hop but destMAC exists, look in MAC table
      const vlanId = effectiveVlanId ?? 0;
      const macTable = state.macTables[deviceId]?.[vlanId] ?? {};
      const destPortId = macTable[packet.destMAC]?.portId;
      if (
        destPortId &&
        packet.destMAC &&
        packet.destMAC !== "FF:FF:FF:FF:FF:FF"
      ) {
        const destPort = device.ports.find((p) => p.id === destPortId);
        if (destPort?.connectedTo) {
          if (destPort.isVlanEnabled) {
            if (
              destPort.type === "access" &&
              effectiveVlanId !== destPort.accessVlan
            ) {
              setTimeout(() => get().removePacket(packetId), 1000);
              return;
            }
            if (
              destPort.type === "trunk" &&
              !destPort.allowedVlanList?.includes(effectiveVlanId!)
            ) {
              setTimeout(() => get().removePacket(packetId), 1000);
              return;
            }
          }
          const nextDeviceId = destPort.connectedTo.deviceId;
          const nextPortId = destPort.connectedTo.portId;
          const nextDevice = state.devices[nextDeviceId];
          if (nextDevice) {
            const newPath = [
              ...packet.path,
              {
                deviceId: nextDeviceId,
                portId: nextPortId,
                process: (p: NetworkPacket, devId: string) => {},
              },
            ];
            get().updatePacket(packetId, {
              path: newPath,
              currentHop: packet.currentHop + 1,
              x: nextDevice.x ?? packet.x,
              y: nextDevice.y ?? packet.y,
            });
            await delay(1500);
            await get().processPacket(packetId, nextDeviceId, nextPortId);
            return;
          }
        }
      }

      // FLOODING: if no MAC in table or it’s a broadcast
      if (
        !destPortId ||
        packet.isFlooded ||
        !packet.destMAC ||
        packet.destMAC === "FF:FF:FF:FF:FF:FF"
      ) {
        const portsToFlood = device.ports.filter((p) => {
          // Не флудим во входящий порт
          if (p.id === port.id) return false;
          // Не флудим в неактивные порты
          if (p.active === false) return false;
          // Не флудим в порты типа 'none'
          if (p.type === "none") return false;
          // Не флудим в неподключённые порты
          if (!p.connectedTo) return false;
          // VLAN фильтрация
          if (typeof effectiveVlanId === "number") {
            if (!p.isVlanEnabled) return false;
            if (p.type === "access" && effectiveVlanId !== p.accessVlan)
              return false;
            if (
              p.type === "trunk" &&
              !p.allowedVlanList?.includes(effectiveVlanId!)
            )
              return false;
          } else {
            // Если пакет без VLAN, не флудим на trunk-порты
            if (p.type === "trunk") return false;
          }
          return true;
        });
        // Wait for the animation of the incoming packet to complete
        await delay(1500); // Matches the animation duration in PacketEntity
        await Promise.all(
          portsToFlood.map(async (floodPort) => {
            const nextDeviceId = floodPort.connectedTo!.deviceId;
            const nextPortId = floodPort.connectedTo!.portId;
            const nextDevice = state.devices[nextDeviceId];
            const visitKey = `${nextDeviceId}:${nextPortId}`;
            if (visited.has(visitKey)) return;
            console.log(
              `[SWITCH] ${deviceId} FLOOD packet ${packet.id} on port ${floodPort.id} → ${nextDeviceId}:${nextPortId}`
            );
            if (nextDevice) {
              const floodPacket: NetworkPacket = {
                id: `${packet.id}-flood-${nextDeviceId}-${Date.now()}`,
                sourceDeviceId: device.id,
                sourcePortId: floodPort.id,
                destMAC: packet.destMAC,
                sourceMAC: packet.sourceMAC,
                vlanId: effectiveVlanId,
                payload: packet.payload,
                path: [
                  {
                    deviceId: device.id,
                    portId: floodPort.id,
                    process: (p: NetworkPacket, devId: string) => {},
                  },
                  {
                    deviceId: nextDeviceId,
                    portId: nextPortId,
                    process: (p: NetworkPacket, devId: string) => {},
                  },
                ],
                currentHop: 0,
                x: device.x ?? 0,
                y: device.y ?? 0,
                isFlooded: true,
                isResponse: false,
                ttl: packet.ttl,
                visited: new Set(visited),
                type: packet.type,
                sentAt: packet.sentAt,
                isProcessed: false,
                isPlaying: false,
              };
              get().addPacket(floodPacket);
              await delay(500);
              get().updatePacket(floodPacket.id, {
                currentHop: 1,
                x: nextDevice.x ?? floodPacket.x,
                y: nextDevice.y ?? floodPacket.y,
              });
              await delay(1500);
              await get().processPacket(
                floodPacket.id,
                nextDeviceId,
                nextPortId
              );
            }
          })
        );
        setTimeout(() => {
          get().removePacket(packetId);
        }, 1000);
        return;
      }

      setTimeout(() => get().removePacket(packetId), 1000);
      return;
    }

    // If device type is undefined, remove packet
    get().removePacket(packetId);
  },

  sendPing: async (fromDeviceId: string, targetIp: string) => {
    const state = get();
    const fromDevice = state.devices[fromDeviceId];
    if (!fromDevice) {
      console.warn(`[PING] Source device ${fromDeviceId} not found`);
      return;
    }

    const targetDevice = findDeviceByIp(targetIp, state.devices);
    if (!targetDevice) {
      console.warn(`[PING] Target device with IP ${targetIp} not found`);
      return;
    }

    // Check if we know the MAC address of the target
    let destMAC = state.arpTables[fromDeviceId]?.[targetIp];
    const vlanId = fromDevice.ports[0]?.isVlanEnabled
      ? fromDevice.ports[0].accessVlan
      : undefined;

    // If MAC is not known, initiate ARP request
    if (!destMAC) {
      console.log(
        `[PING] MAC address of ${targetIp} unknown, creating ARP request from ${fromDeviceId}`
      );
      const arpPacket: NetworkPacket = {
        id: `arp-ping-${Date.now()}-${fromDeviceId}`,
        sourceDeviceId: fromDeviceId,
        sourcePortId: fromDevice.ports[0].id,
        destMAC: "FF:FF:FF:FF:FF:FF",
        sourceMAC: fromDevice.mac_address,
        vlanId: vlanId,
        payload: JSON.stringify({
          type: "ARP-REQUEST",
          targetIp: targetIp,
          senderIp: fromDevice.ip_address,
        }),
        path: [],
        currentHop: 0,
        x: fromDevice.x ?? 0,
        y: fromDevice.y ?? 0,
        isFlooded: true,
        isResponse: false,
        ttl: 64,
        type: "ARP",
        visited: new Set<string>(),
        isProcessed: false,
        isPlaying: false,
      };
      get().addPacket(arpPacket);

      // Wait for ARP reply or for the ARP request to be removed (e.g., due to TTL or loop)

      let arpResolved = false;
      const arpPacketId = arpPacket.id;
      let macAppearedAt: number | null = null;
      // let arpRequestGoneAt: number | null = null;
      const maxWait = 30000; // максимум 30 секунд ожидания

      const startTime = Date.now();
      while (!arpResolved) {
        await delay(500);
        const updatedState = get();
        destMAC = updatedState.arpTables[fromDeviceId]?.[targetIp];
        if (destMAC && !macAppearedAt) {
          macAppearedAt = Date.now();
        }
        // Если MAC появился, ждём исчезновения всех ARP-REPLY пакетов к этому устройству и IP
        if (macAppearedAt) {
          const activeArpReplies = Object.values(updatedState.packets).filter(
            (p) =>
              p.type === "ARP" &&
              p.payload &&
              (() => {
                try {
                  const payload = JSON.parse(p.payload);
                  return (
                    payload.type === "ARP-REPLY" &&
                    payload.targetIp === targetIp &&
                    payload.senderMac === destMAC
                  );
                } catch {
                  return false;
                }
              })()
          );
          if (activeArpReplies.length === 0) {
            arpResolved = true;
            break;
          }
        }
        // Защита от вечного цикла
        if (Date.now() - startTime > maxWait) {
          console.warn(`[PING] Timeout waiting for ARP reply for ${targetIp}`);
          return;
        }
      }

      if (!destMAC) {
        console.warn(`[PING] Failed to resolve MAC address for ${targetIp}`);
        return;
      }
    }

    // Create PING-REQUEST without starting simulation or sending
    const pingPacket: NetworkPacket = {
      id: `ping-${Date.now()}-${fromDeviceId}`,
      sourceDeviceId: fromDeviceId,
      sourcePortId: fromDevice.ports[0].id,
      destMAC: destMAC,
      sourceMAC: fromDevice.mac_address,
      vlanId: vlanId,
      payload: JSON.stringify({ type: "PING-REQUEST" }),
      path: buildArpReplyPath(
        fromDevice,
        targetDevice,
        state.devices,
        state.connections
      ),
      currentHop: 0,
      x: fromDevice.x ?? 0,
      y: fromDevice.y ?? 0,
      isFlooded: false,
      isResponse: false,
      ttl: 64,
      type: "PING",
      visited: new Set<string>(),
      sentAt: Date.now(),
      isProcessed: false,
      isPlaying: get().isSimulationRunning ? true : false, // <-- вот тут!
    };
    get().addPacket(pingPacket);
    if (!get().isSimulationRunning) {
      set({ isSimulationRunning: true });
      get().tickSimulation();
    }
  },

  tickSimulation: async () => {
    const state = get();
    if (!state.isSimulationRunning) return;

    const packets = Object.values(state.packets).filter(
      (p) => p.currentHop < p.path.length && p.isPlaying
    );

    if (packets.length === 0) {
      set({ isSimulationRunning: false });
      return;
    }

    // Process each packet in parallel
    await Promise.all(
      packets.map(async (packet) => {
        const currentHop = packet.path[packet.currentHop];
        if (currentHop) {
          get().updatePacket(packet.id, { isPlaying: true }); // Запускаем анимацию
          await get().processPacket(
            packet.id,
            currentHop.deviceId,
            currentHop.portId
          );
        }
      })
    );

    // Next tick after 1500 ms
    setTimeout(() => {
      get().tickSimulation();
    }, 1500);
  },

  ageMacTables: () => {
    set((state) => {
      const now = Date.now();
      const newMacTables = { ...state.macTables };
      let changed = false;
      for (const switchId in newMacTables) {
        for (const vlanId in newMacTables[switchId]) {
          const macTable = newMacTables[switchId][vlanId];
          for (const mac in macTable) {
            if (now - macTable[mac].timestamp > MAC_TABLE_ENTRY_TTL) {
              delete macTable[mac];
              changed = true;
            }
          }
        }
      }
      return changed ? { macTables: newMacTables } : {};
    });
  },

  startSimulation: () => {
    if (get().isSimulationRunning) return;
    set((state) => ({
      isSimulationRunning: true,
      packets: Object.fromEntries(
        Object.entries(state.packets).map(([id, p]) => [
          id,
          { ...p, isPlaying: true },
        ])
      ),
    }));
    get().tickSimulation();
    if (!macAgingInterval) {
      macAgingInterval = setInterval(() => {
        get().ageMacTables();
      }, 10_000);
    }
  },

  stopSimulation: () => {
    set({ isSimulationRunning: false });
    if (macAgingInterval) {
      clearInterval(macAgingInterval);
      macAgingInterval = null;
    }
  },

  setActiveConnection: (connectionId) =>
    set((state) => {
      const prev = state.activeConnections[connectionId]?.floodCount ?? 0;
      const newActiveConnections = {
        ...state.activeConnections,
        [connectionId]: { floodCount: prev + 1 },
      };
      return { activeConnections: newActiveConnections };
    }),

  clearActiveConnection: (connectionId) =>
    set((state) => {
      const prev = state.activeConnections[connectionId]?.floodCount ?? 0;
      if (prev <= 1) {
        const newActiveConnections = { ...state.activeConnections };
        delete newActiveConnections[connectionId];
        return { activeConnections: newActiveConnections };
      } else {
        const newActiveConnections = {
          ...state.activeConnections,
          [connectionId]: { floodCount: prev - 1 },
        };
        return { activeConnections: newActiveConnections };
      }
    }),
  arpTables: {},
  updateArpTable: (deviceId, ip, mac) =>
    set((state) => ({
      arpTables: {
        ...state.arpTables,
        [deviceId]: {
          ...state.arpTables[deviceId],
          [ip]: mac,
        },
      },
    })),
  notifications: [],
  addNotification: (message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: `${Date.now()}-${Math.random()}`, message },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));

function getPortVlan(port: Port): number | undefined {
  if (port.isVlanEnabled) {
    if (port.type === "access" && port.accessVlan !== undefined) {
      return port.accessVlan;
    }
    if (port.type === "trunk" && port.allowedVlanList) {
      return port.allowedVlanList[0];
    }
  }
  return undefined;
}

function checkVlanCompatibility(
  from: Port,
  to: Port,
  fromDevice: Device,
  toDevice: Device
): boolean {
  if (from.isVlanEnabled !== to.isVlanEnabled) {
    return false;
  }
  if (!from.isVlanEnabled && !to.isVlanEnabled) return true;

  const fromVlan = getPortVlan(from);
  const toVlan = getPortVlan(to);
  if (from.type === "access" && to.type === "access") {
    return fromVlan === toVlan;
  }
  if (from.type === "access" && to.type === "trunk" && fromVlan !== undefined) {
    return to.allowedVlanList?.includes(fromVlan) || false;
  }

  if (from.type === "trunk" && to.type === "access" && toVlan !== undefined) {
    return from.allowedVlanList?.includes(toVlan) || false;
  }

  if (from.type === "trunk" && to.type === "trunk") {
    if (!from.allowedVlanList || !to.allowedVlanList) return false;
    return from.allowedVlanList.some((vlan) =>
      to.allowedVlanList.includes(vlan)
    );
  }

  return true;
}
