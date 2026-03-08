const EndScreen = (() => {
  function enter(data) {
    const { winningTeam, scores } = data;

    // Hide game canvas
    document.getElementById('gameCanvas').style.display = 'none';

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'screen end-screen';

    const teamName = winningTeam === 1 ? 'Team Pink' : winningTeam === 2 ? 'Team Teal' : 'Nobody';
    const teamColor = winningTeam === 1 ? '#FF6B8A' : winningTeam === 2 ? '#00CED1' : '#FFD700';
    const message = winningTeam === 0 ? "It's a Tie!" : `${teamName} Wins!`;

    container.innerHTML = `
      <h1>Game Over!</h1>
      <div class="winner-text" style="color: ${teamColor}">${message}</div>
      <div class="final-score">
        <span class="team1-score">${scores.team1}</span>
        <span class="vs">-</span>
        <span class="team2-score">${scores.team2}</span>
      </div>
      <p style="margin-bottom: 24px;">Great game, mermaids!</p>
      <div>
        <button id="btnPlayAgain" class="btn btn-primary">Play Again</button>
        <button id="btnBackToLobby" class="btn btn-secondary">Back to Lobby</button>
      </div>
    `;
    overlay.appendChild(container);

    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      Network.emit('play-again');
    });
    document.getElementById('btnBackToLobby').addEventListener('click', () => {
      Network.emit('return-to-lobby');
    });
  }

  function exit() {}
  function update() {}
  function render() {}

  return { enter, exit, update, render };
})();
