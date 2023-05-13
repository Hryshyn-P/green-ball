const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Player } = require("../models/player");
const { Room } = require("../models/room");

router.post("/", async (req, res) => {
  try {
    const { username } = req.body;
    const foundPlayer = await Player.findOne({ where: { username } });
    if (!foundPlayer) {
      res.status(500).send("Player not found");
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
      res.json({ roomId: openRoom.id });
    } else {
      const newRoom = await Room.create({
        roomName: `Open Room ${new Date().getTime()}`,
      });
      await newRoom.addPlayer(foundPlayer);
      res.json({ roomId: newRoom.id });
    }
  } catch (error) {
    res.status(400).send(error.message);
  }
});

module.exports = router;
