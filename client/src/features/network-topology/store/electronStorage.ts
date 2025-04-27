// electronStorage.ts
import { PersistStorage, StorageValue } from "zustand/middleware";
import { ProjectState } from "./network-store";

declare global {
  interface Window {
    electronAPI: {
      storage: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
        remove: (key: string) => Promise<void>;
      };
    };
  }
}

export const electronStorage: PersistStorage<ProjectState> = {
  getItem: async (name: string): Promise<StorageValue<ProjectState> | null> => {
    try {
      const value = await window.electronAPI.storage.get(name);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Failed to load state:", error);
      return null;
    }
  },

  setItem: async (
    name: string,
    value: StorageValue<ProjectState>
  ): Promise<void> => {
    try {
      await window.electronAPI.storage.set(name, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await window.electronAPI.storage.remove(name);
    } catch (error) {
      console.error("Failed to remove state:", error);
    }
  },
};
