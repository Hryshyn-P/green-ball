const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Player } = require("../models/player");
const { Room } = require("../models/room");

router.get("/players", async (req, res) => {
  try {
    const { id, username } = req.query;
    if (id) {
      const foundPlayer = await Player.findOne({ where: { id } });
      if (!foundPlayer) throw new Error("Player not found");
      return res.json(foundPlayer);
    }
    if (username) {
      const foundPlayer = await Player.findOne({ where: { username } });
      if (!foundPlayer) throw new Error("Player not found");
      return res.json(foundPlayer);
    }
    const players = await Player.findAll({
      order: [["score", "DESC"]],
      limit: 5,
    });
    res.json(players);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.post("/rooms", async (req, res) => {
  try {
    const { username } = req.body;
    const foundPlayer = await Player.findOne({ where: { username } });
    if (!foundPlayer) throw new Error("Player not found");
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
