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
let typingUsers = {};  // { to: from }

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.phone = null;

  // User registers with their phone number
  socket.on("register", (number) => {
    socket.phone = number;
    onlineUsers[number] = socket.id;
    console.log(`📱 ${number} is online`);
    sendOnlineUsers();
  });

  // Handle incoming messages
  socket.on("chat message", (msg) => {
    if (msg && msg.text && msg.from && msg.to) {
      console.log(`💬 Message from ${msg.from} to ${msg.to}: ${msg.text}`);
      chatMessages.push(msg);

      // Send message to recipient if online
      if (onlineUsers[msg.to]) {
        io.to(onlineUsers[msg.to]).emit("chat message", msg);
      }

      // Echo back to sender
      if (onlineUsers[msg.from]) {
        io.to(onlineUsers[msg.from]).emit("chat message", msg);
      }
    }
  });

  // Typing indicator
  socket.on("typing", ({ to, from, isTyping }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit("typing", { from, isTyping });
    }
    // Track who is typing
    if (isTyping) {
      typingUsers[to] = from;
    } else {
      delete typingUsers[to];
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    if (socket.phone) {
      console.log(`❌ ${socket.phone} disconnected`);
      delete onlineUsers[socket.phone];
      sendOnlineUsers();
    }

    // Clear chat if no users left
    if (Object.keys(onlineUsers).length < 2) {
      console.log("⚡ Less than 2 users online. Clearing chats.");
      chatMessages = [];
      io.emit("clear chat");
    }
  });

  // Send all currently online users
  function sendOnlineUsers() {
    io.emit("online users", Object.keys(onlineUsers));
  }
});

// Start the server
http.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
