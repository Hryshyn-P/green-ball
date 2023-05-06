const { DataTypes } = require("sequelize");
const { sequelize } = require(".");
const { Player } = require("./player");
const { Op } = require("sequelize");

const Room = sequelize.define("room", {
  socketIds: {
    type: DataTypes.ARRAY(DataTypes.STRING(255)),
  },
  gameStatus: {
    type: DataTypes.ENUM("waiting", "in_progress"),
    defaultValue: "waiting",
    allowNull: false,
  },
  greenBallNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  currentRound: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  currentRoundStartTime: {
    type: DataTypes.DATE,
  },
});

Room.belongsToMany(Player, { through: "player_room" });

Room.getBySocketId = async function (socketId) {
  const room = await Room.findOne({
    where: { socketIds: { [Op.contains]: [socketId] } },
    include: Player,
  });
  if (room) {
    return room;
  } else {
    const newRoom = await Room.create({ socketIds: [socketId] });
    return await newRoom.reload({ include: Player });
  }
};

Room.getSinglePlayerRoom = async function (socketId) {
  const singlePlayerRoom = await Room.findOne({
    include: [
      {
        model: Player,
        through: {
          attributes: [],
        },
      },
    ],
    where: {
      gameStatus: "waiting",
    },
    // having: sequelize.literal("count(players.id) = 1"),
  });

  if (
    singlePlayerRoom?.players?.length === 1 &&
    !singlePlayerRoom.socketIds.includes(socketId)
  ) {
    await singlePlayerRoom.update({
      socketIds: [...singlePlayerRoom.socketIds, socketId],
    });
  }
  return singlePlayerRoom;
};

Room.prototype.hasPlayer = async function hasPlayer(playerId) {
  const player = await this.getPlayers({ where: { id: playerId } });
  return player.length > 0;
};

Room.prototype.getTwoPlayerRoom = async function (socketId) {
  const room = await Room.findOne({
    where: {
      gameStatus: "in_progress",
      socketIds: { [Op.contains]: [socketId] },
    },
    include: Player,
  });
  return room.find((room) => room.players.length === 2);
};

Room.deleteAllRooms = async function () {
  await sequelize.query("TRUNCATE TABLE rooms CASCADE;");
};

exports.Room = Room;
