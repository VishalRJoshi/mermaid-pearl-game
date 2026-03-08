const Renderer = (() => {
  let canvas, ctx;
  let bubbles = [];
  let seaweedPhase = 0;
  let lightRayPhase = 0;
  let sparkles = [];
  let goalGlow = { team1: 0, team2: 0 };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    canvas.width = CONSTANTS.ARENA_WIDTH;
    canvas.height = CONSTANTS.ARENA_HEIGHT;
    initBubbles();
    initSparkles();
  }

  function initBubbles() {
    bubbles = [];
    for (let i = 0; i < 25; i++) {
      bubbles.push({
        x: Math.random() * CONSTANTS.ARENA_WIDTH,
        y: Math.random() * CONSTANTS.ARENA_HEIGHT,
        r: 2 + Math.random() * 6,
        speed: 10 + Math.random() * 25,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  function initSparkles() {
    sparkles = [];
    for (let i = 0; i < 12; i++) {
      sparkles.push({
        angle: (Math.PI * 2 / 12) * i,
        dist: 0,
        life: Math.random()
      });
    }
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawBackground(dt) {
    // Ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CONSTANTS.ARENA_HEIGHT);
    grad.addColorStop(0, '#0a3d6b');
    grad.addColorStop(0.4, '#0e5a8a');
    grad.addColorStop(1, '#0a2a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONSTANTS.ARENA_WIDTH, CONSTANTS.ARENA_HEIGHT);

    // Light rays from above
    lightRayPhase += dt * 0.15;
    drawLightRays();

    // Sand floor
    drawSandFloor();

    // Coral decorations
    drawCorals();

    // Seaweed
    seaweedPhase += dt * 1.5;
    drawSeaweed();

    // Bubbles
    updateAndDrawBubbles(dt);
  }

  function drawLightRays() {
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 5; i++) {
      const x = 150 + i * 250 + Math.sin(lightRayPhase + i * 0.7) * 30;
      const width = 60 + Math.sin(lightRayPhase * 0.5 + i) * 20;
      ctx.beginPath();
      ctx.moveTo(x - width / 2, 0);
      ctx.lineTo(x + width / 2, 0);
      ctx.lineTo(x + width * 1.5, CONSTANTS.ARENA_HEIGHT);
      ctx.lineTo(x - width, CONSTANTS.ARENA_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = '#87CEEB';
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSandFloor() {
    ctx.save();
    const sandY = CONSTANTS.ARENA_HEIGHT - 40;
    const grad = ctx.createLinearGradient(0, sandY, 0, CONSTANTS.ARENA_HEIGHT);
    grad.addColorStop(0, 'rgba(210, 180, 140, 0.3)');
    grad.addColorStop(1, 'rgba(210, 180, 140, 0.5)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, CONSTANTS.ARENA_HEIGHT);
    for (let x = 0; x <= CONSTANTS.ARENA_WIDTH; x += 40) {
      ctx.lineTo(x, sandY + Math.sin(x * 0.02 + 1.5) * 8);
    }
    ctx.lineTo(CONSTANTS.ARENA_WIDTH, CONSTANTS.ARENA_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCorals() {
    ctx.save();
    // Left coral cluster
    drawCoral(80, CONSTANTS.ARENA_HEIGHT - 55, '#FF6B8A', 0.8);
    drawCoral(120, CONSTANTS.ARENA_HEIGHT - 45, '#FF8C42', 0.6);
    drawCoral(50, CONSTANTS.ARENA_HEIGHT - 40, '#C77DFF', 0.5);

    // Right coral cluster
    drawCoral(CONSTANTS.ARENA_WIDTH - 90, CONSTANTS.ARENA_HEIGHT - 50, '#FF6B8A', 0.7);
    drawCoral(CONSTANTS.ARENA_WIDTH - 130, CONSTANTS.ARENA_HEIGHT - 42, '#FFB347', 0.6);
    drawCoral(CONSTANTS.ARENA_WIDTH - 60, CONSTANTS.ARENA_HEIGHT - 38, '#C77DFF', 0.5);

    // Center-ish decorations
    drawCoral(500, CONSTANTS.ARENA_HEIGHT - 45, '#FF8C42', 0.4);
    drawCoral(700, CONSTANTS.ARENA_HEIGHT - 48, '#C77DFF', 0.5);
    ctx.restore();
  }

  function drawCoral(x, y, color, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;

    // Branch coral shape
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 12, -20, 6, 25, i * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Base
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSeaweed() {
    const positions = [30, 170, 380, 580, 820, 1020, 1140];
    positions.forEach((x, i) => {
      drawSeaweedStrand(x, CONSTANTS.ARENA_HEIGHT - 30, 80 + (i % 3) * 20, i);
    });
  }

  function drawSeaweedStrand(x, y, height, index) {
    ctx.save();
    ctx.strokeStyle = '#2D8B4E';
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    const sway = Math.sin(seaweedPhase + index * 1.2) * 12;
    ctx.quadraticCurveTo(
      x + sway,
      y - height / 2,
      x + sway * 1.3,
      y - height
    );
    ctx.stroke();

    // Second strand slightly offset
    ctx.strokeStyle = '#3DA862';
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    const sway2 = Math.sin(seaweedPhase + index * 1.2 + 0.5) * 10;
    ctx.quadraticCurveTo(
      x + 8 + sway2,
      y - height * 0.4,
      x + 8 + sway2 * 1.2,
      y - height * 0.7
    );
    ctx.stroke();
    ctx.restore();
  }

  function updateAndDrawBubbles(dt) {
    ctx.save();
    bubbles.forEach(b => {
      b.y -= b.speed * dt;
      b.wobble += dt * 2;
      if (b.y < -10) {
        b.y = CONSTANTS.ARENA_HEIGHT + 10;
        b.x = Math.random() * CONSTANTS.ARENA_WIDTH;
      }
      const wx = b.x + Math.sin(b.wobble) * 3;
      ctx.beginPath();
      ctx.arc(wx, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Highlight
      ctx.beginPath();
      ctx.arc(wx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    });
    ctx.restore();
  }

  function drawArena() {
    ctx.save();

    // Arena border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, CONSTANTS.ARENA_WIDTH - 20, CONSTANTS.ARENA_HEIGHT - 20);

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(CONSTANTS.ARENA_WIDTH / 2, 20);
    ctx.lineTo(CONSTANTS.ARENA_WIDTH / 2, CONSTANTS.ARENA_HEIGHT - 20);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(CONSTANTS.ARENA_WIDTH / 2, CONSTANTS.ARENA_HEIGHT / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawClamGoal(x, team, glowIntensity) {
    const y = CONSTANTS.GOAL_Y_CENTER;
    const r = CONSTANTS.GOAL_RADIUS;
    const isLeft = x < CONSTANTS.ARENA_WIDTH / 2;
    const color = team === 1 ? '#FF6B8A' : '#00CED1';

    ctx.save();

    // Glow effect
    if (glowIntensity > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 30 * glowIntensity;
    }

    // Clam shell shape - top half
    ctx.beginPath();
    if (isLeft) {
      ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
    } else {
      ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2);
    }
    ctx.closePath();

    // Shell gradient
    const shellGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    shellGrad.addColorStop(0, '#FFF8DC');
    shellGrad.addColorStop(0.5, '#DEB887');
    shellGrad.addColorStop(1, color);
    ctx.fillStyle = shellGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shell ridges
    ctx.globalAlpha = 0.3;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      if (isLeft) {
        ctx.arc(x, y, r * (i / 4), -Math.PI / 2, Math.PI / 2);
      } else {
        ctx.arc(x, y, r * (i / 4), Math.PI / 2, -Math.PI / 2);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawMermaid(x, y, tailColor, team, name, hasPearl, facingDir, isDashing, isLocalPlayer) {
    ctx.save();
    ctx.translate(x, y);

    const pr = CONSTANTS.PLAYER_RADIUS;

    // Dash effect - bubble trail
    if (isDashing) {
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 4; i++) {
        const bx = -facingDir.x * (10 + i * 12) + (Math.random() - 0.5) * 8;
        const by = -facingDir.y * (10 + i * 12) + (Math.random() - 0.5) * 8;
        ctx.beginPath();
        ctx.arc(bx, by, 3 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Tail
    const tailWave = Math.sin(Date.now() * 0.008) * 8;
    const tailDir = Math.atan2(facingDir.y, facingDir.x);

    ctx.save();
    ctx.rotate(tailDir + Math.PI);
    ctx.beginPath();
    ctx.moveTo(pr * 0.5, 0);
    ctx.quadraticCurveTo(pr * 1.2, tailWave, pr * 1.8, tailWave * 1.5);
    ctx.quadraticCurveTo(pr * 2.2, tailWave * 1.8 + 8, pr * 2.5, tailWave * 1.2);
    ctx.quadraticCurveTo(pr * 2.2, tailWave * 1.8 - 8, pr * 1.8, tailWave * 1.5);
    ctx.quadraticCurveTo(pr * 1.2, tailWave, pr * 0.5, 0);
    ctx.fillStyle = tailColor;
    ctx.fill();

    // Tail fin
    ctx.beginPath();
    ctx.moveTo(pr * 2.3, tailWave * 1.2);
    ctx.quadraticCurveTo(pr * 2.8, tailWave * 1.2 - 14, pr * 3, tailWave * 1.2 - 10);
    ctx.quadraticCurveTo(pr * 2.8, tailWave * 1.2, pr * 3, tailWave * 1.2 + 10);
    ctx.quadraticCurveTo(pr * 2.8, tailWave * 1.2 + 14, pr * 2.3, tailWave * 1.2);
    ctx.fillStyle = tailColor;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Body glow for local player
    if (isLocalPlayer) {
      ctx.beginPath();
      ctx.arc(0, 0, pr + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
    }

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, pr);
    bodyGrad.addColorStop(0, '#FFEFD5');
    bodyGrad.addColorStop(0.7, '#FFDAB9');
    bodyGrad.addColorStop(1, darkenColor(tailColor, 0.3));
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes
    const eyeOffsetX = facingDir.x * 3;
    const eyeOffsetY = facingDir.y * 3;
    // Left eye
    ctx.beginPath();
    ctx.arc(-6 + eyeOffsetX, -4 + eyeOffsetY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-5 + eyeOffsetX, -5 + eyeOffsetY, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(6 + eyeOffsetX, -4 + eyeOffsetY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7 + eyeOffsetX, -5 + eyeOffsetY, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Smile
    ctx.beginPath();
    ctx.arc(eyeOffsetX, 2 + eyeOffsetY, 5, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = '#c07060';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Team indicator ring
    const teamColor = team === 1 ? '#FF6B8A' : '#00CED1';
    ctx.beginPath();
    ctx.arc(0, 0, pr + 2, 0, Math.PI * 2);
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();

    // Name label
    if (name) {
      ctx.save();
      ctx.font = '600 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillText(name, x, y - pr - 10);
      ctx.fillStyle = '#fff';
      ctx.fillText(name, x - 1, y - pr - 11);
      ctx.restore();
    }
  }

  function drawPearl(x, y, state, time) {
    ctx.save();
    ctx.translate(x, y);

    const r = CONSTANTS.PEARL_RADIUS;
    const pulse = 1 + Math.sin(time * 4) * 0.08;

    // Outer glow
    ctx.shadowColor = '#FFE4B5';
    ctx.shadowBlur = 18 + Math.sin(time * 3) * 5;

    // Pearl body
    ctx.beginPath();
    ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
    const pearlGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, r * pulse);
    pearlGrad.addColorStop(0, '#FFFFFF');
    pearlGrad.addColorStop(0.4, '#FFF8DC');
    pearlGrad.addColorStop(0.8, '#FFE4B5');
    pearlGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = pearlGrad;
    ctx.fill();

    ctx.shadowBlur = 0;

    // Sparkle highlight
    ctx.beginPath();
    ctx.arc(-2, -3, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    // Sparkle particles around pearl
    if (state === 'flying') {
      for (let i = 0; i < 6; i++) {
        const angle = (time * 3) + (Math.PI * 2 / 6) * i;
        const dist = r * 2 + Math.sin(time * 5 + i) * 4;
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawHUD(scores, timeRemaining, countdown) {
    ctx.save();

    if (countdown !== null && countdown !== undefined) {
      // Countdown overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, CONSTANTS.ARENA_WIDTH, CONSTANTS.ARENA_HEIGHT);

      ctx.font = '900 120px Fredoka One, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = countdown === 0 ? 'SWIM!' : countdown.toString();
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(text, CONSTANTS.ARENA_WIDTH / 2 + 3, CONSTANTS.ARENA_HEIGHT / 2 + 3);
      // Text
      ctx.fillStyle = countdown === 0 ? '#FFD700' : '#FFFFFF';
      ctx.fillText(text, CONSTANTS.ARENA_WIDTH / 2, CONSTANTS.ARENA_HEIGHT / 2);
      ctx.restore();
      return;
    }

    // Score panel background
    const panelWidth = 280;
    const panelHeight = 44;
    const panelX = (CONSTANTS.ARENA_WIDTH - panelWidth) / 2;
    const panelY = 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 22);
    ctx.fill();

    // Team 1 score
    ctx.font = '700 20px Fredoka One, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#FF6B8A';
    ctx.fillText(scores.team1.toString(), panelX + 50, panelY + panelHeight / 2);

    // VS
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '600 14px Nunito, sans-serif';
    ctx.fillText('vs', panelX + panelWidth / 2, panelY + panelHeight / 2);

    // Team 2 score
    ctx.fillStyle = '#00CED1';
    ctx.font = '700 20px Fredoka One, sans-serif';
    ctx.fillText(scores.team2.toString(), panelX + panelWidth - 50, panelY + panelHeight / 2);

    // Timer
    const mins = Math.floor(timeRemaining / 60);
    const secs = Math.floor(timeRemaining % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    roundRect(ctx, CONSTANTS.ARENA_WIDTH / 2 - 35, panelY + panelHeight + 6, 70, 26, 13);
    ctx.fill();

    ctx.font = '600 14px Nunito, sans-serif';
    ctx.fillStyle = timeRemaining < 30 ? '#FF6B6B' : '#FFFFFF';
    ctx.fillText(timeStr, CONSTANTS.ARENA_WIDTH / 2, panelY + panelHeight + 19);

    ctx.restore();
  }

  function drawGoalScoredOverlay(scoringTeam, time) {
    ctx.save();
    const alpha = Math.max(0, 1 - time / 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * alpha})`;
    ctx.fillRect(0, 0, CONSTANTS.ARENA_WIDTH, CONSTANTS.ARENA_HEIGHT);

    ctx.font = '900 60px Fredoka One, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const color = scoringTeam === 1 ? '#FF6B8A' : '#00CED1';
    const scale = 1 + Math.sin(time * 8) * 0.05;
    ctx.save();
    ctx.translate(CONSTANTS.ARENA_WIDTH / 2, CONSTANTS.ARENA_HEIGHT / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillText('GOAL!', 3, 3);
    ctx.fillStyle = color;
    ctx.fillText('GOAL!', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  // Utility functions
  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function darkenColor(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
  }

  function getContext() { return ctx; }
  function getCanvas() { return canvas; }

  return {
    init,
    clear,
    drawBackground,
    drawArena,
    drawClamGoal,
    drawMermaid,
    drawPearl,
    drawHUD,
    drawGoalScoredOverlay,
    getContext,
    getCanvas
  };
})();
