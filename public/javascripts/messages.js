const messages = {
    statusMessages: {
        invalidMessage: "Your client has sent an invalid live connection message.",
        connectionLost: "Connection to the server was lost! Please go to the main page and join another game.",
        connectionError: "An error occured with the live connection. Please go to the main page and join another game.",
        waiting: "Waiting for the other player...",
        gameClosed: "This game was closed on the server. You can go and join another game.",
        leavePrompt: "Are you sure you want to leave? There is no going back!",
        wrongColumn: "You can't play in that column.",
        notYourTurn: "Please wait for the other player.",
        yourTurn: "Your Turn",
        opponentsTurn: "Opponent's Turn",
        win: "You Win!",
        lose: "You Lose.",
        tie: "Tie."
    }
};

if (typeof module != "undefined") module.exports = messages;
if (typeof window != "undefined") window.messages = messages;
