import { PersistStorage, StorageValue } from "zustand/middleware";
import { ProjectState, NetworkState, NetworkSnapshot } from "./network-store";

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
  saveNetworkState: async (state: NetworkSnapshot): Promise<string> => {
    try {
      const data = JSON.stringify(state, null, 2);
      const result = await window.electronAPI?.storage?.saveToFile(data);
      if (!result) throw new Error("Не удалось сохранить файл");
      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("File save error:", err);
      throw new Error(`Ошибка сохранения: ${err.message}`);
    }
  },

  loadNetworkState: async (): Promise<NetworkSnapshot | null> => {
    try {
      const data = await window.electronAPI?.storage?.loadFromFile();
      if (!data) return null;

      if (data.startsWith("<!DOCTYPE html>")) {
        throw new Error("Сервер вернул HTML вместо данных");
      }

      const parsed = JSON.parse(data);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Некорректный формат файла");
      }

      if (!("devices" in parsed) || !("connections" in parsed)) {
        throw new Error("Файл не содержит данных топологии");
      }

      return parsed as NetworkSnapshot;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("File load error:", err);
      throw new Error(`Ошибка загрузки: ${err.message}`);
    }
  },
};
