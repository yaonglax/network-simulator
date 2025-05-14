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
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (deviceId: string) => void;
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
  const visited = new Set<string>();
  const queue: Hop[] = [];

  const fromDevice = devices[fromDeviceId];
  if (!fromDevice) return null;
  for (const port of fromDevice.ports) {
    queue.push({ deviceId: fromDeviceId, portId: port.id });
    visited.add(`${fromDeviceId}:${port.id}`);
  }

  let found: Hop | null = null;
  while (queue.length > 0) {
    const hop = queue.shift()!;
    if (hop.deviceId === toDeviceId) {
      found = hop;
      break;
    }
    for (const conn of connections) {
      let nextDeviceId: string | null = null;
      let nextPortId: string | null = null;
      if (
        conn.from.deviceId === hop.deviceId &&
        conn.from.portId === hop.portId
      ) {
        nextDeviceId = conn.to.deviceId;
        nextPortId = conn.to.portId;
      } else if (
        conn.to.deviceId === hop.deviceId &&
        conn.to.portId === hop.portId
      ) {
        nextDeviceId = conn.from.deviceId;
        nextPortId = conn.from.portId;
      }
      if (
        nextDeviceId &&
        nextPortId &&
        !visited.has(`${nextDeviceId}:${nextPortId}`)
      ) {
        visited.add(`${nextDeviceId}:${nextPortId}`);
        queue.push({
          deviceId: nextDeviceId,
          portId: nextPortId,
          prev: hop,
        });
      }
    }
  }
  if (!found) return null;
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

/**
 * Универсальный path для ARP-ответа между двумя хостами
 */
function buildArpReplyPath(
  fromDevice: Device,
  toDevice: Device,
  devices: Record<string, Device>,
  connections: Connection[]
): Array<{ deviceId: string; portId: string; process: any }> {
  const path = buildPathBFS(fromDevice.id, toDevice.id, devices, connections);
  if (!path) {
    return [
      {
        deviceId: fromDevice.id,
        portId: fromDevice.ports[0]?.id || "eth0",
        process: () => {},
      },
    ];
  }
  return path;
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
      } else if (prev.type === "router") {
        updated = {
          ...prev,
          ...safeUpdates,
          type: "router",
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
      // Удаляем устройство
      const newDevices = { ...state.devices };
      delete newDevices[deviceId];

      // Удаляем все соединения, связанные с этим устройством
      const newConnections = state.connections
        ? state.connections.filter(
            (conn) =>
              conn.from.deviceId !== deviceId && conn.to.deviceId !== deviceId
          )
        : [];

      // Создаём новый объект устройств с очищенными портами
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
      // VLAN: если порт access и включён VLAN, сразу ставим vlanId
      let effectiveVlanId = packet.vlanId;
      if (
        sourcePort.isVlanEnabled &&
        sourcePort.type === "access" &&
        !packet.vlanId
      ) {
        effectiveVlanId = sourcePort.accessVlan;
      }
      // path: [sourceDevice, nextDevice]
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
        vlanId: effectiveVlanId,
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
                get().devices,
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
                visited: new Set<string>(),
              };
              get().addPacket(replyPacket);
              setTimeout(() => {
                get().sendPacket(replyPacket.id);
              }, 500);
            }, 3000);
            return;
          }
        } catch (e) {}
      }
      if (packet.type === "PING" && packet.payload) {
        try {
          const pingPayload = JSON.parse(packet.payload);
          if (
            pingPayload.type === "PING-REQUEST" &&
            device.mac_address === packet.destMAC
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
                payload: JSON.stringify({ type: "PING-REPLY" }),
                path: replyPath,
                currentHop: 0,
                x: device.x ?? 0,
                y: device.y ?? 0,
                isFlooded: false,
                isResponse: true,
                ttl: 64,
                type: "PING",
                visited: new Set<string>(),
                sentAt: packet.sentAt,
              };
              get().addPacket(replyPacket);
              setTimeout(() => {
                get().sendPacket(replyPacket.id);
              }, 500);
            }, 1000);
            return;
          }
          if (
            pingPayload.type === "PING-REPLY" &&
            device.mac_address === packet.destMAC
          ) {
            const rtt = packet.sentAt ? Date.now() - packet.sentAt : undefined;
            console.log("RTT:", rtt);
            setTimeout(() => get().removePacket(packetId), 2000);
            return;
          }
        } catch (e) {}
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
        const nextDevice = state.devices[nextHop.deviceId];
        const nextPort = nextDevice?.ports.find((p) => p.id === nextHop.portId);
        // VLAN check на выходном порту (host → switch)
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
        get().updatePacket(packetId, {
          currentHop: packet.currentHop + 1,
          x: nextDevice?.x ?? packet.x,
          y: nextDevice?.y ?? packet.y,
        });
        await delay(1500);
        await get().processPacket(packetId, nextHop.deviceId, nextHop.portId);
        return;
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
        console.log(
          `[SWITCH] ${deviceId} тегирует пакет ${packet.id} VLAN=${effectiveVlanId} на входе с access-порта ${portId}`
        );
      }
      let visited =
        packet.visited instanceof Set
          ? packet.visited
          : new Set(packet.visited || []);
      const hopKey = `${device.id}:${port.id}`;
      if (visited.has(hopKey)) {
        console.log(
          `[SWITCH] ${deviceId} дропает пакет ${packet.id}: forwarding loop (уже был на этом порту)`
        );
        get().removePacket(packetId);
        return;
      }
      visited.add(hopKey);
      get().updatePacket(packetId, { visited });

      // Если есть следующий hop в path — проверяем VLAN и передаём дальше
      if (packet.currentHop < packet.path.length - 1) {
        const nextHop = packet.path[packet.currentHop + 1];
        const nextDevice = state.devices[nextHop.deviceId];
        const nextPort = nextDevice?.ports.find((p) => p.id === nextHop.portId);
        if (nextPort?.isVlanEnabled) {
          if (
            nextPort.type === "access" &&
            effectiveVlanId !== nextPort.accessVlan
          ) {
            setTimeout(() => get().removePacket(packetId), 1000);
            return;
          }
          if (
            nextPort.type === "trunk" &&
            !nextPort.allowedVlanList?.includes(effectiveVlanId!)
          ) {
            setTimeout(() => get().removePacket(packetId), 1000);
            return;
          }
        }
        get().updatePacket(packetId, {
          currentHop: packet.currentHop + 1,
          x: nextDevice?.x ?? packet.x,
          y: nextDevice?.y ?? packet.y,
          vlanId: effectiveVlanId,
        });
        await delay(1500);
        await get().processPacket(packetId, nextHop.deviceId, nextHop.portId);
        return;
      }

      // Если нет следующего хопа в path, но есть destMAC — пробуем найти в MAC-таблице
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
              console.log(
                `[SWITCH] ${deviceId} ОТБРОСИЛ пакет ${packet.id}: VLAN mismatch (packet VLAN ${effectiveVlanId}, port VLAN ...)`
              );
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

      // FLOODING: если не нашли MAC в таблице или это broadcast
      if (
        !destPortId ||
        packet.isFlooded ||
        !packet.destMAC ||
        packet.destMAC === "FF:FF:FF:FF:FF:FF"
      ) {
        const portsToFlood = device.ports.filter(
          (p) => p.id !== port.id && p.connectedTo
        );
        await Promise.all(
          portsToFlood.map(async (floodPort) => {
            if (floodPort.isVlanEnabled) {
              if (
                floodPort.type === "access" &&
                effectiveVlanId !== floodPort.accessVlan
              ) {
                return;
              }
              if (
                floodPort.type === "trunk" &&
                !floodPort.allowedVlanList?.includes(effectiveVlanId!)
              ) {
                return;
              }
            }
            const nextDeviceId = floodPort.connectedTo!.deviceId;
            const nextPortId = floodPort.connectedTo!.portId;
            const nextDevice = state.devices[nextDeviceId];
            const visitKey = `${nextDeviceId}:${nextPortId}`;
            if (visited.has(visitKey)) return;
            console.log(
              `[SWITCH] ${deviceId} FLOOD пакет ${packet.id} по порту ${floodPort.id} → ${nextDeviceId}:${nextPortId}`
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
                visited: new Set(visited), // просто копия!
                type: packet.type,
              };
              get().addPacket(floodPacket);
              await delay(1500);
              get().updatePacket(floodPacket.id, {
                currentHop: 1,
                x: nextDevice.x ?? floodPacket.x,
                y: nextDevice.y ?? floodPacket.y,
              });
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

    // Если тип устройства не определён — удаляем пакет
    get().removePacket(packetId);
  },

  tickSimulation: async () => {
    const state = get();
    if (!state.isSimulationRunning) return;

    // Найти все пакеты, которые ещё не дошли до конца path
    const packets = Object.values(state.packets).filter(
      (p) => p.currentHop < p.path.length
    );

    if (packets.length === 0) {
      set({ isSimulationRunning: false });
      return;
    }

    // Для каждого пакета запустить processPacket параллельно
    await Promise.all(
      packets.map(async (packet) => {
        const currentHop = packet.path[packet.currentHop];
        if (currentHop) {
          await get().processPacket(
            packet.id,
            currentHop.deviceId,
            currentHop.portId
          );
        }
      })
    );

    // Следующий тик через 1500 мс
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
