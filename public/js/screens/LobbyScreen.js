const LobbyScreen = (() => {
  let roomCode = '';
  let players = [];
  let myId = '';
  let selectedColor = '';

  function enter(data) {
    roomCode = data.roomCode;
    players = data.players || [];
    myId = data.yourId || Network.getId();

    // Hide game canvas when in lobby
    document.getElementById('gameCanvas').style.display = 'none';

    // Set initial color
    const me = players.find(p => p.id === myId);
    if (me) selectedColor = me.tailColor;

    renderUI();

    Network.on('lobby-update', onLobbyUpdate);
    Network.on('error', onError);
  }

  function onLobbyUpdate(data) {
    players = data.players;
    renderUI();
  }

  function onError(data) {
    // Show error briefly
    const el = document.getElementById('lobbyError');
    if (el) {
      el.textContent = data.message;
      setTimeout(() => { if (el) el.textContent = ''; }, 3000);
    }
  }

  function renderUI() {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'screen';

    const me = players.find(p => p.id === myId);
    const amReady = me ? me.ready : false;

    container.innerHTML = `
      <h2>Lobby</h2>
      <p>Share this code with friends:</p>
      <div class="room-code">${roomCode}</div>

      <div style="margin-bottom: 16px;">
        <p style="margin-bottom: 8px; font-size: 13px;">Choose your tail color:</p>
        <div class="color-picker" id="colorPicker"></div>
      </div>

      <ul class="player-list" id="playerList"></ul>

      <div id="lobbyError" style="color: #FF6B6B; font-size: 13px; min-height: 20px; margin: 8px 0;"></div>

      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button id="btnAddBots" class="btn btn-gold btn-small">${players.length >= 4 ? 'Bots Added' : 'Add Bots'}</button>
        <button id="btnReady" class="btn ${amReady ? 'btn-secondary' : 'btn-primary'}">
          ${amReady ? 'Not Ready' : 'Ready!'}
        </button>
      </div>

      ${players.length === 4 && players.every(p => p.ready)
        ? '<p style="color: #90EE90; margin-top: 12px; font-size: 13px;">All ready! Starting game...</p>'
        : `<p style="color: rgba(255,255,255,0.4); margin-top: 12px; font-size: 12px;">${players.length}/4 players${players.length === 4 ? ' - waiting for everyone to ready up' : ''}</p>`
      }
    `;
    overlay.appendChild(container);

    // Render color picker
    const picker = document.getElementById('colorPicker');
    const usedColors = players.filter(p => p.id !== myId).map(p => p.tailColor);

    CONSTANTS.TAIL_COLORS.forEach(color => {
      const btn = document.createElement('div');
      btn.className = 'color-option' + (color === selectedColor ? ' selected' : '');
      btn.style.backgroundColor = color;
      if (usedColors.includes(color)) {
        btn.style.opacity = '0.3';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.addEventListener('click', () => {
          selectedColor = color;
          Network.emit('select-character', { tailColor: color });
        });
      }
      picker.appendChild(btn);
    });

    // Render player list
    const list = document.getElementById('playerList');
    // Sort: team 1 first, then team 2
    const sorted = [...players].sort((a, b) => a.team - b.team);
    sorted.forEach(p => {
      const li = document.createElement('li');
      li.className = `team${p.team}`;
      li.innerHTML = `
        <span class="player-name">
          <span class="color-dot" style="background-color: ${p.tailColor}"></span>
          ${escapeHtml(p.name)}
          ${p.isBot ? '<span class="bot-badge">BOT</span>' : ''}
          ${p.id === myId ? '<span class="bot-badge" style="background: rgba(255,215,0,0.2); color: #FFD700;">YOU</span>' : ''}
        </span>
        <span>
          Team ${p.team}
          ${p.ready ? '<span class="ready-badge">READY</span>' : ''}
        </span>
      `;
      list.appendChild(li);
    });

    // Button events
    document.getElementById('btnAddBots').addEventListener('click', () => {
      if (players.length < 4) {
        Network.emit('add-bots');
      }
    });
    if (players.length >= 4) {
      document.getElementById('btnAddBots').disabled = true;
    }

    document.getElementById('btnReady').addEventListener('click', () => {
      Network.emit('player-ready');
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function exit() {
    Network.off('lobby-update', onLobbyUpdate);
    Network.off('error', onError);
  }

  function update() {}
  function render() {}

  return { enter, exit, update, render };
})();
