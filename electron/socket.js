const { io } = require("socket.io-client");
const { ipcMain } = require("electron");

function setupSocket() {
  const socket = io("http://localhost:5000");

  return socket;
}

module.exports = { setupSocket };
