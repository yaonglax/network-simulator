const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  storage: {
    get: (key) => ipcRenderer.invoke("storage:get", key),
    set: (key, value) => ipcRenderer.invoke("storage:set", key, value),
    remove: (key) => ipcRenderer.invoke("storage:remove", key),
    saveToFile: (data) => ipcRenderer.invoke("storage:saveToFile", data),
    loadFromFile: () => ipcRenderer.invoke("storage:loadFromFile"),
  },
});
