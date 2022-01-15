const winningPositions = require("./winning-positions.js");

let gameID = 1;
const BOARD_ROWS = 6;
const BOARD_COLUMNS = 7;

const games = {};

/**join info used to log websockets into a game
 * @typedef {Object} joinInfo
 * @property {String} gameID ID of the game
 * @property {String} gameKey access key to log in a websocket into the game
 * @property {Number} player the local player, 1 or 2
 */

/**game board data
 * @typedef {Object} gameBoard
 * @property {Number[][]} board one array for each column of the game board, starting from the bottom
 * @property {Number} turn which player should play, 1 or 2
 * @property {Number} elapsedTime elapsed time in milliseconds since the start of the game
 */

/**game state info to be sent to a player
 * @typedef {Object} gameStateInfo
 * @property {Number} player the local player, 1 or 2
 * @property {Boolean} loginComplete true if both players have logged in else false
 * @property {gameBoard} gameBoard
 */

/**manager for a game of connect four
 * @param {Object} data
 * @param {String} data.id the ID for the game
 * @param {String} data.status "matchmaking" or "ongoing"
 * @param {Date} data.startDate the date when the game has begun
 * @param {String} data.player1 ID of player1
 * @param {String} data.player2 ID of player2
 * @param {String} data.key validation key for game logins
 */
function Game({status, startDate, player1, player2, key, loginComplete} = {}) {
  this.id = (gameID++).toString().padStart(4, "0");
  this.status = status || "matchmaking";
  this.startDate = startDate || new Date();
  this.startTime = performance.now();
  this.player1 = player1;
  this.player2 = player2;
  this.key = key || Math.floor(Math.random() * 100000000).toString();

  this.gameBoard = {
    turn: 1,
    elapsedTime: this.startTime,
    loginComplete: !!loginComplete,
    board: new Array(BOARD_COLUMNS)
  };

  for (let i = 0; i < this.gameBoard.board.length; i++) {
    this.gameBoard.board[i] = [];
  }
}


/**returns joinInfo for two players
 * @returns {joinInfo[]} array of length 2 of joinInfo
 */
Game.prototype.joinInfo = function () {
  return [
    {
      gameID: this.id,
      gameKey: this.key,
      player: 1
    },
    {
      gameID: this.id,
      gameKey: this.key,
      player: 2
    }
  ];
};

/**updates the elapsed time
 */
Game.prototype.updateElapsedTime = function() {
  this.gameBoard.elapsedTime = performance.now() - this.startTime;
};

/**returns gameStateInfo for one player
 * @param {Number} player what to fill in the player field
 * @returns {gameStateInfo} the gameStateInfo
 */
Game.prototype.gameStateInfo = function (player) {
  this.updateElapsedTime();
  return {
    player,
    gameBoard: this.gameBoard
  };
};

/**sets loginComplete that comes in gameStateInfo to true
 */
Game.prototype.markLoginComplete = function () {
  this.gameBoard.loginComplete = true;
};

/**attempts to place player's piece into the given column and informs about the result
 * 
 * if the return value contains a message field do not do anything with the local game state of the user and display the message instead
 * @param {Number} player 1 or 2
 * @param {Number} index column to drop the piece
 * @returns {gameStateInfo|{message: String}} gameStateInfo
 */
Game.prototype.makeMove = function (player, index) {
  if (this.gameBoard.turn != player) return { message: "" };
  else if (this.gameBoard.board[index].length >= BOARD_ROWS) return { message: "wrongColumn" };
  else {
    this.gameBoard.board[index].push(player);
    this.gameBoard.turn = this.gameBoard.turn == 1 ? 2 : 1;
    const winning = this.checkWin();
    if (winning) {
      this.gameBoard.winner = winning.player;
      this.gameBoard.winningPosition = winning;
    }
    else if (this.checkTie()) {
      this.gameBoard.tie = true;
    }
    return this.gameStateInfo(player);
  }
};

/**checks if any player is winning and returns the winning position if so
 * @returns {{position: Number[][], direction: String, player: Number}?} the winning position if one exists
 */
Game.prototype.checkWin = function () {
  for (let direction in winningPositions) {
    for (let position of winningPositions[direction]) {
      let checkSame = 0;
      for (let square of position) {
        if (square[1] < this.gameBoard.board[square[0]].length) {
          const playerInSquare = this.gameBoard.board[square[0]][square[1]];
          if (checkSame == 0 || checkSame == playerInSquare) {
            checkSame = playerInSquare;
          }
          else {
            checkSame = 0;
          }
        }
        else {
          checkSame = 0;
        }
        if (checkSame == 0) break;
      }
      if (checkSame != 0) {
        return { position, direction, player: checkSame };
      }
    }
  }
};

/**checks if the game resulted in a tie
 * @returns {Boolean} true if the game resulted in a tie else false
 */
Game.prototype.checkTie = function () {
  for (let i = 0; i < this.gameBoard.board.length; i++) {
    if (this.gameBoard.board[i].length < BOARD_ROWS)
      return false;
  }
  return true;
};

module.exports = { games, Game };