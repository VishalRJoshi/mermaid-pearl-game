const Input = (() => {
  const keys = {};
  const justPressed = {};

  function init() {
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

    // Reset key state on window blur
    window.addEventListener('blur', () => {
      Object.keys(keys).forEach(k => keys[k] = false);
    });
  }

  function getState() {
    const state = {
      up: !!(keys['KeyW'] || keys['ArrowUp']),
      down: !!(keys['KeyS'] || keys['ArrowDown']),
      left: !!(keys['KeyA'] || keys['ArrowLeft']),
      right: !!(keys['KeyD'] || keys['ArrowRight']),
      pass: !!justPressed['Space'],
      dash: !!(justPressed['ShiftLeft'] || justPressed['ShiftRight'])
    };

    // Clear one-shot inputs
    justPressed['Space'] = false;
    justPressed['ShiftLeft'] = false;
    justPressed['ShiftRight'] = false;

    return state;
  }

  return { init, getState };
})();
