const CONSTANTS = require('./constants');

class BotAI {
  constructor(botId, team) {
    this.botId = botId;
    this.team = team;
    this.thinkDelay = 0;
    this.lastDecision = {};
    this.reactionTime = 0.1 + Math.random() * 0.15; // 100-250ms reaction
    this.timeSinceThink = 0;
    this.jitter = { x: 0, y: 0 };
    this.jitterTimer = 0;
  }

  think(gameState) {
    this.timeSinceThink += 1 / CONSTANTS.SERVER_TICK_RATE;

    // Add slight randomness to movement (jitter)
    this.jitterTimer += 1 / CONSTANTS.SERVER_TICK_RATE;
    if (this.jitterTimer > 0.5) {
      this.jitterTimer = 0;
      this.jitter.x = (Math.random() - 0.5) * 0.3;
      this.jitter.y = (Math.random() - 0.5) * 0.3;
    }

    // Don't re-think every tick (simulate reaction time)
    if (this.timeSinceThink < this.reactionTime) {
      return this.lastDecision;
    }
    this.timeSinceThink = 0;

    const me = gameState.players[this.botId];
    if (!me) return {};

    const pearl = gameState.pearl;
    const input = { up: false, down: false, left: false, right: false, pass: false, dash: false };

    // Find teammate and opponents
    let teammate = null;
    const opponents = [];
    for (const [id, p] of Object.entries(gameState.players)) {
      if (id === this.botId) continue;
      if (p.team === this.team) teammate = { id, ...p };
      else opponents.push({ id, ...p });
    }

    // Determine enemy goal position (where we want to score)
    const enemyGoalX = this.team === 1 ? CONSTANTS.ARENA_WIDTH : 0;
    const ownGoalX = this.team === 1 ? 0 : CONSTANTS.ARENA_WIDTH;

    if (me.hasPearl) {
      // I have the pearl - carry it to the enemy goal!
      const distToGoal = Math.abs(me.x - enemyGoalX);

      // Always move toward enemy goal when holding pearl
      this.moveToward(input, me, { x: enemyGoalX, y: CONSTANTS.GOAL_Y_CENTER }, 1.0);

      // Dash when approaching goal
      if (distToGoal < 300 && Math.random() < 0.05) {
        input.dash = true;
      }

      // Only pass if opponent is very close and we're far from goal
      if (distToGoal > 200) {
        const nearestOpponent = this.findNearest(me, opponents);
        const opponentClose = nearestOpponent && this.dist(me, nearestOpponent) < 80;
        if (opponentClose && teammate && Math.random() < 0.4) {
          input.pass = true;
        }
      }
    } else if (pearl.state === 'loose') {
      // Pearl is loose - go get it
      this.moveToward(input, me, pearl, 1.0);

      // Dash toward loose pearl if close
      if (this.dist(me, pearl) < 150 && Math.random() < 0.03) {
        input.dash = true;
      }
    } else if (pearl.state === 'flying') {
      // Pearl is in the air
      if (pearl.passTeam === this.team) {
        // Our team passed - move toward where it's going
        this.moveToward(input, me, { x: pearl.targetX || pearl.x, y: pearl.targetY || pearl.y }, 0.7);
      } else {
        // Enemy passed - try to intercept
        this.moveToward(input, me, pearl, 1.0);
        if (this.dist(me, pearl) < 100) {
          input.dash = true;
        }
      }
    } else if (pearl.state === 'held') {
      const holder = gameState.players[pearl.holderId];
      if (!holder) {
        this.lastDecision = input;
        return input;
      }

      if (holder.team === this.team) {
        // Teammate has the pearl - get open for a pass
        // Move toward enemy goal but keep some distance from teammate
        const targetX = (me.x + enemyGoalX) / 2;
        const targetY = CONSTANTS.GOAL_Y_CENTER + (Math.random() > 0.5 ? 1 : -1) * 120;

        // Don't bunch up with teammate
        if (teammate && this.dist(me, teammate) < 100) {
          const awayX = me.x + (me.x - teammate.x) * 0.5;
          const awayY = me.y + (me.y - teammate.y) * 0.5;
          this.moveToward(input, me, { x: awayX, y: awayY }, 0.6);
        } else {
          this.moveToward(input, me, { x: targetX, y: targetY }, 0.7);
        }
      } else {
        // Opponent has the pearl - defend!
        // Move between holder and our goal
        const defendX = (holder.x + ownGoalX) / 2;
        const defendY = holder.y;
        this.moveToward(input, me, { x: defendX, y: defendY }, 0.9);

        // Dash to intercept if very close
        if (this.dist(me, holder) < 80 && Math.random() < 0.04) {
          input.dash = true;
        }
      }
    }

    // Add jitter
    if (Math.random() < 0.1) {
      if (this.jitter.x > 0.15) input.right = true;
      if (this.jitter.x < -0.15) input.left = true;
      if (this.jitter.y > 0.15) input.down = true;
      if (this.jitter.y < -0.15) input.up = true;
    }

    this.lastDecision = input;
    return input;
  }

  moveToward(input, from, to, urgency) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) return;

    // Add some imperfection
    const threshold = 15 * (1 - urgency);

    if (dx > threshold) input.right = true;
    else if (dx < -threshold) input.left = true;

    if (dy > threshold) input.down = true;
    else if (dy < -threshold) input.up = true;
  }

  findNearest(from, targets) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const t of targets) {
      const d = this.dist(from, t);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }
    return nearest;
  }

  dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

module.exports = BotAI;
