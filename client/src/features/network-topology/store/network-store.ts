import { create } from "zustand";
import {
  Device,
  Port,
  Connection,
  NetworkPacket,
  MacTableEntry,
} from "../types";

const MAC_TABLE_ENTRY_TTL = 300_000; // 5 minutes
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
  sendPing: (fromDeviceId: string, targetIp: string) => Promise<void>;
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

  // Initialize queue with ports of the starting device
  for (const port of fromDevice.ports) {
    if (port.connectedTo) {
      queue.push({ deviceId: fromDeviceId, portId: port.id });
      visited.add(`${fromDeviceId}:${port.id}`);
    }
  }

  let found: Hop | null = null;
  while (queue.length > 0) {
    const hop = queue.shift()!;
    console.log(`[DEBUG] buildPathBFS: Visiting ${hop.deviceId}:${hop.portId}`);

    if (hop.deviceId === toDeviceId) {
      found = hop;
      break;
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
        console.log(
          `[DEBUG] buildPathBFS: Adding to queue ${nextDeviceId}:${nextPortId} (from ${hop.deviceId}:${hop.portId})`
        );
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
    console.log(
      `[DEBUG] buildPathBFS: No path found from ${fromDeviceId} to ${toDeviceId}, visited:`,
      Array.from(visited),
      "Connections:",
      connections
    );
    return null;
  }

  // Build the path
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
  console.log(`[DEBUG] buildPathBFS: Found path:`, path);
  return path;
}

/**
 * Universal path for ARP reply between two hosts
 */
function buildArpReplyPath(
  fromDevice: Device,
  toDevice: Device,
  devices: Record<string, Device>,
  connections: Connection[]
): Array<{ deviceId: string; portId: string; process: any }> {
  let path = buildPathBFS(fromDevice.id, toDevice.id, devices, connections);
  console.log(
    `[DEBUG] ARP Reply Path from ${fromDevice.id} to ${toDevice.id}:`,
    path,
    "Connections:",
    connections
  );

  if (!path || path.length < 2) {
    const pathMap: Map<
      string,
      { deviceId: string; portId: string; prev?: string }
    > = new Map();
    const queue: string[] = [fromDevice.id];
    const visited = new Set<string>([fromDevice.id]);
    let foundTarget = false;

    while (queue.length > 0 && !foundTarget) {
      const currentDeviceId = queue.shift()!;
      const currentDevice = devices[currentDeviceId];

      for (const port of currentDevice.ports) {
        if (port.connectedTo) {
          const nextDeviceId = port.connectedTo.deviceId;
          const nextPortId = port.connectedTo.portId;
          const key = `${nextDeviceId}:${nextPortId}`;

          if (!visited.has(nextDeviceId)) {
            console.log(
              `[DEBUG] buildArpReplyPath: Adding ${nextDeviceId}:${nextPortId} from ${currentDeviceId}:${port.id}`
            );
            visited.add(nextDeviceId);
            pathMap.set(key, {
              deviceId: nextDeviceId,
              portId: nextPortId,
              prev: `${currentDeviceId}:${port.id}`,
            });
            queue.push(nextDeviceId);

            if (nextDeviceId === toDevice.id) {
              foundTarget = true;
              break;
            }
          }
        }
      }
    }

    path = [];
    let currentKey = foundTarget
      ? `${toDevice.id}:${toDevice.ports[0]?.id || "eth0"}`
      : null;
    while (currentKey) {
      const step = pathMap.get(currentKey);
      if (step) {
        path.unshift({
          deviceId: step.deviceId,
          portId: step.portId,
          process: () => {},
        });
        currentKey = step.prev;
      } else {
        break;
      }
    }

    if (path.length > 0) {
      const fromPort = fromDevice.ports.find(
        (p) => p.connectedTo?.deviceId === path[0].deviceId
      );
      if (fromPort) {
        path.unshift({
          deviceId: fromDevice.id,
          portId: fromPort.id,
          process: () => {},
        });
      }
    } else {
      console.log(
        `[DEBUG] buildArpReplyPath: No valid path found, using default`
      );
      path = [
        {
          deviceId: fromDevice.id,
          portId: fromDevice.ports[0]?.id || "eth0",
          process: () => {},
        },
        {
          deviceId: toDevice.id,
          portId: toDevice.ports[0]?.id || "eth0",
          process: () => {},
        },
      ];
    }
  }

  // Ensure path includes all steps
  console.log(`[DEBUG] buildArpReplyPath: Final path:`, path);
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
      // Remove device
      const newDevices = { ...state.devices };
      delete newDevices[deviceId];

      // Remove all connections related to this device
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

  connectPorts: (from: Port, to: Port) =>
    set((state) => {
      const fromDevice = state.devices[from.deviceId];
      const toDevice = state.devices[to.deviceId];
      if (!fromDevice || !toDevice) {
        console.warn(`Device ${from.deviceId} or ${to.deviceId} not found`);
        return state;
      }

      // Check VLAN compatibility
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
      // VLAN: if port is access and VLAN is enabled, set vlanId
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
        isProcessed: false,
        isPlaying: false,
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

    // Check if packet was already processed
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
      // VLAN: host accepts only if vlanId matches accessVlan of its port
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
              isPlaying: false,
            };
            get().addPacket(replyPacket);
            get().removePacket(packetId);
            // Dynamic delay based on the number of hops in the flooding path
            const totalHops = Math.max(
              1,
              Object.values(get().devices).length - 1 // Estimate based on device count
            );
            const arpDelay = totalHops * 1500 + 1000; // 1500 ms per hop + 1000 ms buffer
            console.log(
              `[DEBUG] ARP reply delay set to ${arpDelay} ms for ${totalHops} hops`
            );
            setTimeout(async () => {
              get().updatePacket(replyPacket.id, { isPlaying: true });
              await get().sendPacket(replyPacket.id);
            }, arpDelay);
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
              sentAt: Date.now(), // Update sentAt for accurate RTT
              isProcessed: false,
              isPlaying: false,
            };
            get().addPacket(replyPacket);
            get().removePacket(packetId);
            // Dynamic delay based on the number of hops in the path
            const totalHops = replyPath.length - 1; // Number of hops in reply path
            const pingDelay = totalHops * 1500 + 1000; // 1500 ms per hop + 1000 ms buffer
            console.log(
              `[DEBUG] PING reply delay set to ${pingDelay} ms for ${totalHops} hops`
            );
            setTimeout(async () => {
              get().updatePacket(replyPacket.id, { isPlaying: true });
              await get().sendPacket(replyPacket.id);
            }, pingDelay);
            return;
          }
          // Recipient of ping reply
          if (
            pingPayload.type === "PING-REPLY" &&
            device.mac_address === packet.destMAC
          ) {
            const rtt = packet.sentAt ? Date.now() - packet.sentAt : undefined;
            console.log(
              `[PING] Host ${device.name} (${device.mac_address}) received reply, RTT = ${rtt} ms, packet:`,
              packet
            );
            // Dynamic removal delay based on path length
            const totalHops = packet.path.length - 1;
            const removalDelay = totalHops * 1500 + 2000; // Display for longer in larger topologies
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

      // Normal packet: deliver if MAC matches
      if (packet.destMAC === device.mac_address) {
        get().updatePacket(packetId, {
          currentHop: packet.currentHop + 1,
        });
        console.log(
          `[DELIVERY] Packet ${packet.id} successfully delivered to ${device.id}`
        );
        setTimeout(() => get().removePacket(packetId), 5000); // 5s display
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
      const hopKey = `${device.id}:${port.id}`;
      const directionalHopKey = `${hopKey}:${
        packet.isResponse ? "response" : "request"
      }:${packet.currentHop % 2 === 0 ? "in" : "out"}`;

      if (visited.has(directionalHopKey)) {
        console.log(
          `[SWITCH] ${deviceId} drops packet ${packet.id}: forwarding loop detected, visited:`,
          Array.from(visited),
          "directionalHopKey:",
          directionalHopKey
        );
        get().removePacket(packetId);
        return;
      }
      visited.add(directionalHopKey);
      get().updatePacket(packetId, { visited });

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
        const portsToFlood = device.ports.filter(
          (p) => p.id !== port.id && p.connectedTo
        );
        // Wait for the animation of the incoming packet to complete
        await delay(1500); // Matches the animation duration in PacketEntity
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
    let destMAC = targetDevice.mac_address;
    const vlanId = fromDevice.ports[0]?.isVlanEnabled
      ? fromDevice.ports[0].accessVlan
      : undefined;

    // If MAC is not known, initiate ARP request
    if (!destMAC) {
      console.log(
        `[PING] MAC address of ${targetIp} unknown, sending ARP request from ${fromDeviceId}`
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
      await delay(500);
      await get().sendPacket(arpPacket.id);

      // Wait for ARP reply (simplified for now, ideally use a callback or event)
      await delay(5000); // Wait for ARP to resolve (adjust based on topology)
      const updatedTargetDevice = findDeviceByIp(targetIp, get().devices);
      destMAC = updatedTargetDevice?.mac_address;
      if (!destMAC) {
        console.warn(`[PING] Failed to resolve MAC address for ${targetIp}`);
        return;
      }
    }

    // Send PING-REQUEST
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
      isPlaying: false,
    };
    get().addPacket(pingPacket);
    // Не запускаем анимацию сразу, ждём startSimulation
  },

  tickSimulation: async () => {
    const state = get();
    if (!state.isSimulationRunning) return;

    // Find all packets that haven’t reached the end of their path
    const packets = Object.values(state.packets).filter(
      (p) => p.currentHop < p.path.length
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

// Helper function for VLAN compatibility
function getPortVlan(port: Port): number | undefined {
  if (port.isVlanEnabled) {
    if (port.type === "access" && port.accessVlan !== undefined) {
      return port.accessVlan;
    }
    if (port.type === "trunk" && port.allowedVlanList) {
      return port.allowedVlanList[0]; // Take first VLAN as an example, can be improved
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
  // If neither port uses VLAN, compatibility is guaranteed
  if (!from.isVlanEnabled && !to.isVlanEnabled) return true;

  const fromVlan = getPortVlan(from);
  const toVlan = getPortVlan(to);

  // If both ports are access, VLANs must match
  if (from.type === "access" && to.type === "access") {
    return fromVlan === toVlan;
  }

  // If from is access, to is trunk, trunk must allow from's VLAN
  if (from.type === "access" && to.type === "trunk" && fromVlan !== undefined) {
    return to.allowedVlanList?.includes(fromVlan) || false;
  }

  // If to is access, from is trunk, trunk must allow to's VLAN
  if (from.type === "trunk" && to.type === "access" && toVlan !== undefined) {
    return from.allowedVlanList?.includes(toVlan) || false;
  }

  // If both ports are trunk, VLAN lists must intersect
  if (from.type === "trunk" && to.type === "trunk") {
    if (!from.allowedVlanList || !to.allowedVlanList) return false;
    return from.allowedVlanList.some((vlan) =>
      to.allowedVlanList.includes(vlan)
    );
  }

  return true; // Default compatibility if conditions are undefined
}
