const { Room } = require("../models/room");
const { Player } = require("../models/player");
const { RoomStatus } = require("../utils/room-status");

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
      room.gameStatus = RoomStatus.IN_PROGRESS;
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

const upsertOnBallClick = async (room, ballNumber, player, socket) => {
  try {
    const otherPlayer = room.players.find(
      (p) => p.username !== player.username
    );

    if (
      room.players.length === 2 &&
      room.gameStatus === RoomStatus.IN_PROGRESS
    ) {
      if (ballNumber === room.greenBallNumber) {
        const timeTaken = new Date().getTime() - room.currentRoundStartTime;
        const score = Math.floor(10000 / timeTaken);
        player.score += score;
        player.totalTime += timeTaken;
        player.gamesPlayed += 1;
        io.to(player.socketId).emit("game-message", ["Green ball found!"]);

        Promise.all([await player.save(), await room.reload()]);

        if (room.currentRound === 5) {
          io.to(room.id).emit("game-message", ["The end!"]);
          const stats = updatePlayerStats(room.players, player.username);
          io.to(room.id).emit("game-end", stats);
          room.gameStatus = RoomStatus.FINISHED;
          socket.leaveAll();
          await room.save();
          return;
        }

        const greenBallNumber = Math.floor(Math.random() * 9);
        room.currentRound += 1;
        room.greenBallNumber = greenBallNumber;

        Promise.all([await room.save(), await player.save()]);

        const gameData = {
          roundNumber: room.currentRound,
          greenBallNumber,
        };
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

const updatePlayerStats = (players, winner) => {
  const stats = [];
  if (winner) stats.push(`${winner} WIN! (^^,)`)
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const averageTime =
      player.gamesPlayed > 0 ? player.totalTime / player.gamesPlayed : 0;
    stats.push(`PLAYER: ${player.username}`);
    stats.push(
      `per round: ${Math.floor(averageTime / 1000)}sec, total score: ${
        player.score
      }, rounds played: ${player.gamesPlayed}`
    );
  }
  return stats;
};

const getOpenRoom = async (socketId) => {
  const openRooms = await Room.findAll({
    where: { gameStatus: RoomStatus.WAITING },
    include: [{ model: Player, through: { attributes: [] } }],
  });
  return openRooms.find(
    (room) =>
      room.players.length === 1 ||
      room.players.map((p) => p.socketId === socketId).includes(true)
  );
};

const createRoom = async (roomName) => {
  const newRoom = await Room.create({
    roomName,
  });
  await newRoom.save();
  return newRoom;
};

module.exports = {
  createNewGame,
  upsertOnBallClick,
  updatePlayerStats,
  getOpenRoom,
  createRoom,
};
