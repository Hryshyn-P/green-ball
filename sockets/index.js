require("dotenv").config();
const { Server } = require("socket.io");
const {
  handleBallClicked,
  handleSetUsername,
  handleDisconnect,
} = require("../utils/socket-handlers");

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.UI_HOST || "http://localhost:8080",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", async (socket) => {
    console.log(`SocketId: "${socket.id}" connected.`);

    socket.on("disconnect", async () => {
      await handleDisconnect(io, socket);
    });

    socket.on("set-username", async (username) => {
      await handleSetUsername(io, username, socket);
    });

    socket.on("ball-clicked", async (ballNumber) => {
      await handleBallClicked(ballNumber, socket);
    });
  });
};

module.exports = { init };
