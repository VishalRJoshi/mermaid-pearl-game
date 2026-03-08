const TitleScreen = (() => {
  let container = null;
  let errorMsg = '';

  function enter() {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    // Background bubbles
    for (let i = 0; i < 15; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'bg-bubble';
      const size = 10 + Math.random() * 40;
      bubble.style.width = size + 'px';
      bubble.style.height = size + 'px';
      bubble.style.left = Math.random() * 100 + '%';
      bubble.style.animationDuration = (8 + Math.random() * 12) + 's';
      bubble.style.animationDelay = Math.random() * 8 + 's';
      overlay.appendChild(bubble);
    }

    container = document.createElement('div');
    container.className = 'screen';
    container.innerHTML = `
      <h1>Mermaid Pearl</h1>
      <p class="subtitle">A magical underwater adventure!</p>
      <input id="playerName" class="input-field" type="text" placeholder="Enter your name" maxlength="12" autocomplete="off">
      <div id="errorMsg" style="color: #FF6B6B; font-size: 13px; min-height: 20px; margin-bottom: 8px;"></div>
      <div style="margin-bottom: 12px;">
        <button id="btnCreate" class="btn btn-primary">Create Room</button>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; justify-content: center;">
        <input id="roomCodeInput" class="input-field" type="text" placeholder="Room code" maxlength="4" style="width: 140px; text-transform: uppercase; margin-bottom: 0;">
        <button id="btnJoin" class="btn btn-secondary">Join</button>
      </div>
    `;
    overlay.appendChild(container);

    // Focus name input
    setTimeout(() => document.getElementById('playerName').focus(), 100);

    // Event listeners
    document.getElementById('btnCreate').addEventListener('click', handleCreate);
    document.getElementById('btnJoin').addEventListener('click', handleJoin);

    // Enter key on room code input
    document.getElementById('roomCodeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleJoin();
    });
    document.getElementById('playerName').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreate();
    });

    // Listen for errors
    Network.on('error', onError);
  }

  function handleCreate() {
    const name = document.getElementById('playerName').value.trim();
    if (!name) {
      showError('Please enter your name!');
      return;
    }
    Network.emit('create-room', { playerName: name });
  }

  function handleJoin() {
    const name = document.getElementById('playerName').value.trim();
    const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (!name) {
      showError('Please enter your name!');
      return;
    }
    if (!code || code.length < 4) {
      showError('Please enter a 4-letter room code!');
      return;
    }
    Network.emit('join-room', { roomCode: code, playerName: name });
  }

  function onError(data) {
    showError(data.message);
  }

  function showError(msg) {
    const el = document.getElementById('errorMsg');
    if (el) el.textContent = msg;
    setTimeout(() => {
      if (el) el.textContent = '';
    }, 3000);
  }

  function exit() {
    Network.off('error', onError);
  }

  function update() {}
  function render() {}

  return { enter, exit, update, render };
})();
