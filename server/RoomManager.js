const CONSTANTS = require('./constants');
const GameEngine = require('./GameEngine');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRooms = new Map(); // socketId -> roomCode
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(socket, data) {
    const { playerName } = data;
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error', { message: 'Please enter a name' });
      return;
    }

    const roomCode = this.generateRoomCode();
    const player = {
      id: socket.id,
      name: playerName.trim().substring(0, 12),
      team: 1,
      tailColor: CONSTANTS.TAIL_COLORS[0],
      ready: false,
      isBot: false
    };

    const room = {
      code: roomCode,
      state: 'lobby',
      players: [player],
      gameEngine: null,
      host: socket.id
    };

    this.rooms.set(roomCode, room);
    this.playerRooms.set(socket.id, roomCode);
    socket.join(roomCode);

    socket.emit('room-created', { roomCode });
    socket.emit('room-joined', {
      roomCode,
      players: room.players,
      yourId: socket.id
    });

    console.log(`Room ${roomCode} created by ${player.name}`);
  }

  joinRoom(socket, data) {
    const { roomCode, playerName } = data;
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error', { message: 'Please enter a name' });
      return;
    }

    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.state !== 'lobby') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    const humanCount = room.players.filter(p => !p.isBot).length;
    if (humanCount >= 4) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Remove a bot to make space if needed
    if (room.players.length >= 4) {
      const botIndex = room.players.findIndex(p => p.isBot);
      if (botIndex !== -1) {
        room.players.splice(botIndex, 1);
      } else {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
    }

    // Assign team (balance teams)
    const team1Count = room.players.filter(p => p.team === 1).length;
    const team2Count = room.players.filter(p => p.team === 2).length;
    const team = team1Count <= team2Count ? 1 : 2;

    // Pick a color not already taken
    const usedColors = room.players.map(p => p.tailColor);
    const availableColor = CONSTANTS.TAIL_COLORS.find(c => !usedColors.includes(c)) || CONSTANTS.TAIL_COLORS[0];

    const player = {
      id: socket.id,
      name: playerName.trim().substring(0, 12),
      team,
      tailColor: availableColor,
      ready: false,
      isBot: false
    };

    room.players.push(player);
    this.playerRooms.set(socket.id, code);
    socket.join(code);

    socket.emit('room-joined', {
      roomCode: code,
      players: room.players,
      yourId: socket.id
    });

    // Notify others
    socket.to(code).emit('player-joined', { player });
    this.io.to(code).emit('lobby-update', { players: room.players });

    console.log(`${player.name} joined room ${code} (${room.players.length}/4)`);
  }

  addBots(socket) {
    const roomCode = this.playerRooms.get(socket.id);
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room || room.state !== 'lobby') return;

    const usedNames = room.players.map(p => p.name);
    const usedColors = room.players.map(p => p.tailColor);

    while (room.players.length < 4) {
      const team1Count = room.players.filter(p => p.team === 1).length;
      const team2Count = room.players.filter(p => p.team === 2).length;
      const team = team1Count <= team2Count ? 1 : 2;

      const botName = CONSTANTS.BOT_NAMES.find(n => !usedNames.includes(n)) || `Bot${room.players.length}`;
      const botColor = CONSTANTS.TAIL_COLORS.find(c => !usedColors.includes(c)) || CONSTANTS.TAIL_COLORS[room.players.length];

      usedNames.push(botName);
      usedColors.push(botColor);

      room.players.push({
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: botName,
        team,
        tailColor: botColor,
        ready: true,
        isBot: true
      });
    }

    this.io.to(roomCode).emit('lobby-update', { players: room.players });
    console.log(`Bots added to room ${roomCode}`);
  }

  selectCharacter(socket, data) {
    const roomCode = this.playerRooms.get(socket.id);
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (data.tailColor) {
      // Check if color is taken by another player
      const taken = room.players.some(p => p.id !== socket.id && p.tailColor === data.tailColor);
      if (!taken) {
        player.tailColor = data.tailColor;
      }
    }

    this.io.to(roomCode).emit('lobby-update', { players: room.players });
  }

  playerReady(socket) {
    const roomCode = this.playerRooms.get(socket.id);
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room || room.state !== 'lobby') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.ready = !player.ready;
    this.io.to(roomCode).emit('lobby-update', { players: room.players });

    // Check if all players are ready and we have 4
    if (room.players.length === 4 && room.players.every(p => p.ready)) {
      this.startGame(room);
    }
  }

  startGame(room) {
    room.state = 'countdown';
    let count = 3;

    this.io.to(room.code).emit('countdown', { number: count });

    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.io.to(room.code).emit('countdown', { number: count });
      } else if (count === 0) {
        this.io.to(room.code).emit('countdown', { number: 0 }); // "SWIM!"
      } else {
        clearInterval(countdownInterval);
        room.state = 'playing';
        room.gameEngine = new GameEngine(room, this.io, () => {
          room.state = 'ended';
        });
        room.gameEngine.start();
      }
    }, 1000);
  }

  handleInput(socket, data) {
    const roomCode = this.playerRooms.get(socket.id);
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameEngine) return;

    room.gameEngine.processInput(socket.id, data);
  }

  playAgain(socket) {
    const roomCode = this.playerRooms.get(socket.id);
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Reset room state
    if (room.gameEngine) {
      room.gameEngine.stop();
      room.gameEngine = null;
    }

    room.state = 'lobby';
    room.players.forEach(p => p.ready = p.isBot);

    this.io.to(roomCode).emit('returned-to-lobby', { roomCode, players: room.players });
    this.io.to(roomCode).emit('lobby-update', { players: room.players });
  }

  returnToLobby(socket) {
    this.playAgain(socket);
  }

  handleDisconnect(socket) {
    const roomCode = this.playerRooms.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    const playerName = playerIndex >= 0 ? room.players[playerIndex].name : 'Unknown';

    if (playerIndex >= 0) {
      room.players.splice(playerIndex, 1);
    }

    this.playerRooms.delete(socket.id);

    // Notify remaining players
    this.io.to(roomCode).emit('player-left', { playerId: socket.id });
    this.io.to(roomCode).emit('lobby-update', { players: room.players });

    console.log(`${playerName} left room ${roomCode}`);

    // Clean up empty rooms
    const humanPlayers = room.players.filter(p => !p.isBot);
    if (humanPlayers.length === 0) {
      if (room.gameEngine) {
        room.gameEngine.stop();
      }
      this.rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
    } else if (room.state === 'playing' && room.gameEngine) {
      // If a player leaves mid-game, stop the game
      room.gameEngine.stop();
      room.gameEngine = null;
      room.state = 'lobby';
      room.players.forEach(p => p.ready = p.isBot);
      this.io.to(roomCode).emit('returned-to-lobby', { roomCode, players: room.players });
      this.io.to(roomCode).emit('error', { message: `${playerName} disconnected. Returning to lobby.` });
    }
  }
}

module.exports = RoomManager;
