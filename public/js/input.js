const Input = (() => {
  const keys = {};
  const justPressed = {};

  // Touch state
  let touchActive = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let touchCurrentY = 0;
  let touchDirX = 0;
  let touchDirY = 0;
  let touchPass = false;
  let touchDash = false;
  let joystickId = null; // Track which touch is the joystick
  let isMobile = false;

  function init() {
    isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // Keyboard events
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
      if (!keys[e.code]) {
        justPressed[e.code] = true;
      }
      keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      Object.keys(keys).forEach(k => keys[k] = false);
    });

    // Touch events on canvas
    const canvas = document.getElementById('gameCanvas');

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    // Mobile buttons
    const passBtn = document.getElementById('mobilePassBtn');
    const dashBtn = document.getElementById('mobileDashBtn');

    if (passBtn) {
      passBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchPass = true;
        passBtn.classList.add('active');
      });
      passBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        passBtn.classList.remove('active');
      });
    }

    if (dashBtn) {
      dashBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchDash = true;
        dashBtn.classList.add('active');
      });
      dashBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        dashBtn.classList.remove('active');
      });
    }
  }

  function onTouchStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];

    // Only use the first touch as joystick
    if (joystickId === null) {
      joystickId = touch.identifier;
      touchActive = true;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchCurrentX = touch.clientX;
      touchCurrentY = touch.clientY;
      touchDirX = 0;
      touchDirY = 0;

      showJoystick(touch.clientX, touch.clientY);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickId) {
        touchCurrentX = touch.clientX;
        touchCurrentY = touch.clientY;

        const dx = touchCurrentX - touchStartX;
        const dy = touchCurrentY - touchStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const deadzone = 12;
        if (dist > deadzone) {
          touchDirX = dx / dist;
          touchDirY = dy / dist;
        } else {
          touchDirX = 0;
          touchDirY = 0;
        }

        updateJoystick(touchStartX, touchStartY, touchCurrentX, touchCurrentY);
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickId) {
        joystickId = null;
        touchActive = false;
        touchDirX = 0;
        touchDirY = 0;
        hideJoystick();
      }
    }
  }

  // Virtual joystick visual
  let joystickBase = null;
  let joystickKnob = null;

  function showJoystick(x, y) {
    if (!joystickBase) {
      joystickBase = document.createElement('div');
      joystickBase.className = 'joystick-base';
      document.body.appendChild(joystickBase);

      joystickKnob = document.createElement('div');
      joystickKnob.className = 'joystick-knob';
      document.body.appendChild(joystickKnob);
    }
    joystickBase.style.display = 'block';
    joystickKnob.style.display = 'block';
    joystickBase.style.left = (x - 50) + 'px';
    joystickBase.style.top = (y - 50) + 'px';
    joystickKnob.style.left = (x - 22) + 'px';
    joystickKnob.style.top = (y - 22) + 'px';
  }

  function updateJoystick(baseX, baseY, knobX, knobY) {
    if (!joystickKnob) return;
    const dx = knobX - baseX;
    const dy = knobY - baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 45;

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxDist) {
      clampedX = (dx / dist) * maxDist;
      clampedY = (dy / dist) * maxDist;
    }
    joystickKnob.style.left = (baseX + clampedX - 22) + 'px';
    joystickKnob.style.top = (baseY + clampedY - 22) + 'px';
  }

  function hideJoystick() {
    if (joystickBase) joystickBase.style.display = 'none';
    if (joystickKnob) joystickKnob.style.display = 'none';
  }

  function getState() {
    // Combine keyboard and touch
    const threshold = 0.3;
    const state = {
      up: !!(keys['KeyW'] || keys['ArrowUp']) || touchDirY < -threshold,
      down: !!(keys['KeyS'] || keys['ArrowDown']) || touchDirY > threshold,
      left: !!(keys['KeyA'] || keys['ArrowLeft']) || touchDirX < -threshold,
      right: !!(keys['KeyD'] || keys['ArrowRight']) || touchDirX > threshold,
      pass: !!justPressed['Space'] || touchPass,
      dash: !!(justPressed['ShiftLeft'] || justPressed['ShiftRight']) || touchDash
    };

    // Clear one-shot inputs
    justPressed['Space'] = false;
    justPressed['ShiftLeft'] = false;
    justPressed['ShiftRight'] = false;
    touchPass = false;
    touchDash = false;

    return state;
  }

  function getIsMobile() { return isMobile; }

  return { init, getState, getIsMobile };
})();
