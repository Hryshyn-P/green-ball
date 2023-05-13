const { addPlayerToRoom } = require("../services/rooms");

const addPlayerToRoomHandler = async (req, res) => {
  try {
    const { username } = req.body;
    const roomId = await addPlayerToRoom(username);
    res.json({ roomId });
  } catch (error) {
    res.status(400).send(error.message);
  }
};

module.exports = {
  addPlayerToRoomHandler,
};
