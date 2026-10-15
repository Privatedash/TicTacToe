/**
 * Infinity Tic-Tac-Toe - Unified Application Engine & Controller
 * Clean, zero-dependency bundle supporting both file:// and http:// execution.
 */

// ============================================================================
// 1. GAME ENGINE - Core Rules & FIFO State Machine
// ============================================================================

const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 0
  [3, 4, 5], // Row 1
  [6, 7, 8], // Row 2
  [0, 3, 6], // Col 0
  [1, 4, 7], // Col 1
  [2, 5, 8], // Col 2
  [0, 4, 8], // Diagonal 1
  [2, 4, 6]  // Diagonal 2
];

class GameEngine {
  constructor() {
    this.MAX_PIECES_PER_PLAYER = 3;
    this.reset();
  }

  reset(startingPlayer = 'X') {
    this.board = Array(9).fill(null);
    this.pieces = { X: [], O: [] };
    this.currentPlayer = startingPlayer;
    this.winner = null;
    this.winningLine = null;
    this.isGameOver = false;
    this.totalMoves = 0;
    this.lastVanished = null;
  }

  getPlayerPieces(player) {
    return [...this.pieces[player]];
  }

  getExpiringPiece(player = this.currentPlayer) {
    if (this.pieces[player].length === this.MAX_PIECES_PER_PLAYER) {
      return this.pieces[player][0];
    }
    return null;
  }

  isValidMove(cellIndex) {
    if (this.isGameOver) return false;
    if (cellIndex < 0 || cellIndex > 8) return false;
    return this.board[cellIndex] === null;
  }

  getValidMoves() {
    if (this.isGameOver) return [];
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) moves.push(i);
    }
    return moves;
  }

  makeMove(cellIndex) {
    if (!this.isValidMove(cellIndex)) {
      return { success: false, reason: 'Invalid or occupied cell' };
    }

    const player = this.currentPlayer;
    let vanishedIndex = null;

    // 1. If player already has 3 pieces, their oldest piece vanishes (FIFO)
    if (this.pieces[player].length >= this.MAX_PIECES_PER_PLAYER) {
      vanishedIndex = this.pieces[player].shift();
      this.board[vanishedIndex] = null;
      this.lastVanished = { player, index: vanishedIndex };
    } else {
      this.lastVanished = null;
    }

    // 2. Place new piece on board and in player's queue
    this.board[cellIndex] = player;
    this.pieces[player].push(cellIndex);
    this.totalMoves++;

    // 3. Evaluate Win Condition
    const winResult = this.checkWin(player);
    if (winResult) {
      this.isGameOver = true;
      this.winner = player;
      this.winningLine = winResult;
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return {
      success: true,
      player,
      placedIndex: cellIndex,
      vanishedIndex,
      isWin: this.isGameOver,
      winner: this.winner,
      winningLine: this.winningLine,
      nextPlayer: this.currentPlayer,
      nextExpiringPiece: this.getExpiringPiece(this.currentPlayer)
    };
  }

  checkWin(player) {
    const playerPieces = new Set(this.pieces[player]);
    if (playerPieces.size < 3) return null;

    for (const combination of WINNING_COMBINATIONS) {
      if (combination.every(idx => playerPieces.has(idx))) {
        return combination;
      }
    }
    return null;
  }

  forfeit(timedOutPlayer) {
    this.isGameOver = true;
    this.winner = timedOutPlayer === 'X' ? 'O' : 'X';
    this.winningLine = null;
    return {
      winner: this.winner,
      reason: 'timeout'
    };
  }

  clone() {
    const cloned = new GameEngine();
    cloned.board = [...this.board];
    cloned.pieces = {
      X: [...this.pieces.X],
      O: [...this.pieces.O]
    };
    cloned.currentPlayer = this.currentPlayer;
    cloned.winner = this.winner;
    cloned.winningLine = this.winningLine ? [...this.winningLine] : null;
    cloned.isGameOver = this.isGameOver;
    cloned.totalMoves = this.totalMoves;
    return cloned;
  }
}

// ============================================================================
// 2. TURN TIMER - Clock Countdown with Warning & Timeout Callbacks
// ============================================================================

class TurnTimer {
  constructor({ durationSeconds = 10, onTick = () => {}, onTimeout = () => {}, onWarning = () => {} }) {
    this.durationSeconds = durationSeconds;
    this.timeLeft = durationSeconds;
    this.currentPlayer = 'X';
    this.intervalId = null;
    this.isRunning = false;
    this.hasWarned = false;

    this.onTick = onTick;
    this.onTimeout = onTimeout;
    this.onWarning = onWarning;

    this.TICK_INTERVAL_MS = 100;
  }

  setDuration(seconds) {
    this.durationSeconds = Number(seconds);
    this.reset(this.currentPlayer);
  }

  start(player) {
    this.stop();
    this.currentPlayer = player;
    this.timeLeft = this.durationSeconds;
    this.hasWarned = false;

    if (this.durationSeconds <= 0) {
      this.isRunning = false;
      this.onTick(this.currentPlayer, 0, 0);
      return;
    }

    this.isRunning = true;
    let lastTimestamp = performance.now();

    this.onTick(this.currentPlayer, this.timeLeft, this.durationSeconds);

    this.intervalId = setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      this.timeLeft = Math.max(0, this.timeLeft - deltaSeconds);
      this.onTick(this.currentPlayer, this.timeLeft, this.durationSeconds);

      if (this.timeLeft <= 3.0 && !this.hasWarned) {
        this.hasWarned = true;
        this.onWarning(this.currentPlayer, this.timeLeft);
      }

      if (this.timeLeft <= 0) {
        this.stop();
        this.onTimeout(this.currentPlayer);
      }
    }, this.TICK_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  reset(player = this.currentPlayer) {
    this.stop();
    this.currentPlayer = player;
    this.timeLeft = this.durationSeconds;
    this.hasWarned = false;
    this.onTick(this.currentPlayer, this.timeLeft, this.durationSeconds);
  }
}

// ============================================================================
// 3. PROCEDURAL SOUND EFFECTS - Web Audio API Synthesizer
// ============================================================================

class SoundFX {
  constructor() {
    this.audioCtx = null;
    this.isMuted = typeof localStorage !== 'undefined' ? localStorage.getItem('ttt_infinity_sound') === 'muted' : false;
    this.masterGain = null;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContext = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
      if (AudioContext) {
        this.audioCtx = new AudioContext();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ttt_infinity_sound', this.isMuted ? 'muted' : 'unmuted');
    }
    return this.isMuted;
  }

  playMove(player) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    if (player === 'X') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);
    }

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playVanish() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 0.15;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.15);

    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.16);
  }

  playTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(783.99, now + 0.08); // G5

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playWin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  }

  playTimeout() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playReset() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const notes = [440, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.15, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  }
}

// ============================================================================
// 4. CONFETTI CELEBRATION EMITTER
// ============================================================================

class Confetti {
  constructor(canvasId = 'confetti-canvas') {
    this.canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : null;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animationId = null;

    if (this.canvas && typeof window !== 'undefined') {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas || typeof window === 'undefined') return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  launch(winner) {
    if (!this.canvas || !this.ctx || typeof window === 'undefined') return;
    this.resize();

    const colors = winner === 'X' 
      ? ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#ffffff']
      : ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#ffffff'];

    this.particles = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: this.canvas.height * 0.45,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 15 - 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        opacity: 1,
        fadeSpeed: 0.008 + Math.random() * 0.008
      });
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  loop() {
    if (!this.ctx || typeof window === 'undefined') return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.fadeSpeed;

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.loop());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.animationId = null;
    }
  }

  stop() {
    if (this.animationId && typeof window !== 'undefined') {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.particles = [];
  }
}

// ============================================================================
// 5. BOARD RENDERER - DOM & Visual Presentation
// ============================================================================

class BoardRenderer {
  constructor() {
    if (typeof document === 'undefined') return;

    this.boardEl = document.getElementById('game-board');
    this.cells = Array.from(document.querySelectorAll('.cell'));
    this.winningLineEl = document.getElementById('winning-line');
    this.winningSvgEl = document.getElementById('winning-line-svg');

    this.cardX = document.getElementById('player-card-x');
    this.cardO = document.getElementById('player-card-o');
    this.timerValX = document.getElementById('timer-val-x');
    this.timerValO = document.getElementById('timer-val-o');
    this.timerRingX = document.getElementById('timer-ring-x');
    this.timerRingO = document.getElementById('timer-ring-o');

    this.turnBanner = document.getElementById('turn-banner');
    this.turnMessage = document.getElementById('turn-message');
    this.vanishingBadge = document.getElementById('vanishing-hint-badge');
    this.bannerNextBtn = document.getElementById('banner-next-btn');
    this.footerNextBtn = document.getElementById('footer-next-btn');

    this.formatBadge = document.getElementById('match-format-badge');
    this.roundNumberEl = document.getElementById('round-number');
    this.roundMaxWrap = document.getElementById('round-max-wrap');
    this.roundMaxEl = document.getElementById('round-max');
    this.matchDotsX = document.getElementById('match-dots-x');
    this.matchDotsO = document.getElementById('match-dots-o');

    this.RING_CIRCUMFERENCE = 276.46; // 2 * PI * 44
  }

  bindCellEvents({ onCellClick, onCellHover, onCellLeave }) {
    if (!this.cells) return;
    this.cells.forEach(cell => {
      const idx = Number(cell.dataset.index);
      cell.addEventListener('click', () => onCellClick(idx));
      cell.addEventListener('mouseenter', () => onCellHover(idx));
      cell.addEventListener('mouseleave', () => onCellLeave(idx));
    });
  }

  renderBoard(engine, roundWinner = null, isMatchOver = false, currentRound = 1) {
    if (!this.cells) return;
    const expiringPiece = engine.getExpiringPiece(engine.currentPlayer);

    this.cells.forEach((cell, idx) => {
      const mark = engine.board[idx];
      cell.className = 'cell';
      cell.innerHTML = '';

      if (mark) {
        cell.classList.add('taken', mark === 'X' ? 'cell-x' : 'cell-o');

        const playerQueue = engine.pieces[mark];
        const queuePosition = playerQueue.indexOf(idx);
        const badgeNum = queuePosition !== -1 ? queuePosition + 1 : '';

        const isExpiring = !engine.isGameOver && idx === expiringPiece;
        if (isExpiring) {
          cell.classList.add('expiring');
        }

        cell.innerHTML = `
          <span class="mark-symbol">${mark === 'X' ? '✕' : '◯'}</span>
          <span class="piece-badge" title="Queue Position #${badgeNum}">${badgeNum}</span>
        `;
      }
    });

    this.updateTurnBanner(engine, roundWinner, isMatchOver, currentRound);
    this.updatePieceSlots(engine);
    this.updatePlayerCards(engine, roundWinner);
  }

  renderMatchDots(scores, bestOf, targetWins) {
    const renderForPlayer = (container, player) => {
      if (!container) return;
      container.innerHTML = '';
      if (!bestOf || bestOf === 0) return;

      const playerWins = scores[player] || 0;
      for (let i = 0; i < targetWins; i++) {
        const dot = document.createElement('div');
        dot.className = 'match-dot' + (i < playerWins ? ' filled' : '');
        dot.setAttribute('title', `Win ${i + 1} of ${targetWins}`);
        container.appendChild(dot);
      }
    };

    renderForPlayer(this.matchDotsX, 'X');
    renderForPlayer(this.matchDotsO, 'O');
  }

  updateVersusHeader(currentRound, bestOf) {
    if (this.formatBadge) {
      this.formatBadge.textContent = !bestOf || bestOf === 0 ? 'Endless' : `Best of ${bestOf}`;
    }
    if (this.roundNumberEl) {
      this.roundNumberEl.textContent = currentRound;
    }
    if (this.roundMaxWrap && this.roundMaxEl) {
      if (bestOf && bestOf > 0) {
        this.roundMaxWrap.classList.remove('hidden');
        this.roundMaxEl.textContent = bestOf;
      } else {
        this.roundMaxWrap.classList.add('hidden');
      }
    }
  }

  animateVanishing(cellIndex) {
    const cell = this.cells[cellIndex];
    if (!cell) return Promise.resolve();

    cell.classList.add('dissolving');
    return new Promise(resolve => {
      setTimeout(() => {
        cell.classList.remove('dissolving');
        resolve();
      }, 420);
    });
  }

  showHoverPreview(idx, engine) {
    if (engine.isGameOver || !engine.isValidMove(idx)) return;

    const cell = this.cells[idx];
    if (!cell) return;
    const player = engine.currentPlayer;
    cell.classList.add(player === 'X' ? 'ghost-x' : 'ghost-o');

    const expiringIndex = engine.getExpiringPiece(player);
    if (expiringIndex !== null && this.cells[expiringIndex]) {
      this.cells[expiringIndex].classList.add('preview-dissolve');
    }
  }

  clearHoverPreview(idx, engine) {
    const cell = this.cells[idx];
    if (cell) {
      cell.classList.remove('ghost-x', 'ghost-o');
    }

    const expiringIndex = engine.getExpiringPiece(engine.currentPlayer);
    if (expiringIndex !== null && this.cells[expiringIndex]) {
      this.cells[expiringIndex].classList.remove('preview-dissolve');
    }
  }

  updateTurnBanner(engine, roundWinner = null, isMatchOver = false, currentRound = 1) {
    if (!this.turnBanner || !this.turnMessage) return;

    if (engine.isGameOver) {
      const winner = roundWinner || engine.winner || 'X';
      const isX = winner === 'X';
      this.turnBanner.classList.toggle('banner-turn-x', isX);
      this.turnBanner.classList.toggle('banner-turn-o', !isX);

      if (isMatchOver) {
        this.turnMessage.textContent = `🏆 MATCH CHAMPION: Player ${winner}! 👑`;
      } else {
        this.turnMessage.textContent = `🏆 Player ${winner} Wins Round ${currentRound}! 🎉`;
      }

      if (this.vanishingBadge) this.vanishingBadge.classList.add('hidden');
      if (this.bannerNextBtn) {
        const span = this.bannerNextBtn.querySelector('span');
        if (span) span.textContent = isMatchOver ? 'New Match 🏆' : 'Next Round';
        this.bannerNextBtn.classList.remove('hidden');
      }
      if (this.footerNextBtn) {
        this.footerNextBtn.classList.remove('hidden');
        this.footerNextBtn.innerHTML = `
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          ${isMatchOver ? 'New Match 🏆' : 'Next Round'}
        `;
      }
      return;
    }

    const isX = engine.currentPlayer === 'X';
    this.turnBanner.classList.toggle('banner-turn-x', isX);
    this.turnBanner.classList.toggle('banner-turn-o', !isX);

    if (this.bannerNextBtn) this.bannerNextBtn.classList.add('hidden');
    if (this.footerNextBtn) this.footerNextBtn.classList.add('hidden');

    const currentPieceCount = engine.pieces[engine.currentPlayer].length;
    if (engine.totalMoves === 0) {
      this.turnMessage.textContent = `Player ${engine.currentPlayer}'s Turn • Click to place mark`;
    } else {
      this.turnMessage.textContent = `Player ${engine.currentPlayer}'s Turn • Place mark #${currentPieceCount + 1 <= 3 ? currentPieceCount + 1 : '4 (Replaces #1)'}`;
    }

    const expiring = engine.getExpiringPiece(engine.currentPlayer);
    if (expiring !== null && this.vanishingBadge) {
      this.vanishingBadge.classList.remove('hidden');
    } else if (this.vanishingBadge) {
      this.vanishingBadge.classList.add('hidden');
    }
  }

  updatePlayerCards(engine, roundWinner = null) {
    if (!this.cardX || !this.cardO) return;
    const isX = engine.currentPlayer === 'X';
    this.cardX.classList.toggle('active', isX && !engine.isGameOver);
    this.cardO.classList.toggle('active', !isX && !engine.isGameOver);

    this.cardX.classList.toggle('round-winner', roundWinner === 'X');
    this.cardO.classList.toggle('round-winner', roundWinner === 'O');
  }

  updatePieceSlots(engine) {
    ['X', 'O'].forEach(player => {
      const count = engine.pieces[player].length;
      const isTurn = engine.currentPlayer === player && !engine.isGameOver;

      for (let i = 0; i < 3; i++) {
        const dot = document.getElementById(`slot-${player.toLowerCase()}-${i}`);
        if (!dot) continue;

        dot.classList.toggle('filled', i < count);
        dot.classList.toggle('expiring', isTurn && count === 3 && i === 0);
      }

      const label = document.querySelector(`.player-${player.toLowerCase()} .slot-label`);
      if (label) {
        label.textContent = `${count}/3`;
      }
    });
  }

  updateTimer(player, timeLeft, totalTime) {
    const ringEl = player === 'X' ? this.timerRingX : this.timerRingO;
    const valEl = player === 'X' ? this.timerValX : this.timerValO;
    const cardEl = player === 'X' ? this.cardX : this.cardO;

    if (!ringEl || !valEl || !cardEl) return;

    if (totalTime <= 0) {
      valEl.textContent = '∞';
      ringEl.style.strokeDashoffset = '0';
      cardEl.classList.remove('warning', 'critical');
      ringEl.classList.remove('timer-warning', 'timer-critical');
      return;
    }

    const progressRatio = Math.max(0, timeLeft / totalTime);
    const offset = this.RING_CIRCUMFERENCE * (1 - progressRatio);
    ringEl.style.strokeDashoffset = offset.toFixed(2);

    valEl.textContent = `${timeLeft.toFixed(1)}s`;

    const isWarning = timeLeft <= 5.0 && timeLeft > 2.5;
    const isCritical = timeLeft <= 2.5;

    cardEl.classList.toggle('warning', isWarning);
    cardEl.classList.toggle('critical', isCritical);

    ringEl.classList.toggle('timer-warning', isWarning);
    ringEl.classList.toggle('timer-critical', isCritical);
  }

  resetTimers(durationSeconds) {
    if (this.timerRingX) {
      this.timerRingX.style.strokeDashoffset = '0';
      this.timerRingX.classList.remove('timer-warning', 'timer-critical');
    }
    if (this.timerRingO) {
      this.timerRingO.style.strokeDashoffset = '0';
      this.timerRingO.classList.remove('timer-warning', 'timer-critical');
    }
    if (this.cardX) this.cardX.classList.remove('warning', 'critical');
    if (this.cardO) this.cardO.classList.remove('warning', 'critical');

    const displayVal = durationSeconds <= 0 ? '∞' : `${durationSeconds.toFixed(1)}s`;
    if (this.timerValX) this.timerValX.textContent = displayVal;
    if (this.timerValO) this.timerValO.textContent = displayVal;
  }

  drawWinningLine(lineIndices, winner) {
    if (!lineIndices || lineIndices.length < 3 || !this.winningLineEl || !this.boardEl) return;

    lineIndices.forEach(idx => {
      if (this.cells[idx]) {
        this.cells[idx].classList.add('winner-cell');
      }
    });

    const startCell = this.cells[lineIndices[0]];
    const endCell = this.cells[lineIndices[2]];
    if (!startCell || !endCell) return;

    const boardRect = this.boardEl.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    const scaleX = 300 / boardRect.width;
    const scaleY = 300 / boardRect.height;

    const x1 = (startRect.left + startRect.width / 2 - boardRect.left) * scaleX;
    const y1 = (startRect.top + startRect.height / 2 - boardRect.top) * scaleY;
    const x2 = (endRect.left + endRect.width / 2 - boardRect.left) * scaleX;
    const y2 = (endRect.top + endRect.height / 2 - boardRect.top) * scaleY;

    this.winningLineEl.setAttribute('x1', x1.toFixed(1));
    this.winningLineEl.setAttribute('y1', y1.toFixed(1));
    this.winningLineEl.setAttribute('x2', x2.toFixed(1));
    this.winningLineEl.setAttribute('y2', y2.toFixed(1));

    this.winningSvgEl.setAttribute('class', `winning-line-svg winning-${winner.toLowerCase()}`);
    this.winningLineEl.style.strokeDashoffset = '0';
  }

  clearWinningLine() {
    if (this.winningLineEl) {
      this.winningLineEl.style.transition = 'none';
      this.winningLineEl.setAttribute('x1', '0');
      this.winningLineEl.setAttribute('y1', '0');
      this.winningLineEl.setAttribute('x2', '0');
      this.winningLineEl.setAttribute('y2', '0');
      this.winningLineEl.style.strokeDashoffset = '450';
      // Force repaint to make change instantaneous
      void this.winningLineEl.offsetWidth;
      this.winningLineEl.style.transition = 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    if (this.winningSvgEl) {
      this.winningSvgEl.setAttribute('class', 'winning-line-svg');
    }
    if (this.cells) {
      this.cells.forEach(c => c.classList.remove('winner-cell'));
    }
  }
}

// ============================================================================
// 6. MAIN APP ORCHESTRATOR
// ============================================================================

class App {
  constructor() {
    this.engine = new GameEngine();
    this.renderer = new BoardRenderer();
    this.sound = new SoundFX();
    this.confetti = new Confetti();

    this.scores = { X: 0, O: 0 };
    this.currentRound = 1;
    this.roundMoves = 0;
    this.roundWinner = null;
    this.isMatchOver = false;
    this.lastStartingPlayer = 'X';

    this.winTimeoutId = null;
    this.isProcessingMove = false;
    this.hasStarted = false;

    // Load persisted settings or defaults
    const savedBestOf = typeof localStorage !== 'undefined' ? localStorage.getItem('ttt_infinity_best_of') : null;
    this.bestOf = savedBestOf !== null ? Number(savedBestOf) : 3;
    this.targetWins = this.bestOf > 0 ? Math.ceil(this.bestOf / 2) : Infinity;

    const savedTimer = typeof localStorage !== 'undefined' ? localStorage.getItem('ttt_infinity_timer') : null;
    this.turnDuration = savedTimer !== null ? Number(savedTimer) : 10;

    this.turnOrder = (typeof localStorage !== 'undefined' && localStorage.getItem('ttt_infinity_turn_order')) || 'alternate';

    // Theme Management (Defaults to Light)
    this.currentTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('ttt_infinity_theme')) || 'light';
    this.applyTheme(this.currentTheme);

    this.timer = new TurnTimer({
      durationSeconds: this.turnDuration,
      onTick: (player, timeLeft, totalTime) => {
        this.renderer.updateTimer(player, timeLeft, totalTime);
        if (totalTime > 0 && timeLeft <= 3.0 && timeLeft > 0) {
          const secondFraction = timeLeft % 1;
          if (secondFraction < 0.15) {
            this.sound.playTick();
          }
        }
      },
      onWarning: (player) => {
        this.sound.playWarning();
      },
      onTimeout: (player) => {
        this.handleTimeout(player);
      }
    });

    this.initDOM();
    this.initEvents();
    this.updateSettingsUI();
    this.startNewRound('X');
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ttt_infinity_theme', theme);
    }
    this.updateThemeIcons();
    this.updateThemeSegmentedUI();
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(nextTheme);
    this.showToast(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Mode`);
  }

  updateThemeIcons() {
    if (typeof document === 'undefined') return;
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    if (!sun || !moon) return;

    if (this.currentTheme === 'dark') {
      sun.classList.remove('hidden');
      moon.classList.add('hidden');
    } else {
      sun.classList.add('hidden');
      moon.classList.remove('hidden');
    }
  }

  updateThemeSegmentedUI() {
    if (typeof document === 'undefined') return;
    const themeBtns = document.querySelectorAll('#theme-segmented .segment-btn');
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === this.currentTheme);
    });
  }

  showToast(message) {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2200);
  }

  initDOM() {
    if (typeof document === 'undefined') return;

    this.scoreXEl = document.getElementById('score-x');
    this.scoreOEl = document.getElementById('score-o');
    this.roundNumEl = document.getElementById('round-number');

    // Modals
    this.gameOverModal = document.getElementById('game-over-modal');
    this.modalCategoryBadge = document.getElementById('modal-category-badge');
    this.modalTitle = document.getElementById('modal-title');
    this.modalSubtitle = document.getElementById('modal-subtitle');
    this.modalBanner = document.getElementById('modal-banner');
    this.modalAvatar = document.getElementById('modal-icon');
    this.modalSeriesTag = document.getElementById('modal-series-tag');
    this.modalScoreX = document.getElementById('modal-score-x');
    this.modalScoreO = document.getElementById('modal-score-o');
    this.modalTargetNote = document.getElementById('modal-target-note');
    this.modalMoves = document.getElementById('modal-moves');
    this.modalRoundStat = document.getElementById('modal-round-stat');
    this.modalNextBtn = document.getElementById('modal-next-btn');
    this.modalNextText = document.getElementById('modal-next-text');

    this.rulesModal = document.getElementById('rules-modal');
    this.settingsModal = document.getElementById('settings-modal');

    this.roundsHelperText = document.getElementById('rounds-helper-text');
    this.timerHelperText = document.getElementById('timer-helper-text');

    // Header buttons
    this.soundBtn = document.getElementById('sound-btn');
    this.soundOnIcon = document.getElementById('sound-icon-on');
    this.soundOffIcon = document.getElementById('sound-icon-off');
    this.settingsSoundBtn = document.getElementById('settings-sound-btn');
    this.updateSoundIcons();
  }

  initEvents() {
    if (typeof document === 'undefined') return;

    // Cell Clicks & Ghost Previews
    this.renderer.bindCellEvents({
      onCellClick: (idx) => this.handleCellClick(idx),
      onCellHover: (idx) => this.renderer.showHoverPreview(idx, this.engine),
      onCellLeave: (idx) => this.renderer.clearHoverPreview(idx, this.engine)
    });

    // Theme Toggle Button (Header)
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Sound FX Toggle (Header)
    if (this.soundBtn) {
      this.soundBtn.addEventListener('click', () => {
        this.toggleSound();
      });
    }

    // Settings Modal Open/Close Controls
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettingsModal());
    }

    const formatPillBtn = document.getElementById('format-pill-btn');
    if (formatPillBtn) {
      formatPillBtn.addEventListener('click', () => this.openSettingsModal());
    }

    const closeSettingsBtn = document.getElementById('close-settings-btn');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
    }

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
    }

    // Settings Menu: Match Format (Best of X) Selectors
    const bestOfBtns = document.querySelectorAll('#best-of-selector .segment-btn');
    bestOfBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = Number(e.currentTarget.dataset.bestof);
        this.setBestOf(val);
      });
    });

    // Settings Menu: Turn Timer Selectors
    const timerBtns = document.querySelectorAll('#timer-segmented .segment-btn');
    timerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const seconds = Number(e.currentTarget.dataset.timer);
        this.setTurnDuration(seconds);
      });
    });

    // Settings Menu: Turn Order Selectors
    const turnOrderBtns = document.querySelectorAll('#turn-order-selector .segment-btn');
    turnOrderBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const order = e.currentTarget.dataset.turnorder;
        this.setTurnOrder(order);
      });
    });

    // Settings Menu: Theme Selectors
    const themeSegmentBtns = document.querySelectorAll('#theme-segmented .segment-btn');
    themeSegmentBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.themeVal;
        this.applyTheme(theme);
        this.showToast(`Switched to ${theme === 'light' ? 'Light' : 'Dark'} Mode`);
      });
    });

    // Settings Menu: Sound Toggle Switch
    if (this.settingsSoundBtn) {
      this.settingsSoundBtn.addEventListener('click', () => {
        this.toggleSound();
      });
    }

    // Settings Menu: Action buttons
    const settingsResetRoundBtn = document.getElementById('settings-reset-round-btn');
    if (settingsResetRoundBtn) {
      settingsResetRoundBtn.addEventListener('click', () => {
        this.resetRound();
        this.closeSettingsModal();
      });
    }

    const settingsResetMatchBtn = document.getElementById('settings-reset-match-btn');
    if (settingsResetMatchBtn) {
      settingsResetMatchBtn.addEventListener('click', () => {
        this.resetScores();
        this.closeSettingsModal();
      });
    }

    // Footer Reset & Next Buttons
    const resetRoundBtn = document.getElementById('reset-round-btn');
    if (resetRoundBtn) {
      resetRoundBtn.addEventListener('click', () => {
        this.resetRound();
      });
    }

    const resetMatchBtn = document.getElementById('reset-match-btn');
    if (resetMatchBtn) {
      resetMatchBtn.addEventListener('click', () => {
        this.resetScores();
      });
    }

    const footerNextBtn = document.getElementById('footer-next-btn');
    if (footerNextBtn) {
      footerNextBtn.addEventListener('click', () => {
        this.startNextRound();
      });
    }

    const bannerNextBtn = document.getElementById('banner-next-btn');
    if (bannerNextBtn) {
      bannerNextBtn.addEventListener('click', () => {
        this.startNextRound();
      });
    }

    // Game Over / Round Over Modal Actions
    if (this.modalNextBtn) {
      this.modalNextBtn.addEventListener('click', () => {
        this.startNextRound();
      });
    }

    const modalResetRoundBtn = document.getElementById('modal-reset-round-btn');
    if (modalResetRoundBtn) {
      modalResetRoundBtn.addEventListener('click', () => {
        this.resetRound();
      });
    }

    const modalSettingsBtn = document.getElementById('modal-settings-btn');
    if (modalSettingsBtn) {
      modalSettingsBtn.addEventListener('click', () => {
        this.closeGameOverModal();
        this.openSettingsModal();
      });
    }

    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        this.closeGameOverModal();
      });
    }

    // Rules Modal Controls
    const rulesBtn = document.getElementById('rules-btn');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', () => {
        if (this.rulesModal) this.rulesModal.classList.remove('hidden');
      });
    }

    const closeRulesBtn = document.getElementById('close-rules-btn');
    if (closeRulesBtn) {
      closeRulesBtn.addEventListener('click', () => {
        if (this.rulesModal) this.rulesModal.classList.add('hidden');
      });
    }

    const gotItBtn = document.getElementById('got-it-btn');
    if (gotItBtn) {
      gotItBtn.addEventListener('click', () => {
        if (this.rulesModal) this.rulesModal.classList.add('hidden');
      });
    }

    // Close Modals on Backdrop Click or Escape
    [this.gameOverModal, this.rulesModal, this.settingsModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.add('hidden');
          }
        });
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
          this.closeSettingsModal();
        } else if (this.rulesModal && !this.rulesModal.classList.contains('hidden')) {
          this.rulesModal.classList.add('hidden');
        } else if (this.gameOverModal && !this.gameOverModal.classList.contains('hidden')) {
          this.closeGameOverModal();
        }
      }
    });
  }

  toggleSound() {
    this.sound.toggleMute();
    this.updateSoundIcons();
    this.showToast(this.sound.isMuted ? 'Sound FX Muted' : 'Sound FX Enabled');
  }

  updateSoundIcons() {
    if (this.soundOnIcon && this.soundOffIcon) {
      if (this.sound.isMuted) {
        this.soundOnIcon.classList.add('hidden');
        this.soundOffIcon.classList.remove('hidden');
      } else {
        this.soundOnIcon.classList.remove('hidden');
        this.soundOffIcon.classList.add('hidden');
      }
    }
    if (this.settingsSoundBtn) {
      this.settingsSoundBtn.classList.toggle('active', !this.sound.isMuted);
      this.settingsSoundBtn.setAttribute('aria-checked', (!this.sound.isMuted).toString());
    }
  }

  // ==========================================================================
  // SETTINGS CONTROLLER METHODS
  // ==========================================================================

  openSettingsModal() {
    if (!this.settingsModal) return;
    this.updateSettingsUI();
    this.settingsModal.classList.remove('hidden');
  }

  closeSettingsModal() {
    if (!this.settingsModal) return;
    this.settingsModal.classList.add('hidden');
  }

  closeGameOverModal() {
    if (!this.gameOverModal) return;
    this.gameOverModal.classList.add('hidden');
  }

  setBestOf(num) {
    this.bestOf = num;
    this.targetWins = num > 0 ? Math.ceil(num / 2) : Infinity;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ttt_infinity_best_of', num);
    }

    // Check if current score already clinches the series
    if (this.bestOf > 0 && (this.scores.X >= this.targetWins || this.scores.O >= this.targetWins)) {
      this.isMatchOver = true;
    } else {
      this.isMatchOver = false;
    }

    this.updateSettingsUI();
    this.renderer.updateVersusHeader(this.currentRound, this.bestOf);
    this.renderer.renderMatchDots(this.scores, this.bestOf, this.targetWins);
    this.renderer.updateTurnBanner(this.engine, this.roundWinner, this.isMatchOver, this.currentRound);

    const name = num === 0 ? 'Endless Play' : `Best of ${num} (First to ${this.targetWins})`;
    this.showToast(`Match Setup: ${name}`);
  }

  setTurnDuration(seconds) {
    this.turnDuration = seconds;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ttt_infinity_timer', seconds);
    }

    this.timer.setDuration(seconds);
    this.renderer.resetTimers(seconds);
    this.updateSettingsUI();

    if (!this.engine.isGameOver && this.hasStarted) {
      this.timer.start(this.engine.currentPlayer);
    }

    this.showToast(seconds === 0 ? 'Turn Timer Disabled' : `Turn Timer: ${seconds}s Blitz`);
  }

  setTurnOrder(order) {
    this.turnOrder = order;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ttt_infinity_turn_order', order);
    }
    this.updateSettingsUI();

    const desc = order === 'alternate' ? 'Alternate (X ⇄ O)' : order === 'winner' ? 'Winner Starts Next Round' : 'Player X Always Starts';
    this.showToast(`Turn Order: ${desc}`);
  }

  updateSettingsUI() {
    if (typeof document === 'undefined') return;

    // Update Best-of Selector Buttons
    const bestOfBtns = document.querySelectorAll('#best-of-selector .segment-btn');
    bestOfBtns.forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.bestof) === this.bestOf);
    });

    if (this.roundsHelperText) {
      this.roundsHelperText.textContent = this.bestOf === 0 
        ? 'Endless series • No win limit' 
        : `First to ${this.targetWins} win${this.targetWins === 1 ? '' : 's'} takes the match`;
    }

    // Update Turn Timer Buttons
    const timerBtns = document.querySelectorAll('#timer-segmented .segment-btn');
    timerBtns.forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.timer) === this.turnDuration);
    });

    if (this.timerHelperText) {
      this.timerHelperText.textContent = this.turnDuration === 0 
        ? 'No time limits' 
        : `${this.turnDuration}s per turn countdown clock`;
    }

    // Update Turn Order Buttons
    const turnOrderBtns = document.querySelectorAll('#turn-order-selector .segment-btn');
    turnOrderBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.turnorder === this.turnOrder);
    });

    // Update Theme Buttons & Sound Switch
    this.updateThemeSegmentedUI();
    this.updateSoundIcons();
  }

  updateScoreboard() {
    if (this.scoreXEl) this.scoreXEl.textContent = this.scores.X;
    if (this.scoreOEl) this.scoreOEl.textContent = this.scores.O;
    if (this.roundNumEl) this.roundNumEl.textContent = this.currentRound;
  }

  // ==========================================================================
  // GAMEPLAY FLOW & ROUND CONTROLLER
  // ==========================================================================

  /**
   * Resets board to 100% empty state and starts a round with specified or calculated starter
   */
  startNewRound(startingPlayer = null) {
    if (this.winTimeoutId) {
      clearTimeout(this.winTimeoutId);
      this.winTimeoutId = null;
    }
    this.isProcessingMove = false;
    this.hasStarted = false;
    this.roundMoves = 0;
    this.roundWinner = null;

    let starter = startingPlayer;
    if (!starter) {
      if (this.turnOrder === 'alternate') {
        starter = this.lastStartingPlayer;
      } else if (this.turnOrder === 'winner' && this.roundWinner) {
        starter = this.roundWinner;
      } else {
        starter = 'X';
      }
    }
    this.lastStartingPlayer = starter;

    this.timer.stop();
    this.engine.reset(starter);
    this.renderer.clearWinningLine();
    this.confetti.stop();

    this.closeGameOverModal();

    this.renderer.renderBoard(this.engine, null, this.isMatchOver, this.currentRound);
    this.renderer.resetTimers(this.timer.durationSeconds);
    this.renderer.renderMatchDots(this.scores, this.bestOf, this.targetWins);
    this.renderer.updateVersusHeader(this.currentRound, this.bestOf);
    this.updateScoreboard();
  }

  /**
   * Advances to the next round with empty board, determining the next starting player
   */
  startNextRound() {
    if (this.isMatchOver) {
      // If match finished, next round starts a fresh match series
      this.resetScores();
      return;
    }

    this.currentRound++;

    // Calculate rotation for next starter
    let nextStarter = 'X';
    if (this.turnOrder === 'alternate') {
      nextStarter = this.lastStartingPlayer === 'X' ? 'O' : 'X';
    } else if (this.turnOrder === 'winner' && this.roundWinner) {
      nextStarter = this.roundWinner;
    } else {
      nextStarter = 'X';
    }

    this.startNewRound(nextStarter);
    this.sound.playReset();
    this.showToast(`Round ${this.currentRound} Started • Empty Board Ready`);
  }

  /**
   * Replays current round from empty board without resetting match scores
   */
  resetRound() {
    this.startNewRound(this.lastStartingPlayer);
    this.sound.playReset();
    this.showToast(`Round ${this.currentRound} Reset • Empty Board Ready`);
  }

  /**
   * Resets all match scores back to 0-0 and restarts Round 1
   */
  resetScores() {
    this.scores = { X: 0, O: 0 };
    this.currentRound = 1;
    this.roundMoves = 0;
    this.roundWinner = null;
    this.isMatchOver = false;
    this.lastStartingPlayer = 'X';

    this.startNewRound('X');
    this.sound.playReset();
    this.showToast('Match Reset • Round 1 Ready');
  }

  async handleCellClick(cellIndex) {
    if (this.isProcessingMove) return;
    if (this.engine.isGameOver) return;
    if (!this.engine.isValidMove(cellIndex)) return;

    this.isProcessingMove = true;
    try {
      this.hasStarted = true;
      this.roundMoves++;
      const movingPlayer = this.engine.currentPlayer;
      const expiringIndex = this.engine.getExpiringPiece(movingPlayer);

      // If an existing piece is expiring, animate its dissipation
      if (expiringIndex !== null) {
        this.sound.playVanish();
        await this.renderer.animateVanishing(expiringIndex);
      }

      // Play placement sound
      this.sound.playMove(movingPlayer);

      // Execute move in engine
      const result = this.engine.makeMove(cellIndex);
      if (!result.success) return;

      // Re-render board with updated pieces and queue badges
      this.renderer.renderBoard(this.engine, this.roundWinner, this.isMatchOver, this.currentRound);

      if (result.isWin) {
        this.handleGameWin(result.winner, result.winningLine);
      } else {
        this.timer.start(result.nextPlayer);
      }
    } finally {
      this.isProcessingMove = false;
    }
  }

  handleGameWin(winner, winningLine) {
    this.timer.stop();
    this.roundWinner = winner;
    this.scores[winner]++;

    // Check if match won
    if (this.bestOf > 0 && this.scores[winner] >= this.targetWins) {
      this.isMatchOver = true;
    }

    this.updateScoreboard();
    this.renderer.drawWinningLine(winningLine, winner);
    this.renderer.renderBoard(this.engine, winner, this.isMatchOver, this.currentRound);
    this.renderer.renderMatchDots(this.scores, this.bestOf, this.targetWins);

    this.sound.playWin();
    this.confetti.launch(winner);

    this.winTimeoutId = setTimeout(() => {
      this.showGameOverModal({
        winner,
        reason: 'Connected 3 in a row with mastery!',
        isTimeout: false
      });
    }, 750);
  }

  handleTimeout(timedOutPlayer) {
    this.sound.playTimeout();
    const result = this.engine.forfeit(timedOutPlayer);
    const winner = result.winner;
    this.roundWinner = winner;

    this.scores[winner]++;
    if (this.bestOf > 0 && this.scores[winner] >= this.targetWins) {
      this.isMatchOver = true;
    }

    this.updateScoreboard();
    this.renderer.renderBoard(this.engine, winner, this.isMatchOver, this.currentRound);
    this.renderer.renderMatchDots(this.scores, this.bestOf, this.targetWins);
    this.confetti.launch(winner);

    this.showGameOverModal({
      winner,
      timedOutPlayer,
      reason: `Player ${timedOutPlayer} ran out of time!`,
      isTimeout: true
    });
  }

  showGameOverModal({ winner, timedOutPlayer, reason, isTimeout }) {
    if (!this.gameOverModal) return;

    if (this.modalBanner) {
      this.modalBanner.className = `modal-banner banner-${isTimeout ? 'timeout' : winner.toLowerCase()}`;
    }
    if (this.modalAvatar) {
      this.modalAvatar.textContent = winner === 'X' ? '✕' : '◯';
    }

    if (this.modalCategoryBadge) {
      if (this.isMatchOver) {
        this.modalCategoryBadge.textContent = '🏆 MATCH CHAMPION';
      } else {
        this.modalCategoryBadge.textContent = `ROUND ${this.currentRound} COMPLETE`;
      }
    }

    if (this.modalTitle) {
      if (this.isMatchOver) {
        this.modalTitle.textContent = `👑 Player ${winner} Wins the Match!`;
      } else {
        this.modalTitle.textContent = `Player ${winner} Wins Round ${this.currentRound}!`;
      }
    }

    if (this.modalSubtitle) {
      if (this.isMatchOver) {
        this.modalSubtitle.textContent = `Champion of the Best of ${this.bestOf} series (${this.scores.X} - ${this.scores.O})!`;
      } else {
        this.modalSubtitle.textContent = reason;
      }
    }

    if (this.modalSeriesTag) {
      this.modalSeriesTag.textContent = this.bestOf === 0 ? 'ENDLESS SERIES' : `BEST OF ${this.bestOf} SERIES`;
    }

    if (this.modalScoreX) this.modalScoreX.textContent = this.scores.X;
    if (this.modalScoreO) this.modalScoreO.textContent = this.scores.O;

    if (this.modalTargetNote) {
      if (this.isMatchOver) {
        this.modalTargetNote.textContent = `🏆 Match Finished! Player ${winner} crowned Series Champion.`;
      } else if (this.bestOf > 0) {
        const needed = this.targetWins - this.scores[winner];
        this.modalTargetNote.textContent = `🎯 Player ${winner} needs ${needed} more win${needed === 1 ? '' : 's'} to claim the match!`;
      } else {
        this.modalTargetNote.textContent = `Endless series • Total score: X: ${this.scores.X} — O: ${this.scores.O}`;
      }
    }

    if (this.modalMoves) {
      this.modalMoves.textContent = this.roundMoves || this.engine.totalMoves;
    }
    if (this.modalRoundStat) {
      this.modalRoundStat.textContent = `Round ${this.currentRound}`;
    }

    if (this.modalNextText) {
      if (this.isMatchOver) {
        this.modalNextText.textContent = 'Start New Match 🏆';
      } else {
        this.modalNextText.textContent = `Play Round ${this.currentRound + 1}`;
      }
    }

    this.gameOverModal.classList.remove('hidden');
  }
}

// Expose classes on window or module for debugging and Phase 2 extensions
if (typeof window !== 'undefined') {
  window.InfinityTicTacToe = {
    GameEngine,
    TurnTimer,
    SoundFX,
    Confetti,
    BoardRenderer,
    App
  };

  // Auto-bootstrap
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.appInstance = new App();
      });
    } else {
      window.appInstance = new App();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameEngine, TurnTimer, SoundFX, Confetti, BoardRenderer, App };
}
