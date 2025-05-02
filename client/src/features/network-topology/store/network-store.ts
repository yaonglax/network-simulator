import { create } from "zustand";
import { Device, Port, Connection, Router, Switch, Host } from "../types";
import { electronStorage } from "./electronStorage";
import { persist, StateStorage } from "zustand/middleware";

export interface ProjectState {
  projects: NetworkProject[];
  currentProject: NetworkProject | null;
  addProject: (project: NetworkProject) => void;
}

export interface NetworkBase {
  devices: Device[] | Record<string, Device>;
  connections: Connection[];
}

export interface NetworkState {
  devices: Record<string, Device>;
  connections: Connection[];
  addDevice: (device: Device) => void;
  updateDevice: <T extends Device>(id: string, updates: Partial<T>) => void;
  connectPorts: (from: Port, to: Port) => void;
}

export interface NetworkSnapshot {
  devices: Record<string, Device>;
  connections: Connection[];
}

export interface NetworkProject {
  id: string;
  name: string;
  devices: Device[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}
// Добавим новый тип для простого сохранения топологии
export interface NetworkTopology {
  devices: Record<string, Device>;
  connections: Connection[];
}

// Обновим тип параметра для fileStorage
export type NetworkFileData = NetworkTopology | NetworkProject | NetworkState;
export const useNetworkStore = create<NetworkState>((set) => ({
  devices: {},
  connections: [], // Добавляем отсутствующее поле connections
  addDevice: (device) =>
    set((state) => ({
      devices: { ...state.devices, [device.id]: device },
      connections: state.connections, // Сохраняем существующие соединения
    })),
  updateDevice: (id, updates) =>
    set((state) => ({
      devices: {
        ...state.devices,
        [id]: { ...state.devices[id], ...updates },
      },
      connections: state.connections, // Сохраняем соединения
    })),
  connectPorts: (from, to) =>
    set((state) => {
      // Создаем глубокие копии устройств и портов
      const fromDevice = { ...state.devices[from.deviceId] };
      const toDevice = { ...state.devices[to.deviceId] };

      if (!fromDevice || !toDevice) {
        console.error("Устройства не найдены");
        return {};
      }

      // Находим индексы портов для обновления
      const fromPortIndex =
        fromDevice.ports?.findIndex((p) => p.id === from.id) ?? -1;
      const toPortIndex =
        toDevice.ports?.findIndex((p) => p.id === to.id) ?? -1;

      if (fromPortIndex === -1 || toPortIndex === -1) {
        console.error("Порты не найдены");
        return {};
      }

      // Создаем обновленные порты
      const updatedFromPort = {
        ...fromDevice.ports[fromPortIndex],
        connectedTo: {
          deviceId: to.deviceId,
          portId: to.id,
          ip_address: to.ip_address,
          subnet_mask: to.subnet_mask,
        },
      };

      const updatedToPort = {
        ...toDevice.ports[toPortIndex],
        connectedTo: {
          deviceId: from.deviceId,
          portId: from.id,
          ip_address: from.ip_address,
          subnet_mask: from.subnet_mask,
        },
      };

      // Создаем новые массивы портов
      const newFromPorts = [...fromDevice.ports];
      newFromPorts[fromPortIndex] = updatedFromPort;

      const newToPorts = [...toDevice.ports];
      newToPorts[toPortIndex] = updatedToPort;

      return {
        devices: {
          ...state.devices,
          [from.deviceId]: {
            ...fromDevice,
            ports: newFromPorts,
          },
          [to.deviceId]: {
            ...toDevice,
            ports: newToPorts,
          },
        },
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
