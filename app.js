#!/usr/bin/env node

const stats = {
  numberStarted: 0,
  numberCompleted: 0,
  redWinners: 0,
  blueWinners: 0,
  ties: 0
};

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const websocket = require("ws");
const exputils = require("./express-generator-utils");

const indexRouter = require('./routes/index');

const msg = require("./public/javascripts/messages.js");
const { games, Game } = require("./game.js");

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//indexRouter(...) returns the callback needed here
app.use('/', indexRouter(stats));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
  console.log(err);
});

var port = exputils.normalizePort(process.argv.length > 2 ? process.argv[2] : 3000);
app.set('port', port);

const server = app.listen(port);
server.on('error', exputils.onError);
server.on('listening', exputils.onListening(server.address()));

const wsc = {};

let connectionID = 0;

const wss = new websocket.Server({ server });

wss.on("connection", function (conn) {
  //generate new ID for connection
  const newCID = connectionID++;
  conn.id = newCID;

  //register new connection
  wsc[newCID] = conn;

  //put the player behind connection in some game
  const joinInfo = joinGame();
  conn.gameID = joinInfo.gameID;
  conn.player = joinInfo.player;
  games[joinInfo.gameID]["player" + joinInfo.player] = conn.id;

  //send the current game state to the player
  sendGameStateInfo(games[conn.gameID]);

  //onWebsocketMessage(...) returns the callback needed here
  conn.on("message", onWebsocketMessage(conn));

  conn.on("close", function () {
    if (conn.gameID && conn.gameID in games) closeGame(games[conn.gameID], "This game was closed because one of the players left.");
    delete wsc[newCID];
  });

  console.log("connection established for player " + conn.player + " for game " + conn.gameID);
});

let currentGame = null;

/**returns a handler function for incoming messages from player websockets.
 *@param conn the websocket connection that a handler is needed for
 *@returns {(message : Buffer) => void} the handler function
 */
function onWebsocketMessage(conn) {
  return function (data) {
    try {
      const message = JSON.parse(data);

      if ("makeMove" in message) {
        if (!(conn.gameID in games)) {
          conn.send(JSON.stringify({ message: "gameClosed" }));
          return;
        }
        const game = games[conn.gameID];

        const result = game.makeMove(conn.player, message.makeMove);
        if (result.message) conn.send(JSON.stringify(result));

        sendGameStateInfo(game);

        if (result.gameBoard.winner) {
          if (result.gameBoard.winner == 1) {
            stats.blueWinners++;
          }
          else {
            stats.redWinners++;
          }
          stats.numberCompleted++;
          games[conn.gameID].status = "finished";
          closeGame(game);
        }
        else if (result.gameBoard.tie) {
          stats.ties++;
          stats.numberCompleted++;
          games[conn.gameID].status = "finished";
          closeGame(game);
        }
      }
      else {
        conn.send(JSON.stringify({ message: "invalidMessage" }));
      }

      conn.mode = message.mode;
    }
    catch (e) {
      console.log("An error occured");
      console.log(data);
      console.log(e);
    }
  }
}

/**returns the joinInfo for the first player for a new game or the joinInfo for the second game if a game lacking a second player already exists.
 *@returns {import("./game").joinInfo} joinInfo
 *@see {@link Game.joinInfo}
 */
function joinGame() {
  if (currentGame && currentGame in games) {
    games[currentGame].markLoginComplete();
    const joinInfo = games[currentGame].joinInfo()[1];
    currentGame = null;
    return joinInfo;
  }
  else {
    stats.numberStarted++;
    const game = new Game();
    games[game.id] = game;
    currentGame = game.id;
    return game.joinInfo()[0];
  }
}

/**gracefully stops a game
 * @param {Game} game the Game to be closed
 * @param {String} [message] message to be sent to players before closing
 */
function closeGame(game, message) {
  if (message)
    sendGameStateInfo(game, message);
  else
    sendGameStateInfo(game);
  stats.numberStarted--;
  delete games[game.id];
  console.log(`game ${game.id} is closed`);
}

/**sends the gameStateInfo to all available players of a game.
 * @param {Game} game
 * @param {String} [message] a message to be included with the sent state
 * @see Game.gameStateInfo
 */
function sendGameStateInfo(game, message) {
  const gameStateInfo = game.gameStateInfo(1);

  if (message) gameStateInfo.message = message;

  if (game.player1 in wsc) wsc[game.player1].send(JSON.stringify(gameStateInfo));

  gameStateInfo.player = 2;

  if (game.player2 in wsc) wsc[game.player2].send(JSON.stringify(gameStateInfo));
}