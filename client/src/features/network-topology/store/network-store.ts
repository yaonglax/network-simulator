import { create } from "zustand";
import { Device, Port, Connection, Router, Switch, Host } from "../types";
import { electronStorage } from "./electronStorage";
import { persist, StateStorage } from "zustand/middleware";

function createConnection(from: Port, to: Port): Connection {
  if (!from.deviceId || !to.deviceId) {
    throw new Error("Ports must belong to a device (deviceId missing)");
  }

  return {
    id: `${from.id}-${to.id}`,
    from: {
      deviceId: from.deviceId,
      portId: from.id,
    },
    to: {
      deviceId: to.deviceId,
      portId: to.id,
    },
  };
}

export interface NetworkProject {
  id: string;
  name: string;
  devices: Device[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectState {
  projects: NetworkProject[];
  currentProject: NetworkProject | null;
  addProject: (project: NetworkProject) => void;
}

export interface NetworkSnapshot {
  devices: Record<string, Device>;
  connections: Connection[];
}

export interface NetworkState extends NetworkSnapshot {
  addDevice: (device: Device) => void;
  updateDevice: <T extends Device>(id: string, updates: Partial<T>) => void;
  connectPorts: (from: Port, to: Port) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  // devices: {
  //   router1: {
  //     id: "router1",
  //     type: "router",
  //     name: "Main Router",
  //     ports: [
  //       {
  //         id: "eth0",
  //         name: "Ethernet",
  //         deviceId: "router1",
  //         type: "access",
  //         vlan_id: 1,
  //       },
  //       {
  //         id: "eth1",
  //         name: "Ethernet",
  //         deviceId: "router1",
  //         type: "trunk",
  //         allowed_vlans: [1, 2],
  //       },
  //     ],
  //     routing_table: [{ destination: "192.168.1.0/24", interface: "eth0" }],
  //     x: 100,
  //     y: 100,
  //   },
  //   switch1: {
  //     id: "switch1",
  //     type: "switch",
  //     name: "Core Switch",
  //     ports: [
  //       {
  //         id: "eth0",
  //         name: "Ethernet",
  //         deviceId: "switch1",
  //         type: "trunk",
  //       },
  //       {
  //         id: "eth1",
  //         name: "Ethernet",
  //         deviceId: "switch1",
  //         type: "access",
  //       },
  //     ],
  //     mac_table: {},
  //     x: 300,
  //     y: 100,
  //   },
  //   pc1: {
  //     id: "pc1",
  //     type: "host",
  //     name: "Workstation",
  //     ip_address: "192.168.1.10",
  //     mac_address: "00:AA:BB:CC:DD:EE",
  //     ports: [
  //       {
  //         id: "eth0",
  //         name: "Ethernet",
  //         deviceId: "pc1",
  //         type: "access",
  //         vlan_id: 1,
  //       },
  //     ],
  //     gateway: "0/0/0/0",
  //     x: 200,
  //     y: 300,
  //   },
  // },
  // connections: [
  //   {
  //     id: "router1-eth0__switch1-eth0",
  //     from: { deviceId: "router1", portId: "eth0" },
  //     to: { deviceId: "switch1", portId: "eth0" },
  //   },
  // ],
  devices: {},
  connections: [],
  addDevice: (device) =>
    set((state) => ({
      devices: { ...state.devices, [device.id]: device },
    })),
  updateDevice: (id, updates) =>
    set((state) => ({
      devices: {
        ...state.devices,
        [id]: { ...state.devices[id], ...updates },
      },
    })),

  connectPorts: (from, to) =>
    set((state) => {
      const newConnection = createConnection(from, to);
      return {
        connections: [...state.connections, newConnection],
      };
    }),
}));

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      currentProject: null,
      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
        })),
    }),
    {
      name: "projects",
      storage: electronStorage,
    }
  )
);
