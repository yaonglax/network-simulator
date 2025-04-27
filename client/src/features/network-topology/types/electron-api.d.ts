interface ElectronStorageAPI {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: {
      storage: ElectronStorageAPI;
    };
  }
}
