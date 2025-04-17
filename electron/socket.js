const { io } = require("socket.io-client");
const { ipcMain } = require("electron");

function setupSocket() {
  const socket = io("http://localhost:5000");

  // Пересылка событий в React
  socket.on("mac_table", (data) => {
    ipcMain.emit("socket-mac-table", data);
  });

  socket.on("packet_processed", (data) => {
    ipcMain.emit("socket-packet", data);
  });

  return socket;
}

module.exports = { setupSocket };
