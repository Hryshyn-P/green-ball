const express = require("express");
const http = require("http");
const path = require("path");
const sequelize = require("./models/index").sequelize;
const cors = require("cors");
const sockets = require("./sockets/index");
const { Room } = require("./models/room");
const { Player } = require("./models/player");

const app = express();
const server = http.createServer(app);
const apiRouter = require("./routes/api");
const port = process.env.PORT || 3333;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// routes
app.use("/api", apiRouter);

sockets.init(server);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  sequelize.sync().then(() => {
    Room.deleteAllRooms()
      .then(() => {
        Player.deleteTempPlayers();
      })
      .then(() => {
        console.log("Database synced and cleared");
      });
  });
});
