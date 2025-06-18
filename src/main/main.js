// electron/main.js
const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const Store = require("electron-store").default;
const fs = require("fs");
const { dialog } = require("electron");
const { generateMac, generateIp, getGateway } = require("./network.cjs");

let mainWindow;
const store = new Store();

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    icon: path.join(__dirname, "./public/cat1.png"),
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
      webSecurity: process.env.NODE_ENV !== "development",
      allowRunningInsecureContent: process.env.NODE_ENV === "development",
    },
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../out/renderer/index.html"));
  }
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
});

ipcMain.handle("storage:get", (event, key) => {
  try {
    return store.get(key);
  } catch (error) {
    throw new Error(`Не удалось получить ${key}: ${error.message}`);
  }
});

ipcMain.handle("storage:set", (event, key, value) => {
  try {
    store.set(key, value);
    return true;
  } catch (error) {
    throw new Error(`Не удалось сохранить ${key}: ${error.message}`);
  }
});

ipcMain.handle("storage:remove", (event, key) => {
  try {
    store.delete(key);
    return true;
  } catch (error) {
    throw new Error(`Не удалось удалить ${key}: ${error.message}`);
  }
});

ipcMain.handle("storage:saveToFile", async (event, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: "Сохранить топологию сети",
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
    throw new Error(`Не удалось сохранить файл: ${error.message}`);
  }
});

ipcMain.handle("storage:loadFromFile", async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      title: "Загрузить топологию сети",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (filePaths?.length > 0) {
      return fs.readFileSync(filePaths[0], "utf-8");
    }
    return null;
  } catch (error) {
    throw new Error(`Не удалось загрузить файл: ${error.message}`);
  }
});

ipcMain.on("force-focus", () => {
  if (!mainWindow) return;
  if (process.platform === "win32") {
    mainWindow.blur();
    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.focus();
      mainWindow.webContents.focus();
      mainWindow.webContents.send("focus-inputs");
    }, 100);
  } else {
    mainWindow.focus();
    mainWindow.webContents.focus();
    mainWindow.webContents.send("focus-inputs");
  }
});

ipcMain.handle("calculate-device", async (event, data) => {
  try {
    console.log("Received data for calculate-device:", data); // Debugging
    if (!data.type || !data.network) {
      throw new Error("Отсутствуют обязательные поля: 'type' и/или 'network'");
    }

    const ip_address = generateIp(data.network);
    const mac_address = generateMac();
    let ports = [];

    if (data.type === "switch") {
      for (
        let idx = 0;
        idx < (data.portsCount || data.ports?.length || 1);
        idx++
      ) {
        const port = data.ports?.[idx] || {};
        ports.push({
          name: port.name || `port${idx + 1}`,
          vlan: port.vlan || 1,
        });
      }
    } else {
      if (data.ports && Array.isArray(data.ports)) {
        ports = data.ports.map((port) => ({
          ip_address,
          subnet_mask: port.subnet_mask || "255.255.255.0",
          vlan: port.vlan || 1,
        }));
      } else {
        ports = [
          {
            ip_address,
            subnet_mask: "255.255.255.0",
            vlan: 1,
          },
        ];
      }
    }

    const result = {
      name:
        data.name || `${data.type}-${Math.floor(Math.random() * 900) + 100}`,
      ip: ip_address,
      mac: mac_address,
      gateway: getGateway(data.network),
      ports,
    };

    return { status: "success", data: result };
  } catch (error) {
    throw new Error(`Ошибка расчёта: ${error.message}`);
  }
});

ipcMain.handle("check-backend-connection", async () => {
  return true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
