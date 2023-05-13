const {
  getPlayerById,
  getPlayerByUsername,
  getTopPlayers,
} = require("../services/players");

const getAllPlayers = async (req, res) => {
  try {
    const { id, username } = req.query;
    let result;
    if (id) {
      result = await getPlayerById(id);
    } else if (username) {
      result = await getPlayerByUsername(username);
    } else {
      result = await getTopPlayers();
    }
    res.json(result);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

module.exports = {
  getAllPlayers,
};
