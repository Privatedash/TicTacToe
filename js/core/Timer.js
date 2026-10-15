/**
 * Timer.js
 * Turn countdown timer controller with millisecond precision and event dispatchers.
 */

export class TurnTimer {
  /**
   * @param {Object} options
   * @param {number} options.durationSeconds Default duration per turn (e.g. 10)
   * @param {Function} options.onTick Called on each tick with (player, timeLeft, totalTime)
   * @param {Function} options.onTimeout Called when timer reaches 0 with (player)
   * @param {Function} options.onWarning Called when time is critically low (<= 3s)
   */
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

    this.TICK_INTERVAL_MS = 100; // 10Hz smooth updates
  }

  /**
   * Updates timer settings
   * @param {number} seconds 
   */
  setDuration(seconds) {
    this.durationSeconds = Number(seconds);
    this.reset(this.currentPlayer);
  }

  /**
   * Starts or resumes turn countdown for the given player
   * @param {'X' | 'O'} player 
   */
  start(player) {
    this.stop();
    this.currentPlayer = player;
    this.timeLeft = this.durationSeconds;
    this.hasWarned = false;

    // If timer is disabled (0 seconds), broadcast infinite state and return
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

      // Warning trigger at 3.0 seconds
      if (this.timeLeft <= 3.0 && !this.hasWarned) {
        this.hasWarned = true;
        this.onWarning(this.currentPlayer, this.timeLeft);
      }

      // Timeout trigger
      if (this.timeLeft <= 0) {
        this.stop();
        this.onTimeout(this.currentPlayer);
      }
    }, this.TICK_INTERVAL_MS);
  }

  /**
   * Stops current running timer without resetting values
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Resets timer for the next turn
   * @param {'X' | 'O'} player 
   */
  reset(player = this.currentPlayer) {
    this.stop();
    this.currentPlayer = player;
    this.timeLeft = this.durationSeconds;
    this.hasWarned = false;
    this.onTick(this.currentPlayer, this.timeLeft, this.durationSeconds);
  }
}
