import React, { useState, useEffect } from "react";
import "./App.css";
import Square from "./Square/Square";
import { io } from "socket.io-client";
import Swal from "sweetalert2";

const serverIP = '192.168.29.180';
const serverPort = 8080;

const renderFrom = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
];

const App = () => {
    const ORIGIN = `http://${serverIP}:${serverPort}`;
    const [gameState, setGameState] = useState(renderFrom);
    const [currentPlayer, setCurrentPlayer] = useState("circle");
    const [finishedState, setFinishetState] = useState(false);
    const [finishedArrayState, setFinishedArrayState] = useState([]);
    const [playOnline, setPlayOnline] = useState(false);
    const [socket, setSocket] = useState(null);
    const [playerName, setPlayerName] = useState("");
    const [opponentName, setOpponentName] = useState(null);
    const [playingAs, setPlayingAs] = useState(null);

    const checkWinner = () => {
        // row dynamic
        for (let row = 0; row < gameState.length; row++) {
            if (
                gameState[row][0] === gameState[row][1] &&
                gameState[row][1] === gameState[row][2]
            ) {
                setFinishedArrayState([row * 3 + 0, row * 3 + 1, row * 3 + 2]);
                return gameState[row][0];
            }
        }

        // column dynamic
        for (let col = 0; col < gameState.length; col++) {
            if (
                gameState[0][col] === gameState[1][col] &&
                gameState[1][col] === gameState[2][col]
            ) {
                setFinishedArrayState([0 * 3 + col, 1 * 3 + col, 2 * 3 + col]);
                return gameState[0][col];
            }
        }

        if (
            gameState[0][0] === gameState[1][1] &&
            gameState[1][1] === gameState[2][2]
        ) {
            setFinishedArrayState([0, 4, 8]);
            return gameState[0][0];
        }

        if (
            gameState[0][2] === gameState[1][1] &&
            gameState[1][1] === gameState[2][0]
        ) {
            setFinishedArrayState([2, 4, 6]);
            return gameState[0][2];
        }

        const isDrawMatch = gameState.flat().every((e) => {
            if (e === "circle" || e === "cross") return true;
        });

        if (isDrawMatch) return "draw";

        return null;
    };

    useEffect(() => {
        const winner = checkWinner();
        if (winner) {
            console.log(finishedArrayState);
            setFinishetState(winner);
        }
    }, [gameState]);

    const takePlayerName = async () => {
        const result = await Swal.fire({
            title: "Enter your name",
            input: "text",
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return "You need to write something!";
                }
            },
        });

        return result;
    };

    socket?.on("opponentLeftMatch", () => {
        setFinishetState("opponentLeftMatch");
    });

    socket?.on("playerMoveFromServer", (data) => {
        const id = data.state.id;
        setGameState((prevState) => {
            let newState = [...prevState];
            const rowIndex = Math.floor(id / 3);
            const colIndex = id % 3;
            newState[rowIndex][colIndex] = data.state.sign;
            return newState;
        });
        setCurrentPlayer(data.state.sign === "circle" ? "cross" : "circle");
    });

    socket?.on("connect", function () {
        setPlayOnline(true);
    });

    socket?.on("OpponentNotFound", function () {
        setOpponentName(false);
    });

    socket?.on("OpponentFound", function (data) {
        setPlayingAs(data.playingAs);
        setOpponentName(data.opponentName);
    });

    async function playOnlineClick() {
        const result = await takePlayerName();

        if (!result.isConfirmed) {
            return;
        }

        const username = result.value;
        setPlayerName(username);

        const newSocket = io(`${ORIGIN}`, {
            autoConnect: true,
        });

        newSocket?.emit("request_to_play", {
            playerName: username,
        });

        setSocket(newSocket);
    }

    if (!playOnline) {
        return (
            <div className="main-div">
                <button onClick={playOnlineClick} className="playOnline">
                    Play Online
                </button>
            </div>
        );
    }

    if (playOnline && !opponentName) {
        return (
            <div className="waiting text-white">
                <p>Waiting for opponent</p>
            </div>
        );
    }

    return (
        <div className="main-div">
            <div className="move-detection m-10">
                <div
                    className={`py-1 px-10 text-2xl text-yellow-100 left ${
                        finishedState || playingAs === currentPlayer
                            ? "bg-[#3fa7f0]"
                            : ""
                    }`}
                >
                    {playerName}
                </div>
                <div
                    className={`py-1 px-7 text-2xl text-yellow-100 right ${
                        finishedState || playingAs !== currentPlayer
                            ? "bg-[#3fa7f0]"
                            : ""
                    }`}
                >
                    {opponentName}
                </div>
            </div>

            <div>
                <h1 className="game-heading water-background text-5xl font-bold text-yellow-400">
                    Tic Tac Toe
                </h1>
                <div className="square-wrapper m-7">
                    {gameState.map((arr, rowIndex) =>
                        arr.map((e, colIndex) => {
                            return (
                                <Square
                                    socket={socket}
                                    playingAs={playingAs}
                                    gameState={gameState}
                                    finishedArrayState={finishedArrayState}
                                    finishedState={finishedState}
                                    currentPlayer={currentPlayer}
                                    setCurrentPlayer={setCurrentPlayer}
                                    setGameState={setGameState}
                                    id={rowIndex * 3 + colIndex}
                                    key={rowIndex * 3 + colIndex}
                                    currentElement={e}
                                />
                            );
                        })
                    )}
                </div>

                {finishedState &&
                    finishedState !== "opponentLeftMatch" &&
                    finishedState !== "draw" && (
                        <h3 className="text-center text-2xl text-yellow-400">
                            {finishedState == playingAs
                                ? "You won the game"
                                : "Opponent won the game"}
                        </h3>
                    )}
                {finishedState &&
                    finishedState !== "opponentLeftMatch" &&
                    finishedState === "draw" && (
                        <h3 className="text-center text-2xl text-yellow-400">
                            It's a Draw
                        </h3>
                    )}
            </div>

            {!finishedState && opponentName && (
                <h2 className="text-center text-3xl text-yellow-100">
                    You are playing against {opponentName}
                </h2>
            )}

            {finishedState && finishedState === "opponentLeftMatch" && (
                <h2 className="text-center text-3xl text-yellow-100">
                    You won the match, Opponent has left
                </h2>
            )}

            {finishedState && (
                <button
                    className="m-3 px-4 py-2 text-xl bg-[#1089df] text-yellow-50 text-center rounded-lg hover:bg-[#054a7c]"
                    onClick={() => location.reload()}
                >
                    Play Again!
                </button>
            )}
        </div>
    );
};

export default App;
