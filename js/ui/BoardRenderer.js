/**
 * BoardRenderer.js
 * DOM renderer and visual animator for Infinity Tic-Tac-Toe.
 * Handles board grid rendering, life badges, vanishing dissipation,
 * SVG winning lines, ghost previews, and circular countdown rings.
 */

export class BoardRenderer {
  constructor() {
    this.boardEl = document.getElementById('game-board');
    this.cells = Array.from(document.querySelectorAll('.cell'));
    this.winningLineEl = document.getElementById('winning-line');
    this.winningSvgEl = document.getElementById('winning-line-svg');

    // Player Cards & Status
    this.cardX = document.getElementById('player-card-x');
    this.cardO = document.getElementById('player-card-o');
    this.timerValX = document.getElementById('timer-val-x');
    this.timerValO = document.getElementById('timer-val-o');
    this.timerRingX = document.getElementById('timer-ring-x');
    this.timerRingO = document.getElementById('timer-ring-o');

    // Turn Banner
    this.turnBanner = document.getElementById('turn-banner');
    this.turnMessage = document.getElementById('turn-message');
    this.vanishingBadge = document.getElementById('vanishing-hint-badge');
    this.bannerNextBtn = document.getElementById('banner-next-btn');
    this.footerNextBtn = document.getElementById('footer-next-btn');

    // SVG Circumference for r = 44 is 2 * PI * 44 ≈ 276.46
    this.RING_CIRCUMFERENCE = 276.46;
  }

  /**
   * Binds click and hover listeners to board cells
   * @param {Object} handlers
   * @param {Function} handlers.onCellClick
   * @param {Function} handlers.onCellHover
   * @param {Function} handlers.onCellLeave
   */
  bindCellEvents({ onCellClick, onCellHover, onCellLeave }) {
    this.cells.forEach(cell => {
      const idx = Number(cell.dataset.index);

      cell.addEventListener('click', () => onCellClick(idx));
      cell.addEventListener('mouseenter', () => onCellHover(idx));
      cell.addEventListener('mouseleave', () => onCellLeave(idx));
    });
  }

  /**
   * Fully synchronizes board DOM with the GameEngine state
   * @param {import('../core/GameEngine.js').GameEngine} engine 
   */
  renderBoard(engine) {
    const expiringPiece = engine.getExpiringPiece(engine.currentPlayer);

    this.cells.forEach((cell, idx) => {
      const mark = engine.board[idx];

      // Remove existing transient preview/animation classes
      cell.classList.remove('ghost-x', 'ghost-o', 'preview-dissolve', 'expiring', 'winner-cell');

      if (mark) {
        cell.classList.add('taken');
        cell.classList.toggle('cell-x', mark === 'X');
        cell.classList.toggle('cell-o', mark === 'O');

        // Determine queue index (1 = oldest, 2 = mid, 3 = newest)
        const playerQueue = engine.pieces[mark];
        const queuePosition = playerQueue.indexOf(idx); // 0, 1, or 2
        const badgeNum = queuePosition !== -1 ? queuePosition + 1 : '';

        // Expiring piece highlight
        const isExpiring = !engine.isGameOver && idx === expiringPiece;
        if (isExpiring) {
          cell.classList.add('expiring');
        }

        cell.innerHTML = `
          <span class="mark-symbol">${mark === 'X' ? '✕' : '◯'}</span>
          <span class="piece-badge" title="Queue Position #${badgeNum}">${badgeNum}</span>
        `;
      } else {
        cell.className = 'cell';
        cell.innerHTML = '';
      }
    });

    // Update Turn Banner & Badges
    this.updateTurnBanner(engine);
    this.updatePieceSlots(engine);
    this.updatePlayerCards(engine);
  }

  /**
   * Animates piece dissolve before board re-render
   * @param {number} cellIndex 
   * @returns {Promise<void>}
   */
  animateVanishing(cellIndex) {
    const cell = this.cells[cellIndex];
    if (!cell) return Promise.resolve();

    cell.classList.add('dissolving');
    return new Promise(resolve => {
      setTimeout(() => {
        cell.classList.remove('dissolving');
        resolve();
      }, 450);
    });
  }

  /**
   * Hover preview on cell
   * @param {number} idx 
   * @param {import('../core/GameEngine.js').GameEngine} engine 
   */
  showHoverPreview(idx, engine) {
    if (engine.isGameOver || !engine.isValidMove(idx)) return;

    const cell = this.cells[idx];
    const player = engine.currentPlayer;
    cell.classList.add(player === 'X' ? 'ghost-x' : 'ghost-o');

    // If player has 3 pieces, visually ghost the piece that will be replaced
    const expiringIndex = engine.getExpiringPiece(player);
    if (expiringIndex !== null && this.cells[expiringIndex]) {
      this.cells[expiringIndex].classList.add('preview-dissolve');
    }
  }

  /**
   * Clear hover preview on cell leave
   * @param {number} idx 
   * @param {import('../core/GameEngine.js').GameEngine} engine 
   */
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

  /**
   * Updates turn banner message and warning badges
   * @param {import('../core/GameEngine.js').GameEngine} engine 
   */
  updateTurnBanner(engine) {
    const isX = engine.currentPlayer === 'X';
    this.turnBanner.classList.toggle('banner-turn-x', isX);
    this.turnBanner.classList.toggle('banner-turn-o', !isX);

    if (engine.isGameOver) {
      this.turnMessage.textContent = `Match Finished • Winner: Player ${engine.winner} 🎉`;
      if (this.vanishingBadge) this.vanishingBadge.classList.add('hidden');
      if (this.bannerNextBtn) this.bannerNextBtn.classList.remove('hidden');
      if (this.footerNextBtn) this.footerNextBtn.classList.remove('hidden');
      return;
    }

    if (this.bannerNextBtn) this.bannerNextBtn.classList.add('hidden');
    if (this.footerNextBtn) this.footerNextBtn.classList.add('hidden');

    if (engine.totalMoves === 0) {
      this.turnMessage.textContent = "Player X's Turn • First click starts the timer";
    } else {
      this.turnMessage.textContent = `Player ${engine.currentPlayer}'s Turn • Place piece #${engine.pieces[engine.currentPlayer].length + 1 <= 3 ? engine.pieces[engine.currentPlayer].length + 1 : '4 (Replaces #1)'}`;
    }

    const expiring = engine.getExpiringPiece(engine.currentPlayer);
    if (expiring !== null && this.vanishingBadge) {
      this.vanishingBadge.classList.remove('hidden');
    } else if (this.vanishingBadge) {
      this.vanishingBadge.classList.add('hidden');
    }
  }

  /**
   * Updates active state of player cards
   * @param {import('../core/GameEngine.js').GameEngine} engine 
   */
  updatePlayerCards(engine) {
    const isX = engine.currentPlayer === 'X';
    this.cardX.classList.toggle('active', isX && !engine.isGameOver);
    this.cardO.classList.toggle('active', !isX && !engine.isGameOver);
  }

  /**
   * Updates 3-piece slot dot indicators on player cards
   * @param {import('../core/GameEngine.js').GameEngine} engine 
   */
  updatePieceSlots(engine) {
    ['X', 'O'].forEach(player => {
      const count = engine.pieces[player].length;
      const isTurn = engine.currentPlayer === player && !engine.isGameOver;

      for (let i = 0; i < 3; i++) {
        const dot = document.getElementById(`slot-${player.toLowerCase()}-${i}`);
        if (!dot) continue;

        dot.classList.toggle('filled', i < count);
        // Slot 0 represents the oldest piece (#1)
        dot.classList.toggle('expiring', isTurn && count === 3 && i === 0);
      }

      const label = document.querySelector(`.player-${player.toLowerCase()} .slot-label`);
      if (label) {
        label.textContent = `${count}/3`;
      }
    });
  }

  /**
   * Updates circular timer ring SVG and text
   * @param {'X' | 'O'} player 
   * @param {number} timeLeft 
   * @param {number} totalTime 
   */
  updateTimer(player, timeLeft, totalTime) {
    const ringEl = player === 'X' ? this.timerRingX : this.timerRingO;
    const valEl = player === 'X' ? this.timerValX : this.timerValO;
    const cardEl = player === 'X' ? this.cardX : this.cardO;

    if (!ringEl || !valEl) return;

    if (totalTime <= 0) {
      // Timer disabled
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

    // Dynamic warning styling
    const isWarning = timeLeft <= 5.0 && timeLeft > 2.5;
    const isCritical = timeLeft <= 2.5;

    cardEl.classList.toggle('warning', isWarning);
    cardEl.classList.toggle('critical', isCritical);

    ringEl.classList.toggle('timer-warning', isWarning);
    ringEl.classList.toggle('timer-critical', isCritical);
  }

  /**
   * Draws and animates SVG winning line through winning cells
   * @param {number[]} lineIndices e.g. [0, 1, 2]
   * @param {'X' | 'O'} winner 
   */
  drawWinningLine(lineIndices, winner) {
    if (!lineIndices || lineIndices.length < 3) return;

    // Highlight winning cells
    lineIndices.forEach(idx => {
      if (this.cells[idx]) {
        this.cells[idx].classList.add('winner-cell');
      }
    });

    const startCell = this.cells[lineIndices[0]];
    const endCell = this.cells[lineIndices[2]];

    const boardRect = this.boardEl.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    // Calculate relative coordinates in 300x300 viewBox
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

  /**
   * Cleans and resets timer progress rings and numbers for both players
   * @param {number} durationSeconds 
   */
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

  /**
   * Clears winning line SVG
   */
  clearWinningLine() {
    if (this.winningLineEl) {
      this.winningLineEl.style.transition = 'none';
      this.winningLineEl.setAttribute('x1', '0');
      this.winningLineEl.setAttribute('y1', '0');
      this.winningLineEl.setAttribute('x2', '0');
      this.winningLineEl.setAttribute('y2', '0');
      this.winningLineEl.style.strokeDashoffset = '450';
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
