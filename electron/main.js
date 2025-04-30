const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const { setupSocket } = require("./socket");
const socket = setupSocket();
const { spawn } = require("child_process");
const pythonProcess = spawn("python", ["py-backend/ws_server.py"]);
const Store = require("electron-store").default;
const fs = require("fs");
const { dialog } = require("electron");

pythonProcess.stdout.on("data", (data) => {
  console.log(`Python: ${data}`);
});

let mainWindow;
const store = new Store();

ipcMain.handle("storage:get", (event, key) => {
  try {
    return store.get(key);
  } catch (error) {
    console.error("Error reading from store:", error);
    return null;
  }
});

ipcMain.handle("storage:set", (event, key, value) => {
  try {
    store.set(key, value);
    return true;
  } catch (error) {
    console.error("Error writing to store:", error);
    return false;
  }
});

ipcMain.handle("storage:remove", (event, key) => {
  try {
    store.delete(key);
    return true;
  } catch (error) {
    console.error("Error removing from store:", error);
    return false;
  }
});

ipcMain.handle("storage:saveToFile", async (event, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: "Save Network Topology",
      defaultPath: path.join(
        app.getPath("documents"),
        `network_topology_${Date.now()}.json`
      ),
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, data);
      return filePath;
    }
    return null;
  } catch (error) {
    console.error("Error saving file:", error);
    throw error;
  }
});

ipcMain.handle("storage:loadFromFile", async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: "Load Network Topology",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"],
    });

    if (filePaths?.length > 0) {
      return fs.readFileSync(filePaths[0], "utf-8");
    }
    return null;
  } catch (error) {
    console.error("Error loading file:", error);
    throw error;
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}
Menu.setApplicationMenu(false);
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
