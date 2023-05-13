const express = require("express");
const router = express.Router();
const playerController = require("../controllers/players");
const roomController = require("../controllers/rooms");

router.get("/players", playerController.getAllPlayers);
router.post("/rooms", roomController.addPlayerToRoomHandler);

module.exports = router;
