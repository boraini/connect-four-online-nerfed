const BOARD_COLUMNS = 7;
const BOARD_ROWS = 6;

const winningPositions = {
    horizontal: [],
    vertical: [],
    diagonalRight: [],
    diagonalLeft: []
}

for (let i = 0; i < BOARD_COLUMNS; i++) {
    for (let j = 0; j < BOARD_ROWS - 3; j++) {
        winningPositions.vertical.push([
            [i, j], [i, j + 1], [i, j + 2], [i, j + 3]
        ]);
    }
}

for (let i = 0; i < BOARD_COLUMNS - 3; i++) {
    for (let j = 0; j < BOARD_ROWS; j++) {
        winningPositions.horizontal.push([
            [i, j], [i + 1, j], [i + 2, j], [i + 3, j]
        ]);
    }
}

for (let i = 0; i < BOARD_COLUMNS - 3; i++) {
    for (let j = 0; j < BOARD_ROWS - 3; j++) {
        winningPositions.diagonalRight.push([
            [i, j], [i + 1, j + 1], [i + 2, j + 2], [i + 3, j + 3]
        ]);
        winningPositions.diagonalLeft.push([
            [i, j + 3], [i + 1, j + 2], [i + 2, j + 1], [i + 3, j]
        ]);
    }
}

module.exports = winningPositions;
