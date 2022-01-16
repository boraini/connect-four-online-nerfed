const WEBSOCKET_URL = "ws://localhost:3000";
const BOARD_COLUMNS = 7;
const BOARD_ROWS = 6;
const PIECE_IMG_SRC = [undefined, "/images/laga-blue-male.svg", "/images/laga-red-male.svg"];

const statusMessages = window.messages.statusMessages;

/**a class to manage the game state and view
 */
class GameBoard {
  constructor(el) {
    this.data = {
      turn: 0,
      board: new Array(BOARD_COLUMNS)
    };
    this.board = el;
    this.infoBox = document.getElementById("infoBox");
    this.statusDisplay = document.getElementById("statusDisplay");
    this.timeBox = document.getElementById("time");
    this.data.board = new Array(BOARD_COLUMNS);
    this.boardRows = new Array(BOARD_COLUMNS);
    this.startTime = performance.now();

    for (let i = 0; i < this.data.board.length; i++) {
      this.data.board[i] = [];
      const row = this.board.querySelector("#board-row-" + (i + 1));
      const scopedIndex = i;
      row.addEventListener("click", e => this.makeMove(scopedIndex), { passive: true });
      this.boardRows[i] = row;
    }
  }

  /**attempt to make a move in the board column at index
   * @param {Number} index 
   */
  makeMove(index) {
    if (this.data.turn != 0 && this.data.turn != localPlayer) alert(messages.statusMessages.notYourTurn);
    else if (this.data.board[index].length >= BOARD_ROWS) alert(messages.statusMessages.wrongColumn);
    else {
      socket.send(`{"makeMove": ${index}}`);
      this.data.turn = 0;
    }
  }

  /**add a piece for a player in the board column at index
   * @param {Number} index 
   * @param {Number} player 
   */
  addPiece(index, player) {
    const el = document.createElement("img");
    el.src = PIECE_IMG_SRC[player];
    el.width = 140;
    el.height = 140;
    el.className = "piece";
    this.boardRows[index].appendChild(el);
  }

  /**display the winning position
   * @param {{position: Number[][]}} pos 
   */
  markWin(pos) {
    const transform = {
      horizontal: "rotate(90deg)",
      vertical: "none",
      diagonalRight: "rotate(45deg)",
      diagonalLeft: "rotate(-45deg)"
    };

    for (let square of pos.position) {
      this.boardRows[square[0]].children[square[1]].classList.add("winner");
      this.boardRows[square[0]].children[square[1]].style.transform = transform[pos.direction];
    }
  }

  /**diffs the data
   * @param {import("../../game").gameBoard} data 
   * @returns {{boardUpdates: {keep: Number, additions: number[]}[]}}
   */
  diff(data) {
    const boardUpdates = new Array(7);
    for (let i = 0; i < boardUpdates.length; i++)
      boardUpdates[i] = diffArrays(this.data.board[i], data.board[i]);

    return { boardUpdates };
  }

  /**renders the data
   * @param {import("../../game").gameBoard} data 
   */
  render(data) {
    const { boardUpdates } = this.diff(data);

    for (let i = 0; i < boardUpdates.length; i++) {
      let j = 0;
      for (let piece of this.boardRows[i].children) {
        if (j < boardUpdates[i].keep) j++;
        else this.boardRows[i].removeChild(piece);
      }

      if (boardUpdates[i].additions) for (let newPiece of boardUpdates[i].additions) {
        this.addPiece(i, newPiece);
      }
    }

    if (data.winner) {
      setTimeout(() => {this.markWin(data.winningPosition);}, 1000);
      this.infoBox.innerHTML = data.winner == localPlayer ? statusMessages.win : statusMessages.lose;
    }
    else if (data.tie) {
      this.infoBox.innerHTML = statusMessages.tie;
    }
    else {
      this.infoBox.innerHTML = data.turn == localPlayer ? statusMessages.yourTurn : statusMessages.opponentsTurn;
    }

    this.startTime = performance.now() - data.elapsedTime;

    if (data.loginComplete)
      this.statusDisplay.innerHTML = "";
    else
      this.statusDisplay.innerHTML = statusMessages.waiting;
    
    this.data = data;
  }

  /**renders the elapsed time
   */
  renderTime() {
    this.timeBox.innerHTML = getTimeString(performance.now() - this.startTime);
  }
}

/**diffs two arrays and returns information about patching the current array to reach the new array
 * @param {Number[]} current 
 * @param {Number[]} compared 
 * @returns {{keep: Number, additions: number[]}}
 */
function diffArrays(current, compared) {
  let additions;
  let keep = current.length;
  for (let i = 0; i < compared.length; i++) {
    if (additions) additions.push(compared[i]);
    else {
      if (i < current.length) {
        if (current[i] != compared[i]) {
          keep = i;
          additions = [compared[i]];
        }
      }
      else additions = [compared[i]];
    }
  }
  return { keep, additions };
}

/**
 * @param {Number} milliseconds 
 * @returns {String} Time: h:mm:ss
 */
function getTimeString(milliseconds) {
  let left = milliseconds;
  const hours = Math.floor(left / 3_600_000);
  left -= hours * 3_600_000;
  const minutes = Math.floor(left / 60_000);
  left -= minutes * 60_000;
  const seconds = Math.floor(left / 1000);
  
  return "Time: " +
    (hours > 0 ? hours + ":" : "") +
    minutes.toString().padStart(2, "0") + ":" +
    seconds.toString().padStart(2, "0");
}

let localPlayer = -1;
var gameBoard = new GameBoard(document.getElementById("game-board"));
const unloadListener = addEventListener("beforeunload", function (e) {
  e.preventDefault();
  e.returnValue = statusMessages.leavePrompt;
});

const socket = new WebSocket(WEBSOCKET_URL);

socket.onopen = function (e) { };

socket.onmessage = function (e) {
  const data = JSON.parse(e.data);
  if (localPlayer == -1) {
    document.getElementById("player-indicator").src = PIECE_IMG_SRC[data.player];
  }
  localPlayer = data.player;
  if (data.gameBoard) gameBoard.render(data.gameBoard);
  if (data.message) alert(data.message in statusMessages ? statusMessages[data.message] : data.message);
};

socket.onclose = function (e) {
  alert(statusMessages.connectionLost);
};

socket.onerror = function (e) {
  alert(statusMessages.connectionLost);
};

let lastt = performance.now();
function renderLoop(t) {
  if (t - lastt > 33) {
    gameBoard.renderTime();
    lastt = t;
  }
  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);