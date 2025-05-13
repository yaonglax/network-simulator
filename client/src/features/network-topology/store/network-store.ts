import { create } from "zustand";
import {
  Device,
  Port,
  Connection,
  NetworkPacket,
  MacTableEntry,
} from "../types";

const MAC_TABLE_ENTRY_TTL = 300_000; // 5 минут
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
  updateDevice: <T extends Device>(id: string, updates: Partial<T>) => void;
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
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Универсальный путь для ARP-ответа
function buildArpReplyPath(
  fromDevice: Device,
  toDevice: Device,
  connections: Connection[]
): { deviceId: string; portId: string; process: any }[] {
  const fromPort = fromDevice.ports[0];
  const fromConn = connections.find(
    (c) =>
      (c.from.deviceId === fromDevice.id && c.from.portId === fromPort.id) ||
      (c.to.deviceId === fromDevice.id && c.to.portId === fromPort.id)
  );
  if (!fromConn)
    return [
      { deviceId: fromDevice.id, portId: fromPort.id, process: () => {} },
    ];

  const fromSwitchId =
    fromConn.from.deviceId === fromDevice.id
      ? fromConn.to.deviceId
      : fromConn.from.deviceId;
  const fromSwitchPortId =
    fromConn.from.deviceId === fromDevice.id
      ? fromConn.to.portId
      : fromConn.from.portId;

  const toPort = toDevice.ports[0];
  const toConn = connections.find(
    (c) =>
      (c.from.deviceId === toDevice.id && c.from.portId === toPort.id) ||
      (c.to.deviceId === toDevice.id && c.to.portId === toPort.id)
  );
  if (!toConn)
    return [
      { deviceId: fromDevice.id, portId: fromPort.id, process: () => {} },
      { deviceId: fromSwitchId, portId: fromSwitchPortId, process: () => {} },
    ];

  const toSwitchId =
    toConn.from.deviceId === toDevice.id
      ? toConn.to.deviceId
      : toConn.from.deviceId;
  const toSwitchPortId =
    toConn.from.deviceId === toDevice.id
      ? toConn.to.portId
      : toConn.from.portId;

  if (fromSwitchId === toSwitchId) {
    return [
      { deviceId: fromDevice.id, portId: fromPort.id, process: () => {} },
      { deviceId: fromSwitchId, portId: fromSwitchPortId, process: () => {} },
      { deviceId: toDevice.id, portId: toPort.id, process: () => {} },
    ];
  } else {
    return [
      { deviceId: fromDevice.id, portId: fromPort.id, process: () => {} },
      { deviceId: fromSwitchId, portId: fromSwitchPortId, process: () => {} },
      { deviceId: toSwitchId, portId: toSwitchPortId, process: () => {} },
      { deviceId: toDevice.id, portId: toPort.id, process: () => {} },
    ];
  }
}

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
    set((state) => ({
      devices: {
        ...state.devices,
        [deviceId]: { ...state.devices[deviceId], ...updates },
      },
    })),

  connectPorts: (from: Port, to: Port) =>
    set((state) => {
      const fromDevice = state.devices[from.deviceId];
      const toDevice = state.devices[to.deviceId];
      if (!fromDevice || !toDevice) {
        console.warn(`Device ${from.deviceId} or ${to.deviceId} not found`);
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
      if (!sourceDevice) {
        console.warn(`Source device ${sourceDeviceId} not found`);
        return state;
      }
      const sourcePort = sourceDevice.ports.find((p) => p.id === sourcePortId);
      if (!sourcePort) {
        console.warn(
          `Source port ${sourcePortId} not found on device ${sourceDeviceId}`
        );
        return state;
      }
      if (!sourcePort.connectedTo) {
        console.warn(
          `Source port ${sourcePortId} on device ${sourceDeviceId} is not connected`
        );
        return state;
      }
      const path = [
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

  sendPacket: async (packetId) => {
    const state = get();
    const packet = state.packets[packetId];
    if (!packet) return;
    if (packet.currentHop >= packet.path.length) {
      get().removePacket(packetId);
      return;
    }
    const currentHop = packet.path[packet.currentHop];
    if (currentHop) {
      await get().processPacket(
        packetId,
        currentHop.deviceId,
        currentHop.portId
      );
    }
  },

  processPacket: async (packetId, deviceId, portId) => {
    const state = get();
    const packet = state.packets[packetId];
    if (!packet) return;
    const device = state.devices[deviceId];
    if (!device) return;
    const port = device.ports.find((p) => p.id === portId);
    if (!port) return;

    // TTL
    if (packet.ttl <= 0) {
      get().removePacket(packetId);
      return;
    }
    get().updatePacket(packetId, { ttl: packet.ttl - 1 });

    // MAC table update (switch)
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
      // VLAN: host принимает только если vlanId совпадает с accessVlan его порта
      if (port.isVlanEnabled && port.type === "access") {
        if (packet.vlanId !== port.accessVlan) {
          setTimeout(() => get().removePacket(packetId), 1000);
          return;
        }
        // (Опционально) Untag: host получает пакет без vlanId
        // get().updatePacket(packetId, { vlanId: undefined });
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

      // ARP-логика
      if (packet.type === "ARP" && packet.payload) {
        try {
          const arpPayload = JSON.parse(packet.payload);
          if (
            arpPayload.type === "ARP-REQUEST" &&
            device.ip_address === arpPayload.targetIp
          ) {
            setTimeout(() => {
              get().removePacket(packetId);
              const allDevices = get().devices;
              const senderDevice = Object.values(allDevices).find(
                (d) => d.mac_address === packet.sourceMAC
              );
              if (!senderDevice) return;
              const replyPath = buildArpReplyPath(
                device,
                senderDevice,
                get().connections
              );
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
              };
              get().addPacket(replyPacket);
              setTimeout(() => {
                get().sendPacket(replyPacket.id);
              }, 500);
            }, 3000);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      // Flood-пакет исчезает на любом хосте, кроме отправителя (currentHop > 0)
      if (packet.isFlooded && packet.currentHop > 0) {
        setTimeout(() => get().removePacket(packetId), 4000);
        return;
      }

      // Обычный пакет: если MAC совпадает — доставляем
      if (packet.destMAC === device.mac_address) {
        get().updatePacket(packetId, {
          currentHop: packet.currentHop + 1,
        });
        setTimeout(() => get().removePacket(packetId), 4000);
        return;
      }

      // Если есть следующий hop — передаём дальше!
      if (packet.currentHop < packet.path.length - 1) {
        const nextHop = packet.path[packet.currentHop + 1];
        if (nextHop) {
          get().updatePacket(packetId, {
            currentHop: packet.currentHop + 1,
            x: state.devices[nextHop.deviceId]?.x ?? packet.x,
            y: state.devices[nextHop.deviceId]?.y ?? packet.y,
          });
          await delay(1500);
          await get().processPacket(packetId, nextHop.deviceId, nextHop.portId);
          return;
        }
      }
      get().removePacket(packetId);
      return;
    }

    // === SWITCH ===
    if (device.type === "switch") {
      // VLAN tagging: если пакет пришёл на access-порт с включённым VLAN и без vlanId — присваиваем VLAN
      let effectiveVlanId = packet.vlanId;
      if (
        port.type === "access" &&
        port.isVlanEnabled &&
        packet.vlanId == null
      ) {
        effectiveVlanId = port.accessVlan;
        get().updatePacket(packetId, { vlanId: effectiveVlanId });
      }

      // --- Защита от forwarding loop ---
      // visited: Set<string> (deviceId:portId)
      let visited =
        packet.visited instanceof Set
          ? packet.visited
          : new Set(packet.visited || []);
      const hopKey = `${device.id}:${port.id}`;
      if (visited.has(hopKey)) {
        // Уже были на этом порту — не форвардим дальше!
        get().removePacket(packetId);
        return;
      }
      visited.add(hopKey);

      // VLAN-aware forwarding
      let forwarded = false;
      for (const outPort of device.ports) {
        if (outPort.id === port.id || !outPort.connectedTo) continue;
        // Access port: только если vlanId совпадает с accessVlan
        if (outPort.type === "access" && outPort.isVlanEnabled) {
          if (effectiveVlanId !== outPort.accessVlan) continue;
        }
        // Trunk port: только если vlanId разрешён
        if (
          outPort.type === "trunk" &&
          outPort.isVlanEnabled &&
          effectiveVlanId !== undefined
        ) {
          if (!outPort.allowedVlanList?.includes(effectiveVlanId)) continue;
        }
        // --- Защита: не форвардить если уже были на этом порту ---
        const outHopKey = `${device.id}:${outPort.id}`;
        if (visited.has(outHopKey)) continue;

        // Формируем новый пакет для передачи на следующий hop
        const nextDeviceId = outPort.connectedTo.deviceId;
        const nextPortId = outPort.connectedTo.portId;
        const nextDevice = state.devices[nextDeviceId];
        if (!nextDevice) continue;
        const newPath = [
          {
            deviceId: device.id,
            portId: outPort.id,
            process: (p: NetworkPacket, devId: string) => {},
          },
          {
            deviceId: nextDeviceId,
            portId: nextPortId,
            process: (p: NetworkPacket, devId: string) => {},
          },
        ];
        const forwardedPacket: NetworkPacket = {
          ...packet,
          id: `${packet.id}-fwd-${nextDeviceId}-${Date.now()}`,
          path: newPath,
          currentHop: 0,
          x: device.x ?? 0,
          y: device.y ?? 0,
          vlanId: effectiveVlanId,
          visited: new Set(visited), // передаём копию visited!
        };
        get().addPacket(forwardedPacket);
        forwarded = true;
        await delay(1500);
        await get().processPacket(forwardedPacket.id, nextDeviceId, nextPortId);
      }
      // Если некуда форвардить — удаляем пакет
      if (!forwarded) {
        setTimeout(() => get().removePacket(packetId), 1000);
      }
      // Удаляем исходный пакет
      setTimeout(() => get().removePacket(packetId), 1000);
      return;
    }

    // Flooding (универсальный, если не сработал forwarding)
    get().removePacket(packetId);
  },

  tickSimulation: () => {
    const state = get();
    if (!state.isSimulationRunning) return;
    const packets = Object.values(state.packets);
    const packet = packets.find((p) => p.currentHop < p.path.length);
    if (!packet) {
      set({ isSimulationRunning: false });
      return;
    }
    const currentHop = packet.path[packet.currentHop];
    if (currentHop) {
      get()
        .processPacket(packet.id, currentHop.deviceId, currentHop.portId)
        .then(() => {
          simulationTimeout = setTimeout(() => {
            get().tickSimulation();
          }, 1500);
        });
    } else {
      get().removePacket(packet.id);
      simulationTimeout = setTimeout(() => {
        get().tickSimulation();
      }, 500);
    }
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
    set({ isSimulationRunning: true });
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
}));
