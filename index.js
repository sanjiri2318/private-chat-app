const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));

let onlineUsers = {}; // { number: socket.id }
let chatMessages = []; // [{from, to, name, text, time}]

// Handle new socket connection
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.phone = null;

  // Register user with their phone number
  socket.on("register", (number) => {
    socket.phone = number;
    onlineUsers[number] = socket.id;
    console.log(`📱 ${number} is online`);
    sendOnlineUsers();
  });

  // Handle incoming chat messages
  socket.on("chat message", (msg) => {
    if (msg && msg.text && msg.from && msg.to) {
      chatMessages.push(msg);

      // Send message to recipient if online
      if (onlineUsers[msg.to]) {
        io.to(onlineUsers[msg.to]).emit("chat message", msg);
      }

      // Send message back to sender (for their own display)
      if (onlineUsers[msg.from]) {
        io.to(onlineUsers[msg.from]).emit("chat message", msg);
      }
    }
  });

  // Handle typing indicator
  socket.on("typing", ({ to, from, isTyping }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit("typing", { from, isTyping });
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    if (socket.phone) {
      console.log(`❌ ${socket.phone} disconnected`);
      delete onlineUsers[socket.phone];
      sendOnlineUsers();
    }

    // Clear chat if fewer than 2 users online
    if (Object.keys(onlineUsers).length < 2) {
      console.log("⚡ Less than 2 users online. Clearing chats.");
      chatMessages = [];
      io.emit("clear chat");
    }
  });

  // Send current online users to all clients
  function sendOnlineUsers() {
    io.emit("online users", Object.keys(onlineUsers));
  }
});

// Start the server
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
