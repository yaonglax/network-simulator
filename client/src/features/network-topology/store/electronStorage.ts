import { PersistStorage, StorageValue } from "zustand/middleware";
import {
  ProjectState,
  NetworkState,
  NetworkSnapshot,
  NetworkProject,
  NetworkFileData,
  NetworkTopology,
} from "./network-store";
import { Device, Port, DeviceType, PortType } from "../types";
import { Connection } from "../types";

declare global {
  interface Window {
    electronAPI: {
      storage: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
        remove: (key: string) => Promise<void>;
        saveToFile: (data: string, filename?: string) => Promise<string>;
        loadFromFile: () => Promise<string | null>;
      };
      focus: {
        forceFocus: () => void;
      };
      backend: {
        calculateDevice: (data: {
          type: DeviceType;
          network: string;
          portsCount: number;
          ports: Array<{
            type: PortType;
            ip_address?: string;
            vlan?: number;
            subnet_mask?: string;
          }>;
        }) => Promise<{
          name?: string;
          ip?: string;
          mac?: string;
          gateway?: string;
          ports?: Array<{
            type?: PortType;
            ip?: string;
            vlan?: number;
            subnet_mask?: string;
          }>;
        }>;
        checkConnection: () => Promise<boolean>;
      };
    };
  }
}

export const electronStorage: PersistStorage<ProjectState> = {
  getItem: async (name: string): Promise<StorageValue<ProjectState> | null> => {
    if (!window.electronAPI) {
      console.warn("Electron API not available - running in browser?");
      const item = localStorage.getItem(name);
      return item ? JSON.parse(item) : null;
    }

    try {
      const value = await window.electronAPI.storage.get(name);
      return value ? JSON.parse(value) : null;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to load state:", err);
      return null;
    }
  },

  setItem: async (
    name: string,
    value: StorageValue<ProjectState>
  ): Promise<void> => {
    if (!window.electronAPI) {
      localStorage.setItem(name, JSON.stringify(value));
      return;
    }

    try {
      await window.electronAPI.storage.set(name, JSON.stringify(value));
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to save state:", err);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (!window.electronAPI) {
      localStorage.removeItem(name);
      return;
    }

    try {
      await window.electronAPI.storage.remove(name);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to remove state:", err);
    }
  },
};

export const fileStorage = {
  saveNetworkState: async (data: NetworkFileData): Promise<string> => {
    try {
      // Нормализуем данные перед сохранением
      let normalized: NetworkTopology;

      if ("addDevice" in data) {
        // Это NetworkState - извлекаем нужные данные
        normalized = {
          devices: data.devices,
          connections: data.connections,
        };
      } else if ("id" in data) {
        // Это NetworkProject - преобразуем devices в Record
        normalized = {
          devices: data.devices.reduce((acc, device) => {
            acc[device.id] = device;
            return acc;
          }, {} as Record<string, Device>),
          connections: data.connections,
        };
      } else {
        // Это уже NetworkTopology
        normalized = data;
      }

      const fileData = JSON.stringify(normalized, null, 2);
      const result = await window.electronAPI?.storage?.saveToFile(fileData);
      if (!result) throw new Error("Не удалось сохранить файл");
      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("File save error:", err);
      throw new Error(`Ошибка сохранения: ${err.message}`);
    }
  },

  loadNetworkState: async (): Promise<NetworkSnapshot> => {
    try {
      const data = await window.electronAPI?.storage?.loadFromFile();
      if (!data) throw new Error("Файл не выбран или пуст");

      const parsed = JSON.parse(data);
      console.log("Parsed file content:", parsed);

      // 1. Нормализация устройств с явным указанием типа
      const devices: Record<string, Device> = Array.isArray(parsed.devices)
        ? parsed.devices.reduce(
            (acc: Record<string, Device>, device: Device) => {
              acc[device.id] = device;
              return acc;
            },
            {}
          )
        : (parsed.devices as Record<string, Device>) || {};

      // 2. Восстановление соединений из connectedTo с явными типами
      const connectionsFromPorts: Connection[] = [];

      (Object.values(devices) as Device[]).forEach((device: Device) => {
        device.ports.forEach((port: Port) => {
          if (port.connectedTo) {
            const connectionId = `${device.id}-${port.id}-${port.connectedTo.deviceId}-${port.connectedTo.portId}`;

            connectionsFromPorts.push({
              id: connectionId,
              from: {
                deviceId: device.id,
                portId: port.id,
              },
              to: {
                deviceId: port.connectedTo.deviceId,
                portId: port.connectedTo.portId,
              },
            });
          }
        });
      });

      // 3. Объединение с существующими соединениями
      const existingConnections: Connection[] = Array.isArray(
        parsed.connections
      )
        ? (parsed.connections as Connection[])
        : [];

      const allConnections = [
        ...existingConnections,
        ...connectionsFromPorts.filter(
          (c: Connection) =>
            !existingConnections.some(
              (ec: Connection) =>
                (ec.from.deviceId === c.from.deviceId &&
                  ec.from.portId === c.from.portId &&
                  ec.to.deviceId === c.to.deviceId &&
                  ec.to.portId === c.to.portId) ||
                (ec.from.deviceId === c.to.deviceId &&
                  ec.from.portId === c.to.portId &&
                  ec.to.deviceId === c.from.deviceId &&
                  ec.to.portId === c.from.portId)
            )
        ),
      ];

      return {
        devices,
        connections: allConnections,
      };
    } catch (error: unknown) {
      console.error("File load error:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Ошибка загрузки: ${err.message}`);
    }
  },
};
