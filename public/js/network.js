const Network = (() => {
  let socket = null;
  const listeners = {};

  function connect() {
    socket = io();

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
      emit('_connected', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      emit('_disconnected');
    });

    // Register all game events
    const events = [
      'room-created', 'room-joined', 'player-joined', 'player-left',
      'lobby-update', 'countdown', 'game-state', 'goal-scored',
      'match-ended', 'error', 'returned-to-lobby'
    ];

    events.forEach(event => {
      socket.on(event, (data) => {
        if (listeners[event]) {
          listeners[event].forEach(cb => cb(data));
        }
      });
    });
  }

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    }
  }

  function emit(event, data) {
    if (event.startsWith('_')) {
      // Internal event
      if (listeners[event]) {
        listeners[event].forEach(cb => cb(data));
      }
      return;
    }
    if (socket) {
      socket.emit(event, data);
    }
  }

  function getId() {
    return socket ? socket.id : null;
  }

  return { connect, on, off, emit, getId };
})();
