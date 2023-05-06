const { Room } = require("../models/room");
const { Player } = require("../models/player");
const { Server } = require("socket.io");

const createNewGame = async (roomId) => {
  try {
    const room = await Room.findByPk(roomId, {
      include: [{ model: Player, through: { attributes: [] } }],
    });
    if (room.players.length === 2) {
      const greenBallNumber = Math.floor(Math.random() * 9);
      const gameData = {
        roundNumber: 1,
        greenBallNumber,
      };

      io.to(roomId).emit("new-round", gameData);
      room.gameStatus = "in_progress";
      room.currentRoundStartTime = new Date().getTime();
      await room.save();
      setTimeout(() => {
        io.to(roomId).emit("game-message", ["Game started!"]);
      }, 3000);
    }
  } catch (error) {
    console.error("Error creating new game:", error.message);
  }
};

const handleBallClick = async (room, ballNumber, player, socket) => {
  try {
    const otherPlayer = room.players.find(
      (p) => p.username !== player.username
    );

    if (room.players.length === 2 && room.gameStatus === "in_progress") {
      if (ballNumber === room.greenBallNumber) {
        const timeTaken = new Date().getTime() - room.currentRoundStartTime;
        const score = Math.floor(10000 / timeTaken);
        player.score += score;
        player.totalTime += timeTaken;
        player.gamesPlayed += 1;
        io.to(player.socketId).emit("game-message", ["Green ball found!"]);
        await player.save();
        await room.reload();

        if (room.currentRound === 5) {
          io.to(room.id).emit("game-message", ["The end!"]);
          const stats = updatePlayerStats(room.players);
          io.to(room.id).emit("game-end", stats);
          room.gameStatus = "finished";
          socket.leaveAll();
          await room.save();
          return;
        }

        const greenBallNumber = Math.floor(Math.random() * 9);
        room.currentRound += 1;
        room.greenBallNumber = greenBallNumber;

        await room.save();
        await player.save();

        const gameData = {
          roundNumber: room.currentRound,
          greenBallNumber,
        };
        console.log("before emit", room.id);
        io.to(room.id).emit("new-round", gameData);
        setTimeout(() => {
          io.to(room.id).emit("game-start");
        }, 3000);
      } else {
        io.to(player.socketId).emit("game-message", ["Wrong ball clicked!"]);
        io.to(otherPlayer.socketId).emit("game-message", [
          "Your opponent clicked the wrong ball!",
        ]);
      }
    }
  } catch (error) {
    console.error("Error handling ball click:", error.message);
  }
};

const updatePlayerStats = (players) => {
  const stats = [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const averageTime =
      player.gamesPlayed > 0 ? player.totalTime / player.gamesPlayed : 0;
    stats.push(`USER: ${player.username}`);
    stats.push(
      `per round: ${Math.floor(averageTime / 1000)}sec, total score: ${
        player.score
      }, games played: ${player.gamesPlayed}`
    );
  }
  return stats;
};

const getOpenRoom = async (socketId) => {
  const openRooms = await Room.findAll({
    where: { gameStatus: "waiting" },
    include: [{ model: Player, through: { attributes: [] } }],
  });
  return openRooms.find(
    (room) =>
      room.players.length === 1 &&
      !room.players.map((p) => p.socketId === socketId).includes(true)
  );
};

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:8080",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", async (socket) => {
    console.log(`SocketId: "${socket.id}" connected.`);
    socket.on("disconnect", async () => {
      console.log(`SocketId: "${socket.id}" disconnected.`);
      const player = await Player.findOne({ where: { socketId: socket.id } });
      if (player) {
        const rooms = await Room.findAll({
          where: { gameStatus: "in_progress" },
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
          } else if (room.gameStatus === "in_progress") {
            const otherPlayer = room.players[0];
            io.to(otherPlayer.socketId).emit("game-message", [
              "Your opponent disconnected",
            ]);
            room.gameStatus = "finished";
            await room.save();
            const stats = updatePlayerStats(room.players);
            io.to(room.id).emit("game-end", stats);
          }
        }
      }
    });

    socket.on("set-username", async (username) => {
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
          await openRoom.reload();
        }
        if (openRoom.players.length === 1) {
          socket.join(openRoom.id);
          return;
        }
        const otherPlayer = openRoom.players.find(
          (p) => p.username !== username
        );
        socket.join(openRoom.id);

        io.to(otherPlayer.socketId).emit("game-message", [
          "Your opponent has joined the game",
        ]);
        io.to(socket.id).emit("game-message", ["You have joined the game"]);
        io.to(socket.id).emit("hide-board");
        io.to(otherPlayer.socketId).emit("hide-board");
        setTimeout(() => {
          io.to(otherPlayer.socketId).emit("game-message", [
            "Get ready! The game will start in 3 seconds",
          ]);
          io.to(socket.id).emit("game-message", [
            "Get ready! The game will start in 3 seconds",
          ]);
          if (openRoom.gameStatus !== "in_progress") {
            createNewGame(openRoom.id);
          }
        }, 3000);
      } else {
        const createRoom = async (roomName) => {
          const newRoom = await Room.create({
            roomName,
          });
          await newRoom.save();
          return newRoom;
        };
        const newRoom = await createRoom(`Open Room ${new Date().getTime()}`);
        await newRoom.addPlayer(player[0]);
        socket.join(newRoom.id);
        io.to(socket.id).emit("game-message", ["Waiting for an opponent"]);
      }
    });

    socket.on("ball-clicked", async (ballNumber) => {
      const room = await Room.findByPk(
        Array.from(socket.rooms)[socket.rooms.size - 1],
        {
          include: [{ model: Player, through: { attributes: [] } }],
        }
      );
      const player = await Player.findOne({ where: { socketId: socket.id } });
      if (player && room) {
        await handleBallClick(room, ballNumber, player, socket);
      }
    });
  });
};

module.exports = { init };
