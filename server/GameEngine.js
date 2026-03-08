const CONSTANTS = require('./constants');
const BotAI = require('./BotAI');

class GameEngine {
  constructor(room, io, onMatchEnd) {
    this.room = room;
    this.io = io;
    this.onMatchEnd = onMatchEnd;
    this.interval = null;
    this.lastTick = Date.now();
    this.tick = 0;

    this.state = {
      timeRemaining: CONSTANTS.MATCH_DURATION,
      scores: { team1: 0, team2: 0 },
      players: {},
      pearl: null,
      goalPause: 0,
      countdown: null
    };

    this.inputs = {};
    this.botAIs = {};
    this.initPlayers();
    this.resetPearl();
  }

  initPlayers() {
    const team1Players = this.room.players.filter(p => p.team === 1);
    const team2Players = this.room.players.filter(p => p.team === 2);

    team1Players.forEach((p, i) => {
      const spawn = CONSTANTS.SPAWN_POSITIONS.team1[i] || CONSTANTS.SPAWN_POSITIONS.team1[0];
      this.state.players[p.id] = {
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        team: p.team,
        tailColor: p.tailColor,
        name: p.name,
        hasPearl: false,
        isDashing: false,
        dashTimer: 0,
        dashCooldown: 0,
        isBot: p.isBot,
        facingX: 1,
        facingY: 0
      };
      if (p.isBot) {
        this.botAIs[p.id] = new BotAI(p.id, p.team);
      }
    });

    team2Players.forEach((p, i) => {
      const spawn = CONSTANTS.SPAWN_POSITIONS.team2[i] || CONSTANTS.SPAWN_POSITIONS.team2[0];
      this.state.players[p.id] = {
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        team: p.team,
        tailColor: p.tailColor,
        name: p.name,
        hasPearl: false,
        isDashing: false,
        dashTimer: 0,
        dashCooldown: 0,
        isBot: p.isBot,
        facingX: p.team === 1 ? 1 : -1,
        facingY: 0
      };
      if (p.isBot) {
        this.botAIs[p.id] = new BotAI(p.id, p.team);
      }
    });
  }

  resetPearl() {
    this.state.pearl = {
      x: CONSTANTS.ARENA_WIDTH / 2,
      y: CONSTANTS.ARENA_HEIGHT / 2,
      state: 'loose',
      holderId: null,
      targetX: null,
      targetY: null,
      vx: 0,
      vy: 0
    };
    // Remove pearl from all players
    Object.values(this.state.players).forEach(p => p.hasPearl = false);
  }

  resetPositions() {
    const team1Players = Object.entries(this.state.players).filter(([, p]) => p.team === 1);
    const team2Players = Object.entries(this.state.players).filter(([, p]) => p.team === 2);

    team1Players.forEach(([id, p], i) => {
      const spawn = CONSTANTS.SPAWN_POSITIONS.team1[i] || CONSTANTS.SPAWN_POSITIONS.team1[0];
      p.x = spawn.x;
      p.y = spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.hasPearl = false;
      p.isDashing = false;
      p.dashTimer = 0;
    });

    team2Players.forEach(([id, p], i) => {
      const spawn = CONSTANTS.SPAWN_POSITIONS.team2[i] || CONSTANTS.SPAWN_POSITIONS.team2[0];
      p.x = spawn.x;
      p.y = spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.hasPearl = false;
      p.isDashing = false;
      p.dashTimer = 0;
    });

    this.resetPearl();
  }

  start() {
    const tickMs = 1000 / CONSTANTS.SERVER_TICK_RATE;
    this.lastTick = Date.now();
    this.interval = setInterval(() => this.update(), tickMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  processInput(playerId, input) {
    this.inputs[playerId] = input;
  }

  update() {
    const now = Date.now();
    const dt = Math.min((now - this.lastTick) / 1000, 0.1); // Cap dt
    this.lastTick = now;
    this.tick++;

    // Goal pause (celebration after scoring)
    if (this.state.goalPause > 0) {
      this.state.goalPause -= dt;
      if (this.state.goalPause <= 0) {
        this.state.goalPause = 0;
        this.resetPositions();
      }
      this.broadcast();
      return;
    }

    // Update bots
    this.updateBots();

    // Process player movement
    this.updatePlayers(dt);

    // Update pearl
    this.updatePearl(dt);

    // Check collisions
    this.checkPlayerCollisions();

    // Check pearl interactions
    this.checkPearlInteractions();

    // Check goals
    this.checkGoals();

    // Update timer
    this.state.timeRemaining -= dt;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.endMatch();
      return;
    }

    this.broadcast();
  }

  updateBots() {
    for (const [botId, botAI] of Object.entries(this.botAIs)) {
      if (this.state.players[botId]) {
        const input = botAI.think(this.state);
        this.inputs[botId] = input;
      }
    }
  }

  updatePlayers(dt) {
    for (const [id, player] of Object.entries(this.state.players)) {
      const input = this.inputs[id] || {};

      // Dash cooldown
      if (player.dashCooldown > 0) {
        player.dashCooldown -= dt;
      }

      // Dash activation
      if (input.dash && player.dashCooldown <= 0 && !player.isDashing) {
        player.isDashing = true;
        player.dashTimer = CONSTANTS.DASH_DURATION;
        player.dashCooldown = CONSTANTS.DASH_COOLDOWN;
      }

      // Dash timer
      if (player.isDashing) {
        player.dashTimer -= dt;
        if (player.dashTimer <= 0) {
          player.isDashing = false;
        }
      }

      // Movement
      let dx = 0, dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      // Update facing direction
      if (dx !== 0 || dy !== 0) {
        player.facingX = dx;
        player.facingY = dy;
      }

      // Speed
      let speed = player.hasPearl ? CONSTANTS.PLAYER_SPEED_WITH_PEARL : CONSTANTS.PLAYER_SPEED;
      if (player.isDashing) speed = CONSTANTS.DASH_SPEED;

      player.vx = dx * speed;
      player.vy = dy * speed;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Arena bounds
      const r = CONSTANTS.PLAYER_RADIUS;
      player.x = Math.max(r + 10, Math.min(CONSTANTS.ARENA_WIDTH - r - 10, player.x));
      player.y = Math.max(r + 10, Math.min(CONSTANTS.ARENA_HEIGHT - r - 10, player.y));

      // Pass action
      if (input.pass && player.hasPearl) {
        this.passPearl(id, player);
      }

      // Clear one-shot inputs
      if (this.inputs[id]) {
        this.inputs[id].pass = false;
        this.inputs[id].dash = false;
      }
    }
  }

  passPearl(passerId, passer) {
    // Find teammate
    const teammate = Object.entries(this.state.players).find(
      ([id, p]) => id !== passerId && p.team === passer.team
    );

    if (!teammate) return;

    const [tmId, tm] = teammate;

    // Calculate direction to teammate
    const dx = tm.x - passer.x;
    const dy = tm.y - passer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const vx = (dx / dist) * CONSTANTS.PEARL_PASS_SPEED;
    const vy = (dy / dist) * CONSTANTS.PEARL_PASS_SPEED;

    passer.hasPearl = false;
    this.state.pearl.state = 'flying';
    this.state.pearl.holderId = null;
    this.state.pearl.x = passer.x + (dx / dist) * (CONSTANTS.PLAYER_RADIUS + CONSTANTS.PEARL_RADIUS);
    this.state.pearl.y = passer.y + (dy / dist) * (CONSTANTS.PLAYER_RADIUS + CONSTANTS.PEARL_RADIUS);
    this.state.pearl.vx = vx;
    this.state.pearl.vy = vy;
    this.state.pearl.targetX = tm.x;
    this.state.pearl.targetY = tm.y;
    this.state.pearl.passTeam = passer.team;
  }

  updatePearl(dt) {
    const pearl = this.state.pearl;

    if (pearl.state === 'held' && pearl.holderId) {
      const holder = this.state.players[pearl.holderId];
      if (holder) {
        pearl.x = holder.x + holder.facingX * (CONSTANTS.PLAYER_RADIUS + CONSTANTS.PEARL_RADIUS + 2);
        pearl.y = holder.y + holder.facingY * (CONSTANTS.PLAYER_RADIUS + CONSTANTS.PEARL_RADIUS + 2);
      }
    } else if (pearl.state === 'flying') {
      pearl.x += pearl.vx * dt;
      pearl.y += pearl.vy * dt;

      // Check if pearl went out of bounds
      if (pearl.x < 0 || pearl.x > CONSTANTS.ARENA_WIDTH ||
          pearl.y < 10 || pearl.y > CONSTANTS.ARENA_HEIGHT - 10) {
        pearl.state = 'loose';
        pearl.vx = 0;
        pearl.vy = 0;
        pearl.x = Math.max(20, Math.min(CONSTANTS.ARENA_WIDTH - 20, pearl.x));
        pearl.y = Math.max(20, Math.min(CONSTANTS.ARENA_HEIGHT - 20, pearl.y));
      }

      // Check if pearl reached reasonable distance (stop after flying too far)
      const travelDist = Math.sqrt(pearl.vx * pearl.vx + pearl.vy * pearl.vy) * dt;
      if (travelDist < 1 && pearl.state === 'flying') {
        pearl.state = 'loose';
        pearl.vx = 0;
        pearl.vy = 0;
      }
    }
  }

  checkPlayerCollisions() {
    const playerEntries = Object.entries(this.state.players);

    for (let i = 0; i < playerEntries.length; i++) {
      for (let j = i + 1; j < playerEntries.length; j++) {
        const [, p1] = playerEntries[i];
        const [, p2] = playerEntries[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = CONSTANTS.PLAYER_RADIUS * 2;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;

          // Bump effect: if a dashing player hits someone holding the pearl, knock it loose
          if (p1.isDashing && p2.hasPearl) {
            this.knockPearlLoose(p2);
          } else if (p2.isDashing && p1.hasPearl) {
            this.knockPearlLoose(p1);
          }
        }
      }
    }
  }

  knockPearlLoose(player) {
    player.hasPearl = false;
    this.state.pearl.state = 'loose';
    this.state.pearl.holderId = null;
    this.state.pearl.x = player.x;
    this.state.pearl.y = player.y;
    this.state.pearl.vx = (Math.random() - 0.5) * 100;
    this.state.pearl.vy = (Math.random() - 0.5) * 100;
  }

  checkPearlInteractions() {
    const pearl = this.state.pearl;

    if (pearl.state === 'flying') {
      // Check interception by opponents
      for (const [id, player] of Object.entries(this.state.players)) {
        const dx = player.x - pearl.x;
        const dy = player.y - pearl.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Teammate catches the pass
        if (player.team === pearl.passTeam && !player.hasPearl && id !== pearl.holderId) {
          if (dist < CONSTANTS.PEARL_INTERCEPT_RADIUS + CONSTANTS.PLAYER_RADIUS) {
            this.givePearl(id, player);
            return;
          }
        }

        // Opponent intercepts
        if (player.team !== pearl.passTeam) {
          if (dist < CONSTANTS.PEARL_INTERCEPT_RADIUS + CONSTANTS.PLAYER_RADIUS * 0.8) {
            this.givePearl(id, player);
            return;
          }
        }
      }
    } else if (pearl.state === 'loose') {
      // Slow down loose pearl
      pearl.vx *= 0.95;
      pearl.vy *= 0.95;
      pearl.x += pearl.vx * (1 / CONSTANTS.SERVER_TICK_RATE);
      pearl.y += pearl.vy * (1 / CONSTANTS.SERVER_TICK_RATE);

      // Keep in bounds
      pearl.x = Math.max(20, Math.min(CONSTANTS.ARENA_WIDTH - 20, pearl.x));
      pearl.y = Math.max(20, Math.min(CONSTANTS.ARENA_HEIGHT - 20, pearl.y));

      // Any player can pick up a loose pearl
      for (const [id, player] of Object.entries(this.state.players)) {
        if (player.hasPearl) continue;
        const dx = player.x - pearl.x;
        const dy = player.y - pearl.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONSTANTS.PEARL_PICKUP_RADIUS + CONSTANTS.PLAYER_RADIUS) {
          this.givePearl(id, player);
          return;
        }
      }
    }
  }

  givePearl(playerId, player) {
    // Remove from anyone else
    Object.values(this.state.players).forEach(p => p.hasPearl = false);

    player.hasPearl = true;
    this.state.pearl.state = 'held';
    this.state.pearl.holderId = playerId;
    this.state.pearl.vx = 0;
    this.state.pearl.vy = 0;
  }

  checkGoals() {
    const pearl = this.state.pearl;

    // Determine pearl effective position and which team is "carrying"
    let pearlX = pearl.x;
    let pearlY = pearl.y;
    let carrierTeam = null;

    if (pearl.state === 'held' && pearl.holderId) {
      const holder = this.state.players[pearl.holderId];
      if (holder) {
        pearlX = holder.x;
        pearlY = holder.y;
        carrierTeam = holder.team;
      }
    }

    const goalR = CONSTANTS.GOAL_RADIUS;

    // Check left goal (team 1's goal - team 2 scores here)
    const dxLeft = pearlX - CONSTANTS.GOAL_TEAM1_X;
    const dyLeft = pearlY - CONSTANTS.GOAL_Y_CENTER;
    if (Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft) < goalR) {
      // Only score if team 2 brought it here (can't score on own goal)
      if (carrierTeam !== 1 || pearl.state !== 'held') {
        this.scoreGoal(2);
        return;
      }
    }

    // Check right goal (team 2's goal - team 1 scores here)
    const dxRight = pearlX - CONSTANTS.GOAL_TEAM2_X;
    const dyRight = pearlY - CONSTANTS.GOAL_Y_CENTER;
    if (Math.sqrt(dxRight * dxRight + dyRight * dyRight) < goalR) {
      if (carrierTeam !== 2 || pearl.state !== 'held') {
        this.scoreGoal(1);
        return;
      }
    }
  }

  scoreGoal(scoringTeam) {
    if (scoringTeam === 1) {
      this.state.scores.team1++;
    } else {
      this.state.scores.team2++;
    }

    this.state.goalPause = CONSTANTS.GOAL_RESET_DELAY;

    this.io.to(this.room.code).emit('goal-scored', {
      scoringTeam,
      scores: { ...this.state.scores }
    });

    console.log(`GOAL! Team ${scoringTeam} scores in room ${this.room.code}. Score: ${this.state.scores.team1}-${this.state.scores.team2}`);

    // Check score limit
    if (this.state.scores.team1 >= CONSTANTS.SCORE_LIMIT || this.state.scores.team2 >= CONSTANTS.SCORE_LIMIT) {
      setTimeout(() => this.endMatch(), CONSTANTS.GOAL_RESET_DELAY * 1000);
    }
  }

  endMatch() {
    this.stop();

    const winningTeam = this.state.scores.team1 > this.state.scores.team2 ? 1 :
                        this.state.scores.team2 > this.state.scores.team1 ? 2 : 0;

    this.io.to(this.room.code).emit('match-ended', {
      winningTeam,
      scores: { ...this.state.scores }
    });

    if (this.onMatchEnd) this.onMatchEnd();
  }

  broadcast() {
    // Build minimal state for network
    const players = {};
    for (const [id, p] of Object.entries(this.state.players)) {
      players[id] = {
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        team: p.team,
        tailColor: p.tailColor,
        name: p.name,
        hasPearl: p.hasPearl,
        isDashing: p.isDashing,
        isBot: p.isBot,
        facingX: Math.round(p.facingX * 100) / 100,
        facingY: Math.round(p.facingY * 100) / 100
      };
    }

    this.io.to(this.room.code).emit('game-state', {
      tick: this.tick,
      timeRemaining: Math.round(this.state.timeRemaining * 10) / 10,
      scores: this.state.scores,
      players,
      pearl: {
        x: Math.round(this.state.pearl.x * 10) / 10,
        y: Math.round(this.state.pearl.y * 10) / 10,
        state: this.state.pearl.state,
        holderId: this.state.pearl.holderId
      },
      goalPause: this.state.goalPause > 0
    });
  }
}

module.exports = GameEngine;
