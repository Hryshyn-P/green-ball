const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Player = sequelize.define("player", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    idex: true,
  },
  socketId: {
    type: DataTypes.STRING,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalTime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  gamesPlayed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

Player.associate = (models) => {
  Player.belongsToMany(models.Room);
};

exports.Player = Player;
