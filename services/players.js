const { Player } = require("../models/player");

const getPlayerById = async (id) => {
  try {
    const player = await Player.findOne({ where: { id } });
    return player;
  } catch (error) {
    console.error("Failed to get player by ID");
  }
};

const getPlayerByUsername = async (username) => {
  try {
    const player = await Player.findOne({ where: { username } });
    return player;
  } catch (error) {
    console.error("Failed to get player by username");
  }
};

const getTopPlayers = async () => {
  try {
    const players = await Player.findAll({
      order: [["score", "DESC"]],
      limit: 5,
    });
    return players;
  } catch (error) {
    console.error("Failed to get top players");
  }
};

module.exports = {
  getPlayerById,
  getPlayerByUsername,
  getTopPlayers,
};
