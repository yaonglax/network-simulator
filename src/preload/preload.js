// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  backend: {
    calculateDevice: (data) => ipcRenderer.invoke("calculate-device", data),
    checkConnection: async () => true,
  },
  storage: {
    get: (key) => ipcRenderer.invoke("storage:get", key),
    set: (key, value) => ipcRenderer.invoke("storage:set", key, value),
    remove: (key) => ipcRenderer.invoke("storage:remove", key),
    saveToFile: (data) => ipcRenderer.invoke("storage:saveToFile", data),
    loadFromFile: async () => {
      const data = await ipcRenderer.invoke("storage:loadFromFile");
      setTimeout(() => {
        ipcRenderer.send("force-focus");
        setTimeout(() => ipcRenderer.send("force-focus"), 100);
      }, 150);
      return data;
    },
  },
  focus: {
    forceFocus: () => {
      ipcRenderer.send("force-focus");
      setTimeout(() => ipcRenderer.send("force-focus"), 200);
    },
  },
});
