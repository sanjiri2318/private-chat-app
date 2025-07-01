const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;  // ✅ Critical for Render deployment

app.use(express.static('public'));

let onlineUsers = {};
let chatMessages = [];

io.on('connection', (socket) => {
  console.log('✅ Connected:', socket.id);
  socket.phone = null;

  // Register the user with phone number
  socket.on('register', (number) => {
    socket.phone = number;
    onlineUsers[number] = socket.id;
    io.emit('online users', Object.keys(onlineUsers));
  });

  // Handle chat messages
  socket.on('chat message', (msg) => {
    if (msg && msg.text && msg.from && msg.to && msg.name) {
      chatMessages.push(msg);

      // Send message to both sender and receiver
      if (onlineUsers[msg.to]) {
        io.to(onlineUsers[msg.to]).emit('chat message', msg);
      }
      if (onlineUsers[msg.from]) {
        io.to(onlineUsers[msg.from]).emit('chat message', msg);
      }
    }
  });

  // Typing status
  socket.on('typing', ({ to, from, isTyping }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit('typing', { name: from, isTyping });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Disconnected:', socket.id);

    if (socket.phone && onlineUsers[socket.phone]) {
      delete onlineUsers[socket.phone];
      io.emit('online users', Object.keys(onlineUsers));
    }

    // Clear chat if fewer than 2 users are online
    if (Object.keys(onlineUsers).length < 2) {
      chatMessages = [];
      io.emit('clear chat');
    }
  });
});

// Start the server
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
