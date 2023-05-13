const express = require("express");
const router = express.Router();
const { Player } = require("../models/player");

router.get("/", async (req, res) => {
  try {
    const { id, username } = req.query;
    if (id) {
      const foundPlayer = await Player.findOne({ where: { id } });
      return res.json(foundPlayer);
    }
    if (username) {
      const foundPlayer = await Player.findOne({ where: { username } });
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

module.exports = router;
