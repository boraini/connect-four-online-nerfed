"use strict";

const WEBSOCKET_URL = "ws://localhost:3000";

class GamesTable {
    constructor(el) {
        this.tableEl = el;
        this.data = {};
        this.rowEls = {};
    }

    addRow(id, data) {
        this.rowEls[id] = {
            root: document.createElement("tr"),
            cells: {
                id: document.createElement("td"),
                note: document.createElement("td"),
                startDate: document.createElement("td"),
                status: document.createElement("td")
            }
        };

        for (let key in this.rowEls[id].cells) {
            this.rowEls[id].root.appendChild( this.rowEls[id].cells[key] );
        }

        this.tableEl.appendChild( this.rowEls[id].root );

        this.updateRow(id, data);
    }

    removeRow(id) {
        this.tableEl.removeChild( this.rowEls[id].root );
        delete this.rowEls[id];
    }

    updateRow(id, data) {
        const rowEl = this.rowEls[id];
        rowEl.cells.id.innerHTML = id;
        rowEl.cells.note.innerHTML = data[id].note;
            rowEl.cells.startDate.innerHTML = data[id].startDate;
            if (data[id].status == "matchmaking") {
                if (!("joinButton" in rowEl)) {
                    rowEl.cells.status.innerHTML = "";

                    const btn = document.createElement("button");
                    btn.innerHTML = "(1/2) Join";
                    const scopedId = id;
                    btn.addEventListener("click", function() {joinGame(id);});
                    rowEl.cells.status.appendChild(btn);

                    rowEl.joinButton = btn;
                }
            }
            else {
                if ("joinButton" in rowEl) {
                    rowEl.cells.status.removeChild(rowEl.joinButton);
                    delete rowEl.joinButton;
                }

                rowEl.cells.status.innerHTML = data[id].status;
            }
    }

    diff(data) {
        const result = [[], [], []];

        for (let key in this.data)
            if (key in data) {
                result[2].push(key);
            } else {
                result[1].push(key);
            }

        for (let key in data)
            if (!(key in this.data)) result[0].push(key);

        return result;
    }

    render(data) {
        const [add, remove, update] = this.diff(data);

        for (let id of add) {
            this.data[id] = data[id];
            this.addRow(id, data);
        }

        for (let id of remove) {
            delete this.data[id];
            this.removeRow(id);
        }

        for (let id of update) {
            this.updateRow(id, data);
        }
    }
}

const gamesTable = new GamesTable(document.getElementById("games-table-body"));

let connectionID;
const socket = new WebSocket(WEBSOCKET_URL);

function createGame(e) {
    e.preventDefault();
    fetch("/createGame", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            connectionID,
            note: e.target.elements["note"].value
        })
    }).then(r => r.json()).then(function(response) {
        const data = response;

        console.log(data);

        switch (data.status) {
            case "OK":
                e.target.innerHTML = "OK. Waiting for someone else to join.";
                socket.send(`{"mode": ${window.messages.connectionModes.waitingForOpponent}}`);
                gamesTable.render({
                    "NEW": {
                        id: data.game.id,
                        note: data.game.note,
                        startDate: data.game.startDate,
                        status: data.game.status
                    }
                });
            break;

            case "taken":
                alert("Oops! Somebody was quicker than you.", "Conflict");
            break;

            default:
                alert(data.message, "Error");
        }
    });
}
function joinGame(id) {
    fetch("/joinGame", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            connectionID,
            gameID: id
        })
    }).then(r => r.json()).then(function (response) {
        const data = response;

        console.log(data);
        switch (data.status) {
            case "OK":
                window.location.href = data.gameURL;
            break;

            default:
                alert(data.message, "Error");
        }
    });
}

document.getElementById("create-game-form").addEventListener("submit", createGame);

socket.onopen = function () {
    socket.send(`{"mode": ${window.messages.connectionModes.getsGamesInfo}}`);
};
socket.onmessage = function(e) {
    const data = JSON.parse(e.data);

    console.log(data);

    if ("reload" in data) {
        alert("An error occured and you need to reload the page.");
    }

    if ("gameURL" in data) {
        window.location.href = data.gameURL;
    }

    connectionID = data.connectionID;
    gamesTable.render(data.data);
};
socket.onclose = function(e) {
    gamesTable.render([["", "server stopped sending up to date info", "", ""]]);
};
socket.onerror = function(e) {};
