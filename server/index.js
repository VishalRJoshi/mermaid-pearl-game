const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./RoomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('create-room', (data) => roomManager.createRoom(socket, data));
  socket.on('join-room', (data) => roomManager.joinRoom(socket, data));
  socket.on('select-character', (data) => roomManager.selectCharacter(socket, data));
  socket.on('player-ready', () => roomManager.playerReady(socket));
  socket.on('add-bots', () => roomManager.addBots(socket));
  socket.on('player-input', (data) => roomManager.handleInput(socket, data));
  socket.on('play-again', () => roomManager.playAgain(socket));
  socket.on('return-to-lobby', () => roomManager.returnToLobby(socket));
  socket.on('disconnect', () => roomManager.handleDisconnect(socket));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Mermaid Pearl Game server running on http://localhost:${PORT}`);
});
