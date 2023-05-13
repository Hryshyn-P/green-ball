const { Op } = require("sequelize");
const { Player } = require("../models/player");
const { Room } = require("../models/room");

const addPlayerToRoom = async (username) => {
  try {
    const foundPlayer = await Player.findOne({ where: { username } });
    if (!foundPlayer) {
      console.error("Player not found");
    }
    const openRoom = await Room.findOne({
      where: {
        roomName: {
          [Op.like]: "%Open%",
        },
      },
      include: [Player],
    });
    if (openRoom) {
      await openRoom.addPlayer(foundPlayer);
      return openRoom.id;
    } else {
      const newRoom = await Room.create({
        roomName: `Open Room ${new Date().getTime()}`,
      });
      await newRoom.addPlayer(foundPlayer);
      return newRoom.id;
    }
  } catch (error) {
    console.error("Failed to add player to room");
  }
};

module.exports = {
  addPlayerToRoom,
};
