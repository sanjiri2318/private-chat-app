const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
  }
});
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

let onlineUsers = {};    // { phoneNumber: socket.id }
let chatMessages = {};   // { chatKey: [messages] }

function getChatKey(user1, user2) {
  return [user1, user2].sort().join('-');
}

io.on('connection', (socket) => {
  console.log('✅ Connected:', socket.id);

  socket.on('register', (number) => {
    socket.phone = number;
    onlineUsers[number] = socket.id;
    console.log(`📱 User Registered: ${number}`);
    io.emit('online users', Object.keys(onlineUsers));
  });

  socket.on('chat message', (msg) => {
    if (msg && msg.text && msg.from && msg.to) {
      const chatKey = getChatKey(msg.from, msg.to);

      if (!chatMessages[chatKey]) {
        chatMessages[chatKey] = [];
      }
      chatMessages[chatKey].push(msg);

      // Send to receiver if online
      if (onlineUsers[msg.to]) {
        io.to(onlineUsers[msg.to]).emit('chat message', msg);
      }

      // Send to sender too (so their message appears instantly)
      if (onlineUsers[msg.from]) {
        io.to(onlineUsers[msg.from]).emit('chat message', msg);
      }
    }
  });

  socket.on('typing', ({ to, from, isTyping }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit('typing', { from, isTyping });
    }
  });

  socket.on('disconnect', () => {
    if (socket.phone && onlineUsers[socket.phone]) {
      delete onlineUsers[socket.phone];
      console.log(`❌ Disconnected: ${socket.phone}`);
      io.emit('online users', Object.keys(onlineUsers));
    }
  });
});

http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
