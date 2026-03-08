# Mermaid Pearl Game

A 2v2 underwater multiplayer game where mermaids pass a glowing pearl and score in clam goals!

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

## How to Play

1. Enter your name and **Create Room**
2. Click **Add Bots** to fill with AI players (or share the room code with friends)
3. Pick your tail color and hit **Ready!**
4. Score by carrying or passing the pearl into the opposing team's clam goal

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Swim |
| Space | Pass pearl to teammate |
| Shift | Dash (speed boost, 2s cooldown) |

## Multiplayer

To play with friends on other computers:

1. Create a room on one computer
2. Share the 4-letter room code
3. Other players visit `http://<your-ip>:3000` and enter the code to join

Find your IP with `ifconfig` (Mac) or `ipconfig` (Windows).

## Tech Stack

- **Frontend**: HTML5 Canvas, vanilla JavaScript
- **Backend**: Node.js, Express, Socket.IO
- **No build step** - just `npm start`
