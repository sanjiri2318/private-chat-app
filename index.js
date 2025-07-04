
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const cors = require("cors");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 3000;

// ✅ MongoDB Connection
mongoose.connect("mongodb+srv://Sanjiri:Sanjithk123@privatechatdb.f4ouxdn.mongodb.net/privateChatDB?retryWrites=true&w=majority&appName=privateChatDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// Schemas
const UserSchema = new mongoose.Schema({
  number: String,
  name: String
});
const ChatSchema = new mongoose.Schema({
  from: String,
  to: String,
  text: String,
  time: String
});
const User = mongoose.model("User", UserSchema);
const Chat = mongoose.model("Chat", ChatSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

let onlineUsers = {};

// Socket.io Handling
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("register", async ({ number, name }) => {
    socket.phone = number;
    onlineUsers[number] = socket.id;
    console.log(`📱 ${name} (${number}) is online`);

    let user = await User.findOne({ number });
    if (!user) {
      user = new User({ number, name });
      await user.save();
    }

    sendOnlineUsers();
  });

  socket.on("chat message", async (msg) => {
    const newMsg = new Chat(msg);
    await newMsg.save();

    if (onlineUsers[msg.to]) {
      io.to(onlineUsers[msg.to]).emit("chat message", msg);
    }
    if (onlineUsers[msg.from]) {
      io.to(onlineUsers[msg.from]).emit("chat message", msg);
    }
  });

  socket.on("typing", ({ to, from, isTyping }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit("typing", { from, isTyping });
    }
  });

  socket.on("disconnect", async () => {
    if (socket.phone) {
      console.log(`❌ ${socket.phone} disconnected`);
      delete onlineUsers[socket.phone];
      sendOnlineUsers();
    }

    if (Object.keys(onlineUsers).length < 2) {
      console.log("⚡ Clearing all chats...");
      await Chat.deleteMany({});
      io.emit("clear chat");
    }
  });

  function sendOnlineUsers() {
    io.emit("online users", Object.keys(onlineUsers));
  }
});

// Start Server
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
