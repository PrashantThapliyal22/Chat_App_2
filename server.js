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

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// MongoDB URI (replace with your MongoDB URI)
const mongoURI = process.env.MONGO_URI;

// Function to connect to MongoDB
async function connectToMongoDB() {
  // ... (unchanged MongoDB connection code)
}

// Function to insert a message into MongoDB
async function insertMessage(username, message, room, client) {
  // ... (unchanged MongoDB insert message code)
}

// Function to get messages from MongoDB
async function getMessages(room, client) {
  // ... (unchanged MongoDB get messages code)
}

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChitChat App";

// Initialize chatMessages array to store messages locally
const chatMessages = [];

(async () => {
  const mongoClient = await connectToMongoDB();
  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ username, room }) => {
      const user = userJoin(socket.id, username, room);

      socket.join(user.room);

      // Welcome current user
      socket.emit("message", formatMessage(botName, "Welcome to ChitChat App"));

      // Broadcast when a user connects
      socket.broadcast
        .to(user.room)
        .emit(
          "message",
          formatMessage(botName, `${user.username} has joined the chat`)
        );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });

      // Send chat history to the current user
      socket.emit("chatHistory", chatMessages);
    });

    // Listen for chatMessage
    socket.on("chatMessage", async (msg) => {
      const user = getCurrentUser(socket.id);

      // Save the message to the chatMessages array
      const message = {
        username: user.username,
        text: msg,
        time: new Date(),
      };
      chatMessages.push(message);

      // Emit the message to all connected clients
      io.to(user.room).emit("message", message);

      // If you want to save the message to MongoDB as well, you can do so here
      // await insertMessage(user.username, msg, user.room, mongoClient);
    });

    // Runs when client disconnects
    socket.on("disconnect", () => {
      const user = userLeave(socket.id);

      if (user) {
        io.to(user.room).emit(
          "message",
          formatMessage(botName, `${user.username} has left the chat`)
        );

        // Send users and room info
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
