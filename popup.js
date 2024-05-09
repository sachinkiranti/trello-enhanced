document.addEventListener("DOMContentLoaded", function () {

    var DataStorage = {
        storage: localStorage,
        base_key: 'trello_enhanced_',
        key: function (key) {
            return this.base_key + key
        },
        set: function (key, value) {
            this.storage.setItem(this.key(key), JSON.stringify(value));
        },
        get: function (key) {
            var item = this.storage.getItem(this.key(key));
            return JSON.parse(item);
        },
        remove: function (key) {
            this.storage.removeItem(this.key(key));
        },
        getBoards: function () {
            return this.get('boards') || { show: [] }
        },
        addBoard: function (board) {
            var existingBoardData = this.getBoards();
            existingBoardData.show.push(board);
            this.set('boards', existingBoardData)
        },
        removeBoard: function (board) {
            var existingBoardData = this.getBoards();
            var indexToRemove = existingBoardData.show.indexOf(board);
            if (indexToRemove !== -1) {
                existingBoardData.show.splice(indexToRemove, 1);
                this.set('boards', existingBoardData)
            }
        }
    };

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "fetchBoards",
            state: DataStorage.getBoards()
        });
    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'showBoards' && request.hasOwnProperty('boards')) {
            var allBoards = DataStorage.getBoards();

            if (allBoards.show.length < 1) {
                request.boards.forEach(board => {
                    DataStorage.addBoard(board);
                })
            }
            createBoardsTable(request.boards)
        }
    });

    document.getElementById('show-all-boards').addEventListener('click', function() {
        DataStorage.remove('boards');
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "showAllBoards",
                state: DataStorage.getBoards()
            });
        });
    });

    function resolveBoardId(board) {
        return board.toLowerCase().replace(/\s+/g, '_');
    }

    function createBoardsTable(boards)
    {
        var initialState = DataStorage.getBoards();

        var table = document.createElement('table');
        var thead = document.createElement('thead');
        var tbody = document.createElement('tbody');
        var headerRow = document.createElement('tr');
        var boardHeader = document.createElement('th');
        var actionsHeader = document.createElement('th');
        boardHeader.textContent = 'Board';
        actionsHeader.textContent = 'Actions';
        headerRow.appendChild(boardHeader);
        headerRow.appendChild(actionsHeader);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        boards.forEach(board => {
            var row = document.createElement('tr');
            var boardCell = document.createElement('td');
            var actionsCell = document.createElement('td');

            var boardId = 'checkbox_' + resolveBoardId(board)

            var label = document.createElement('label');
            label.textContent = board;
            label.setAttribute('for', boardId);

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = boardId;
            checkbox.checked = initialState.show.length > 0 ? initialState.show.includes(board) : true;
            checkbox.setAttribute('data-board', board);

            boardCell.appendChild(label);
            actionsCell.appendChild(checkbox);
            row.appendChild(boardCell);
            row.appendChild(actionsCell);
            tbody.appendChild(row);

            checkbox.addEventListener('change', toggleBoardVisibility);
        });

        table.appendChild(tbody);
        document.getElementById('tableContainer').innerHTML = ''
        document.getElementById('tableContainer').appendChild(table);
    }

    function toggleBoardVisibility() {
        var boardName = this.getAttribute('data-board');

        if (this.checked) {
            DataStorage.addBoard(boardName);
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "showBoard", name: boardName });
            });
        } else {
            DataStorage.removeBoard(boardName);
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "hideBoard", name: boardName });
            });
        }
    }

});
