/**
 * GameEngine.js
 * Core state machine and game logic for Infinity Tic-Tac-Toe.
 * Encapsulates board state, FIFO queue (max 3 pieces per player),
 * expiring piece tracking, and winning line verification.
 */

export const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 0
  [3, 4, 5], // Row 1
  [6, 7, 8], // Row 2
  [0, 3, 6], // Col 0
  [1, 4, 7], // Col 1
  [2, 5, 8], // Col 2
  [0, 4, 8], // Diagonal 1
  [2, 4, 6]  // Diagonal 2
];

export class GameEngine {
  constructor() {
    this.MAX_PIECES_PER_PLAYER = 3;
    this.reset();
  }

  /**
   * Resets game state for a new round
   * @param {'X' | 'O'} startingPlayer
   */
  reset(startingPlayer = 'X') {
    // 3x3 board array: null, 'X', or 'O'
    this.board = Array(9).fill(null);
    
    // Ordered queue of cell indices for each player: [oldest ... newest]
    this.pieces = {
      X: [],
      O: []
    };

    this.currentPlayer = startingPlayer;
    this.winner = null; // 'X' | 'O' | null
    this.winningLine = null; // e.g. [0, 1, 2]
    this.isGameOver = false;
    this.totalMoves = 0;
    this.lastVanished = null; // { player: 'X'|'O', index: number }
  }

  /**
   * Returns current active pieces for a player
   * @param {'X' | 'O'} player 
   * @returns {number[]} array of cell indices
   */
  getPlayerPieces(player) {
    return [...this.pieces[player]];
  }

  /**
   * Returns the oldest piece index that will vanish next, if player has 3 pieces
   * @param {'X' | 'O'} player 
   * @returns {number | null}
   */
  getExpiringPiece(player = this.currentPlayer) {
    if (this.pieces[player].length === this.MAX_PIECES_PER_PLAYER) {
      return this.pieces[player][0];
    }
    return null;
  }

  /**
   * Checks if a cell is an eligible move
   * @param {number} cellIndex 
   * @returns {boolean}
   */
  isValidMove(cellIndex) {
    if (this.isGameOver) return false;
    if (cellIndex < 0 || cellIndex > 8) return false;
    
    // Standard rule: cell must be currently empty
    return this.board[cellIndex] === null;
  }

  /**
   * Returns all currently valid cell indices
   * @returns {number[]}
   */
  getValidMoves() {
    if (this.isGameOver) return [];
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) {
        moves.push(i);
      }
    }
    return moves;
  }

  /**
   * Executes a move for the current player
   * @param {number} cellIndex 
   * @returns {Object} Move result metadata
   */
  makeMove(cellIndex) {
    if (!this.isValidMove(cellIndex)) {
      return { success: false, reason: 'Invalid or occupied cell' };
    }

    const player = this.currentPlayer;
    let vanishedIndex = null;

    // 1. If player already has 3 pieces, their oldest piece must vanish
    if (this.pieces[player].length >= this.MAX_PIECES_PER_PLAYER) {
      vanishedIndex = this.pieces[player].shift(); // Remove oldest from queue
      this.board[vanishedIndex] = null; // Clear cell from board
      this.lastVanished = { player, index: vanishedIndex };
    } else {
      this.lastVanished = null;
    }

    // 2. Place the new piece on board and in player's queue
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
      // 4. Switch current player
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

  /**
   * Checks if player's active pieces form a 3-in-a-row
   * @param {'X' | 'O'} player 
   * @returns {number[] | null} winning combination or null
   */
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

  /**
   * Forfeits match/turn (e.g., when a player runs out of time)
   * @param {'X' | 'O'} timedOutPlayer 
   */
  forfeit(timedOutPlayer) {
    this.isGameOver = true;
    this.winner = timedOutPlayer === 'X' ? 'O' : 'X';
    this.winningLine = null;
    return {
      winner: this.winner,
      reason: 'timeout'
    };
  }

  /**
   * Clones engine state - essential for Minimax lookahead in Phase 2 AI
   * @returns {GameEngine}
   */
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
