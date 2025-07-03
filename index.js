const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let onlineUsers = {}; // Store online users
let chatMessages = {}; // Store chats per user pair

io.on('connection', (socket) => {
  console.log('✅ Connected:', socket.id);
  socket.phone = null;

  // Register user
  socket.on('register', (number) => {
    socket.phone = number;
    onlineUsers[number] = socket.id;
    io.emit('online users', Object.keys(onlineUsers));
    console.log('📱 Registered:', number);
  });

  // Chat message handling
  socket.on('chat message', (msg) => {
    if (msg && msg.text && msg.from && msg.to && msg.name) {
      const chatKey = getChatKey(msg.from, msg.to);
      if (!chatMessages[chatKey]) chatMessages[chatKey] = [];
      chatMessages[chatKey].push(msg);

      // Send to receiver and sender
      [msg.from, msg.to].forEach(user => {
        if (onlineUsers[user]) {
          io.to(onlineUsers[user]).emit('chat message', msg);
        }
      });
    }
  });

  // Typing status
  socket.on('typing', ({ to, from, isTyping }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit('typing', { from, isTyping });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('❌ Disconnected:', socket.id);
    if (socket.phone && onlineUsers[socket.phone]) {
      delete onlineUsers[socket.phone];
      io.emit('online users', Object.keys(onlineUsers));

      // Clear chat history for this user
      Object.keys(chatMessages).forEach(chatKey => {
        if (chatKey.includes(socket.phone)) {
          delete chatMessages[chatKey];
          io.emit('clear chat', chatKey);
        }
      });
    }
  });
});

// Helper to create consistent chat key
function getChatKey(user1, user2) {
  return [user1, user2].sort().join('-');
}

http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
