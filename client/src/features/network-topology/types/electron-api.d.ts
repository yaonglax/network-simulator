import { DeviceType, PortType } from "../types";

interface DeviceCalculationResponse {
  status: "success" | "error";
  data?: {
    name: string;
    ip: string;
    mac: string;
    gateway: string;
    ports: Array<{
      type: PortType;
      ip_address?: string;
      vlan?: number;
      subnet_mask?: string;
    }>;
  };
  message?: string;
}

interface ElectronBackendAPI {
  calculateDevice: (data: {
    type: DeviceType;
    network: string;
    portsCount?: number;
    ports?: Array<{
      type: PortType;
      ip_address?: string;
      vlan?: number;
      subnet_mask?: string;
    }>;
  }) => Promise<DeviceCalculationResponse>;

  checkConnection: () => Promise<boolean>;
}

interface ElectronStorageAPI {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  saveToFile: (data: string, filename?: string) => Promise<string>;
  loadFromFile: () => Promise<string | null>;
}

interface ElectronFocusAPI {
  forceFocus: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      storage: ElectronStorageAPI;
      focus: ElectronFocusAPI;
      backend: ElectronBackendAPI;
    };
  }
}
