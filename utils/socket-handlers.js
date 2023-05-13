const { Room } = require("../models/room");
const { Player } = require("../models/player");
const { RoomStatus } = require("../utils/room-status");
const {
  createNewGame,
  upsertOnBallClick,
  updatePlayerStats,
  getOpenRoom,
  createRoom,
} = require("../utils/socket-utils");

const handleBallClicked = async (ballNumber, socket) => {
  try {
    const room = await Room.findByPk(
      Array.from(socket.rooms)[socket.rooms.size - 1],
      {
        include: [{ model: Player, through: { attributes: [] } }],
      }
    );
    const player = await Player.findOne({ where: { socketId: socket.id } });
    if (player && room) {
      await upsertOnBallClick(room, ballNumber, player, socket);
    }
  } catch (error) {
    console.error("Error handling ball click:", error);
  }
};

const handleSetUsername = async (io, username, socket) => {
  if (!username.trim()) {
    io.to(socket.id).emit("game-message", ["Username is required"]);
    return;
  }
  console.log(`Username "${username}" logged in.`);
  const player = await Player.findOrCreate({
    where: { username },
    defaults: {
      score: 0,
      totalTime: 0,
      gamesPlayed: 0,
      socketId: socket.id,
    },
  });
  player[0].socketId = socket.id;
  await player[0].save();
  const openRoom = await getOpenRoom(socket.id);
  if (openRoom) {
    const playerExists = await openRoom.hasPlayer(player[0].id);
    if (!playerExists) {
      await openRoom.addPlayer(player[0]);
    }
    await openRoom.reload();
    socket.join(openRoom.id);

    if (openRoom.players.length === 1) {
      io.to(openRoom.id).emit("game-message", ["Waiting for an opponent"]);
      return;
    }
    const otherPlayer = openRoom.players.find((p) => p.username !== username);

    io.to(otherPlayer.socketId).emit("game-message", [
      "Your opponent has joined the game",
    ]);
    io.to(socket.id).emit("game-message", ["You have joined the game"]);
    io.to(socket.id).emit("hide-board");
    io.to(otherPlayer.socketId).emit("hide-board");
    setTimeout(() => {
      io.to(openRoom.id).emit("game-message", [
        "Get ready! The game will start in 3 seconds",
      ]);
      if (openRoom.gameStatus !== RoomStatus.IN_PROGRESS) {
        createNewGame(openRoom.id);
      }
    }, 3000);
  } else {
    const newRoom = await createRoom(`Open Room ${new Date().getTime()}`);
    await newRoom.addPlayer(player[0].id);
    socket.join(newRoom.id);
    await handleSetUsername(io, username, socket);
  }
};

const handleDisconnect = async (io, socket) => {
  console.log(`SocketId: "${socket.id}" disconnected.`);
  const player = await Player.findOne({ where: { socketId: socket.id } });
  if (player) {
    const rooms = await Room.findAll({
      where: { gameStatus: RoomStatus.IN_PROGRESS },
      include: [
        {
          model: Player,
          through: { attributes: [] },
          where: { socketId: socket.id },
        },
      ],
    });
    for (const room of rooms) {
      socket.leave(room.id);
      await room.destroy();

      if (room.players.length === 0) {
        await room.destroy();
      }
      if (room.gameStatus === RoomStatus.IN_PROGRESS) {
        io.to(room.id).emit("game-message", ["Your opponent disconnected"]);
        room.gameStatus = RoomStatus.FINISHED;
        await room.save();
        const stats = updatePlayerStats(room.players);
        setTimeout(() => {
          io.to(room.id).emit("game-end", stats);
        }, 1500);
      }
    }
  }
};

module.exports = {
  handleBallClicked,
  handleSetUsername,
  handleDisconnect,
};
