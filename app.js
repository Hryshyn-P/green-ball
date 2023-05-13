const express = require("express");
const http = require("http");
const path = require("path");
const sequelize = require("./config/db").sequelize;
const cors = require("cors");
const sockets = require("./sockets/index");
const { Room } = require("./models/room");

const app = express();
const server = http.createServer(app);
const apiRouter = require("./routes/index");
const port = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/", apiRouter);

sockets.init(server);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  sequelize.sync().then(() => {
    Room.deleteAllRooms()
      .then(() => {
        console.log("Database synced and cleared");
      });
  });
});
