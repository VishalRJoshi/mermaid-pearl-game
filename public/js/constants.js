// KEEP IN SYNC WITH server/constants.js
const CONSTANTS = {
  // Arena
  ARENA_WIDTH: 1200,
  ARENA_HEIGHT: 700,

  // Players
  PLAYER_RADIUS: 22,
  PLAYER_SPEED: 220,
  PLAYER_SPEED_WITH_PEARL: 160,
  DASH_SPEED: 420,
  DASH_DURATION: 0.3,
  DASH_COOLDOWN: 2.0,

  // Pearl
  PEARL_RADIUS: 10,
  PEARL_PASS_SPEED: 380,
  PEARL_INTERCEPT_RADIUS: 28,
  PEARL_PICKUP_RADIUS: 30,

  // Goals
  GOAL_RADIUS: 55,
  GOAL_Y_CENTER: 350,
  GOAL_TEAM1_X: 25,
  GOAL_TEAM2_X: 1175,

  // Match
  MATCH_DURATION: 180,
  GOAL_RESET_DELAY: 2.0,
  COUNTDOWN_DURATION: 3,
  SCORE_LIMIT: 10,

  // Network
  SERVER_TICK_RATE: 30,

  // Spawn positions
  SPAWN_POSITIONS: {
    team1: [
      { x: 250, y: 250 },
      { x: 250, y: 450 }
    ],
    team2: [
      { x: 950, y: 250 },
      { x: 950, y: 450 }
    ]
  },

  // Tail colors
  TAIL_COLORS: [
    '#FF69B4', // Pink
    '#FF6347', // Coral
    '#9370DB', // Purple
    '#00CED1', // Teal
    '#FFD700', // Gold
    '#7CFC00', // Lime
    '#FF8C00', // Orange
    '#87CEEB'  // Sky blue
  ],

  BOT_NAMES: ['Luna', 'Coral', 'Shelly', 'Bubbles', 'Marina', 'Pearl', 'Aqua', 'Starla']
};
