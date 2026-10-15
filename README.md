# Infinity Tic-Tac-Toe ♾️

A dynamic, high-stakes variation of classic Tic-Tac-Toe where players can only maintain at most **3 active marks** on the board. With real-time turn countdowns, expiring piece visual warnings, and modern cyber-glass aesthetics.

---

## 🎮 How It Works

### 1. The 3-Piece FIFO Rule (First-In, First-Out)
- Each player ($X$ and $O$) can have at most **3 marks** on the board.
- When placing your 4th mark, your **1st (oldest) mark automatically vanishes** from the board, freeing up that cell for anyone to claim.
- Active marks display queue badges (`1`, `2`, `3`) indicating their placement order.

### 2. Expiring Piece Amber Alert ⚠️
- When a player has 3 marks on the board and it becomes their turn, their oldest mark (#1) pulses with an **amber glowing aura** and a warning badge: `[Vanishing Next]`.
- Hovering over an empty cell reveals a real-time ghost preview of the move, dimming the piece that will disappear.

### 3. Blitz Turn Clocks ⏱️
- Configurable per-turn timer (**5s Blitz**, **10s Fast**, **15s Normal**, **30s Relaxed**, or **Off**).
- Circular SVG progress ring around each player's status card.
- Audio clock ticks in the final 3 seconds.
- Running out of time results in a timeout forfeit!

### 4. Competitive Series & Round Setup 🏆
- Configure match length: **Best of 1**, **Best of 3**, **Best of 5**, **Best of 7**, or **Endless**.
- Real-time series win tracking dots on each player's status card.
- Round rotation options: **Alternate turns**, **Winner starts**, or **Always X**.
- Dynamic round winner modal and status banner at the end of each round.

### 5. Centralized Settings Menu ⚙️
- All match configuration, blitz timers, turn order, color themes, and sound settings centralized in a sleek settings hub, keeping the primary game screen clean and distraction-free.

### 6. Zero-Dependency Web Audio 🔊
- Procedurally generated sound effects using the browser's native **Web Audio API** (no external mp3 files required):
  - High-tech chime for $X$, warm resonant tone for $O$
  - Dissolving white-noise swoosh on vanishing pieces
  - Amber warning pulses and ticking clocks
  - Triumphant victory arpeggios

---

## 🚀 How to Run

### Option 1: Direct File Launch
Simply double-click [`index.html`](file:///Users/fazal/Documents/projects/tic-tac-toe/index.html) in macOS Finder or run:
```bash
open index.html
```
The game is completely self-contained and runs immediately in Safari, Chrome, Firefox, or Edge without any server.

### Option 2: Run via Node.js
```bash
npm start
```
Runs a local static server on `http://localhost:3000`.

### Option 3: Run via Python 3
```bash
npm run serve:py
# or directly:
python3 -m http.server 3000
```
Then navigate to: `http://localhost:3000`

---

## 🏗️ Architecture & Extensibility

```
tic-tac-toe/
├── index.html           # Accessible HTML5 structure & SVG rings
├── README.md            # Documentation & instructions
├── css/
│   └── style.css        # Cyber-glassmorphism design system & keyframes
└── js/
    ├── app.js           # Main application coordinator
    ├── core/
    │   ├── GameEngine.js # Pure logic state machine (with .clone() for Minimax)
    │   └── Timer.js      # Precision turn countdown controller
    ├── audio/
    │   └── SoundFX.js    # Procedural Web Audio API sound generator
    └── ui/
        ├── BoardRenderer.js # Grid DOM updates, SVG lines, ghost previews
        └── Confetti.js      # Canvas victory particle burst
```

### Ready for Phase 2 AI Integration:
The `GameEngine` class is completely decoupled from the DOM and includes:
- `engine.clone()`: Deep clones game state for fast tree search.
- `engine.getValidMoves()`: Returns an array of available cell indices.
- `engine.getExpiringPiece(player)`: Returns the index of the piece about to dissolve.
- `engine.checkWin(player)`: Instant 3-in-a-row verification.
This allows seamless drop-in integration for a Minimax or heuristic AI opponent in Phase 2.
