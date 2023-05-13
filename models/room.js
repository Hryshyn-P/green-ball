const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const { Player } = require("./player");
const { Op } = require("sequelize");

const Room = sequelize.define("room", {
  roomName: {
    type: DataTypes.STRING,
    unique: true,
  },
  gameStatus: {
    type: DataTypes.ENUM("waiting", "in_progress", "finished"),
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

Room.prototype.hasPlayer = async function hasPlayer(playerId) {
  const player = await this.getPlayers({ where: { id: playerId } });
  return player.length > 0;
};

Room.deleteAllRooms = async function () {
  await sequelize.query("TRUNCATE TABLE rooms CASCADE;");
};

exports.Room = Room;
