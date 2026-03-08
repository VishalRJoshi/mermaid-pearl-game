const GameScreen = (() => {
  let gameState = null;
  let prevState = null;
  let lastStateTime = 0;
  let interpFactor = 0;
  let myId = '';
  let goalScoredData = null;
  let goalScoredTimer = 0;
  let countdownNumber = null;
  let inputSendTimer = 0;
  let gameTime = 0;

  function enter(data) {
    myId = Network.getId();
    gameState = null;
    prevState = null;
    countdownNumber = null;
    goalScoredData = null;
    goalScoredTimer = 0;
    gameTime = 0;

    // Hide UI overlay
    document.getElementById('ui-overlay').innerHTML = '';

    // Show canvas
    const canvas = document.getElementById('gameCanvas');
    canvas.style.display = 'block';
    Renderer.init(canvas);

    Network.on('game-state', onGameState);
    Network.on('goal-scored', onGoalScored);
    Network.on('countdown', onCountdown);

    Input.init();

    // Show mobile controls if touch device
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls && Input.getIsMobile()) {
      mobileControls.style.display = 'flex';
    }
  }

  function onGameState(data) {
    prevState = gameState;
    gameState = data;
    lastStateTime = performance.now();
    interpFactor = 0;

    // Clear countdown when game starts
    if (countdownNumber !== null && data.tick > 5) {
      countdownNumber = null;
    }
  }

  function onGoalScored(data) {
    goalScoredData = data;
    goalScoredTimer = 0;
  }

  function onCountdown(data) {
    countdownNumber = data.number;
  }

  function update(dt) {
    gameTime += dt;

    // Send input to server
    inputSendTimer += dt;
    if (inputSendTimer >= 1 / CONSTANTS.SERVER_TICK_RATE) {
      inputSendTimer = 0;
      const input = Input.getState();
      Network.emit('player-input', input);
    }

    // Interpolation factor
    if (gameState) {
      const elapsed = performance.now() - lastStateTime;
      const tickMs = 1000 / CONSTANTS.SERVER_TICK_RATE;
      interpFactor = Math.min(elapsed / tickMs, 1);
    }

    // Goal scored overlay timer
    if (goalScoredData) {
      goalScoredTimer += dt;
      if (goalScoredTimer > 2) {
        goalScoredData = null;
      }
    }
  }

  function render(dt) {
    if (!gameState) {
      // Draw background while waiting for first state
      Renderer.drawBackground(dt);
      if (countdownNumber !== null) {
        Renderer.drawHUD({ team1: 0, team2: 0 }, CONSTANTS.MATCH_DURATION, countdownNumber);
      }
      return;
    }

    // Draw scene
    Renderer.drawBackground(dt);
    Renderer.drawArena();

    // Draw goals
    const goalGlow1 = goalScoredData && goalScoredData.scoringTeam === 2 ? 1 - goalScoredTimer / 2 : 0;
    const goalGlow2 = goalScoredData && goalScoredData.scoringTeam === 1 ? 1 - goalScoredTimer / 2 : 0;
    Renderer.drawClamGoal(CONSTANTS.GOAL_TEAM1_X, 1, Math.max(0, goalGlow1));
    Renderer.drawClamGoal(CONSTANTS.GOAL_TEAM2_X, 2, Math.max(0, goalGlow2));

    // Draw players with interpolation
    for (const [id, player] of Object.entries(gameState.players)) {
      let drawX = player.x;
      let drawY = player.y;

      // Interpolate with previous state
      if (prevState && prevState.players[id]) {
        const prev = prevState.players[id];
        drawX = lerp(prev.x, player.x, interpFactor);
        drawY = lerp(prev.y, player.y, interpFactor);
      }

      const facingDir = {
        x: player.facingX || (player.team === 1 ? 1 : -1),
        y: player.facingY || 0
      };

      Renderer.drawMermaid(
        drawX, drawY,
        player.tailColor,
        player.team,
        player.name,
        player.hasPearl,
        facingDir,
        player.isDashing,
        id === myId
      );
    }

    // Draw pearl
    const pearl = gameState.pearl;
    let pearlX = pearl.x;
    let pearlY = pearl.y;

    if (prevState && prevState.pearl) {
      pearlX = lerp(prevState.pearl.x, pearl.x, interpFactor);
      pearlY = lerp(prevState.pearl.y, pearl.y, interpFactor);
    }

    Renderer.drawPearl(pearlX, pearlY, pearl.state, gameTime);

    // HUD
    if (countdownNumber !== null) {
      Renderer.drawHUD(gameState.scores, gameState.timeRemaining, countdownNumber);
    } else {
      Renderer.drawHUD(gameState.scores, gameState.timeRemaining, null);
    }

    // Goal scored overlay
    if (goalScoredData) {
      Renderer.drawGoalScoredOverlay(goalScoredData.scoringTeam, goalScoredTimer);
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function exit() {
    Network.off('game-state', onGameState);
    Network.off('goal-scored', onGoalScored);
    Network.off('countdown', onCountdown);
    gameState = null;
    prevState = null;

    // Hide mobile controls
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) mobileControls.style.display = 'none';
  }

  return { enter, exit, update, render };
})();
