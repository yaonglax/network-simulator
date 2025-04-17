const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const { setupSocket } = require("./socket");
const socket = setupSocket();
const { spawn } = require("child_process");
const pythonProcess = spawn("python", ["py-backend/ws_server.py"]);

pythonProcess.stdout.on("data", (data) => {
  console.log(`Python: ${data}`);
});

let mainWindow;

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
