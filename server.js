require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");
const { MongoClient } = require("mongodb");
const moment = require("moment");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const mongoURI = process.env.MONGO_URI;

async function connectToMongoDB() {}

async function insertMessage(username, message, room, client) {}

async function getMessages(room, client) {}

app.use(express.static(path.join(__dirname, "public")));

const botName = "ChitChat App";

const chatMessages = [];

(async () => {
  const mongoClient = await connectToMongoDB();
  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ username, room }) => {
      const user = userJoin(socket.id, username, room);

      socket.join(user.room);

      socket.emit("message", formatMessage(botName, "Welcome to ChitChat App"));

      socket.broadcast
        .to(user.room)
        .emit(
          "message",
          formatMessage(botName, `${user.username} has joined the chat`)
        );

      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });

      socket.emit("chatHistory", chatMessages);
    });

    socket.on("chatMessage", async (msg) => {
      const user = getCurrentUser(socket.id);

      const message = {
        username: user.username,
        text: msg,
        time: moment().format("h:mm A"),
      };
      chatMessages.push(message);

      io.to(user.room).emit("message", message);

      // If you want to save the message to MongoDB as well, you can do so here
      // await insertMessage(user.username, msg, user.room, mongoClient);
    });

    socket.on("disconnect", () => {
      const user = userLeave(socket.id);

      if (user) {
        io.to(user.room).emit(
          "message",
          formatMessage(botName, `${user.username} has left the chat`)
        );

        io.to(user.room).emit("roomUsers", {
          room: user.room,
          users: getRoomUsers(user.room),
        });
      }
    });
  });
})();

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
