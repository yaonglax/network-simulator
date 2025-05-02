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

interface ElectronBackendAPI {
  calculateDevice: (data: { type: DeviceType; network: string }) => Promise<{
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
