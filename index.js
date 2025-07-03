const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let onlineUsers = {};
let chatMessages = {};

io.on('connection', (socket) => {
  console.log('✅ Connected:', socket.id);
  socket.phone = null;

  // Register user
  socket.on('register', (number) => {
    socket.phone = number;
    onlineUsers[number] = socket.id;
    io.emit('online users', Object.keys(onlineUsers));
  });

  // Chat message
  socket.on('chat message', (msg) => {
    if (msg && msg.text && msg.from && msg.to && msg.name) {
      // Save chat per pair
      const chatKey = [msg.from, msg.to].sort().join('-');
      if (!chatMessages[chatKey]) chatMessages[chatKey] = [];
      chatMessages[chatKey].push(msg);

      // Send to receiver
      if (onlineUsers[msg.to]) {
        io.to(onlineUsers[msg.to]).emit('chat message', { ...msg, self: false });
      }

      // Confirm to sender (as own message)
      socket.emit('chat message', { ...msg, self: true });
    }
  });

  // Typing indicator
  socket.on('typing', ({ to, from, isTyping }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit('typing', { from, isTyping });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('❌ Disconnected:', socket.id);
    if (socket.phone && onlineUsers[socket.phone]) {
      delete onlineUsers[socket.phone];
      io.emit('online users', Object.keys(onlineUsers));

      // Clear chat if one user leaves
      const userKeys = Object.keys(chatMessages);
      userKeys.forEach((key) => {
        if (key.includes(socket.phone)) {
          delete chatMessages[key];
          io.emit('clear chat', { chatKey: key });
        }
      });
    }
  });
});

http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
