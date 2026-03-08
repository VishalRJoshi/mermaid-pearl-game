(() => {
  let currentScreen = null;
  let lastTime = performance.now();

  function switchScreen(screen, data) {
    if (currentScreen && currentScreen.exit) {
      currentScreen.exit();
    }
    currentScreen = screen;
    if (currentScreen && currentScreen.enter) {
      currentScreen.enter(data || {});
    }
  }

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    if (currentScreen) {
      if (currentScreen.update) currentScreen.update(dt);
      if (currentScreen.render) currentScreen.render(dt);
    }

    requestAnimationFrame(gameLoop);
  }

  function init() {
    // Resize canvas to fit window while maintaining aspect ratio
    const canvas = document.getElementById('gameCanvas');
    canvas.style.display = 'none'; // Hidden until game starts

    function resizeCanvas() {
      const ratio = CONSTANTS.ARENA_WIDTH / CONSTANTS.ARENA_HEIGHT;
      const windowRatio = window.innerWidth / window.innerHeight;

      if (windowRatio > ratio) {
        canvas.style.height = '100vh';
        canvas.style.width = 'auto';
      } else {
        canvas.style.width = '100vw';
        canvas.style.height = 'auto';
      }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Connect to server
    Network.connect();

    // Start on title screen
    switchScreen(TitleScreen);

    // Screen transition listeners
    Network.on('room-joined', (data) => {
      switchScreen(LobbyScreen, data);
    });

    Network.on('countdown', (data) => {
      // Switch to game screen on first countdown
      if (currentScreen !== GameScreen) {
        switchScreen(GameScreen, data);
      }
    });

    Network.on('match-ended', (data) => {
      switchScreen(EndScreen, data);
    });

    Network.on('returned-to-lobby', (data) => {
      switchScreen(LobbyScreen, {
        roomCode: data.roomCode || '',
        players: data.players,
        yourId: Network.getId()
      });
    });

    Network.on('_disconnected', () => {
      switchScreen(TitleScreen);
    });

    // Start game loop
    requestAnimationFrame(gameLoop);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
