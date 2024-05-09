chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "fetchBoards") {
        fetchBoards(request.state);
    } else if (request.action === "showBoard" && request.hasOwnProperty("name")) {
        showBoard(request.name);
    } else if (request.action === "hideBoard" && request.hasOwnProperty("name")) {
        hideBoard(request.name);
    } else if (request.action === 'showAllBoards') {
        fetchBoards(request.state);
    }
});

function fetchBoards(boardState) {
    var trelloBoard = document.querySelector("#board");
    if (trelloBoard) {
        var boardList = trelloBoard.querySelectorAll("li");

        if (boardList.length) {
            var boards = [];
            boardList.forEach(function (li) {
                var h2Element = li.querySelector("h2");
                if (h2Element) {
                    var h2Text = h2Element.innerText;
                    boards.push(h2Text);
                }
            });
            chrome.runtime.sendMessage({ action: "showBoards", boards: boards });

            initBoardsVisibility(boardState, boards)
        }
    } else {
        console.error('Board element with id "#board" not found.');
    }
}

function showBoard(boardName) {
    toggleBoardVisibility(boardName, true);
}

function hideBoard(boardName) {
    toggleBoardVisibility(boardName, false);
}

function initBoardsVisibility(boardState, allBoards) {
    var boardList = boardState.show;

    if(allBoards.length > 0) {
        allBoards.forEach(function (board) {
            toggleBoardVisibility(board, !boardList.length)
        })
    }

    if (boardList.length > 0) {
        boardList.forEach(function (board) {
            toggleBoardVisibility(board, true)
        })
    }
}

function toggleBoardVisibility(boardName, display) {
    var trelloBoard = document.querySelector("#board");
    if (trelloBoard) {
        var boardList = trelloBoard.querySelectorAll("li");

        if (boardList.length) {
            boardList.forEach(function (li) {
                var h2Element = li.querySelector("h2");
                if (h2Element) {
                    var h2Text = h2Element.innerText.toLowerCase().trim();
                    if (h2Text === boardName.toLowerCase().trim()) {
                        li.style.display = display ? 'block' : 'none';
                    }
                }
            });
        }
    } else {
        console.error('Board element with id "#board" not found.');
    }
}
