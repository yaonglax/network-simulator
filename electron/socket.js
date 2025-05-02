const { io } = require("socket.io-client");
const { ipcMain } = require("electron");

let socket;

function setupSocket() {
  if (!socket) {
    socket = io("http://localhost:5000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    socket.on("connect", () => {
      console.log("Connected to Python backend");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Python backend");
    });
  }
  return socket;
}

function getSocket() {
  if (!socket) {
    throw new Error("Socket not initialized. Call setupSocket() first.");
  }
  return socket;
}

module.exports = { setupSocket, getSocket };
