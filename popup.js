document.addEventListener("DOMContentLoaded", function () {
    var DataStorage = {
        storage: localStorage,
        base_key: "trello_enhanced_",
        key: function (key) {
            return this.base_key + key;
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
            return this.get(this.getDefaultGroup()) || [];
        },
        addBoard: function (board) {
            var existingBoardData = this.getBoards();

            var boardExist = existingBoardData.some(function (boardItem) {
                return boardItem === board;
            });

            if (!boardExist) {
                existingBoardData.push(board);
                this.set(this.getDefaultGroup(), existingBoardData);;
            }
        },
        removeBoard: function (board) {
            var existingBoardData = this.getBoards();
            var indexToRemove = existingBoardData.indexOf(board);
            if (indexToRemove !== -1) {
                existingBoardData.splice(indexToRemove, 1);
                this.set(this.getDefaultGroup(), existingBoardData);
            }
        },
        getGroups: function () {
            return this.get("groups") || [];
        },
        addGroup: function (group) {
            var existingGroups = this.getGroups();

            var groupExist = existingGroups.some(function (groupItem) {
                return groupItem === group;
            });

            if (!groupExist) {
                existingGroups.push(group);
                this.set("groups", existingGroups);
            }
        },
        removeGroup: function (group) {
            var existingGroups = this.getGroups();
            var indexToRemove = existingGroups.indexOf(group);
            if (indexToRemove !== -1) {
                existingGroups.splice(indexToRemove, 1);
                this.set("groups", existingGroups);
            }
        },
        getDefaultGroup: function () {
            return str_format(this.get('default_group') || 'boards');
        },
        setDefaultGroup: function (group) {
            this.set('default_group', group);
        },
        removeDefaultGroup: function () {
            this.remove('default_group')
        }
    };

    if (
        typeof chrome !== "undefined" &&
        chrome.hasOwnProperty("tabs") &&
        chrome.tabs
    ) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "fetchBoards",
                state: DataStorage.getBoards(),
            });
        });

        chrome.runtime.onMessage.addListener(function (
            request,
            sender,
            sendResponse
        ) {
            if (request.action === "showBoards" && request.hasOwnProperty("boards")) {
                var allBoards = DataStorage.getBoards();

                if (allBoards.length < 1) {
                    request.boards.forEach((board) => {
                        DataStorage.addBoard(board);
                    });
                }

                var defaultSelectedGroup = document
                    .getElementById("group-name-input").value || DataStorage.getDefaultGroup()

                createGroupsOption(defaultSelectedGroup)
                createBoardsTable(request.boards);
            }
        });
    } else {
        console.error("chrome or chrome.tabs is not defined.");
    }

    document
        .getElementById("show-all-boards")
        .addEventListener("click", function () {
            DataStorage.remove("boards");
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showAllBoards",
                    state: DataStorage.getBoards(),
                });
            });
        });

    document
        .getElementById("add-group")
        .addEventListener("click", function (event) {
            event.preventDefault();
            var addGroupForm = document.getElementById("add-group-form");
            if (
                addGroupForm.style.display === "none" ||
                addGroupForm.style.display === ""
            ) {
                addGroupForm.style.display = "flex";
            } else {
                addGroupForm.style.display = "none";
            }
        });

    document
        .getElementById("btn-save-group")
        .addEventListener("click", function (event) {
            event.preventDefault();
            var groupNameEl = document.getElementById("group-name-input"),
                groupName = groupNameEl.value ? groupNameEl.value.trim() : null;

            if (groupName) {
                DataStorage.addGroup(groupName)

                createGroupsOption(groupName);

                DataStorage.set(str_format(groupName), getBoardCheckboxes().checked)
                groupNameEl.value = '';
                showToast('Group Name Saved.', 'success');
            } else {
                showToast('Group Name is required!', 'error');
            }
            groupNameEl.focus()
        });

    document
        .getElementById("group-list")
        .addEventListener("change", function (event) {
            event.preventDefault();
            var selectedOption = event.target.options[event.target.selectedIndex],
                groupNameEl = document.getElementById("group-name-input");

            var selectedValue = selectedOption.value;

            DataStorage.setDefaultGroup(selectedValue)

            if (
                typeof chrome !== "undefined" &&
                chrome.hasOwnProperty("tabs") &&
                chrome.tabs
            ) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "fetchBoards",
                        state: DataStorage.getBoards(),
                    });
                });
            }

            groupNameEl.value = selectedValue
            groupNameEl.focus()

            createGroupsOption(selectedValue);
        });

    document
        .getElementById("btn-delete-group")
        .addEventListener("click", function (event) {
            event.preventDefault();

            document.getElementById("confirmation-dialog").classList.add("show");
        });

    document
        .getElementById("cancel-button")
        .addEventListener("click", function (event) {
            document.getElementById("confirmation-dialog").classList.remove("show");
        })

    document
        .getElementById("confirm-button")
        .addEventListener("click", function (event) {
            var groupSelectEl = document.getElementById("group-list"),
                selectedOption = groupSelectEl.options[groupSelectEl.selectedIndex],
                groupNameEl = document.getElementById("group-name-input");

            var selectedValue = selectedOption.value;

            DataStorage.remove(DataStorage.getDefaultGroup())
            DataStorage.removeDefaultGroup()

            if (
                typeof chrome !== "undefined" &&
                chrome.hasOwnProperty("tabs") &&
                chrome.tabs
            ) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "fetchBoards",
                        state: DataStorage.getBoards(),
                    });
                });
            }
            document.getElementById("confirmation-dialog").classList.remove("show");
            groupNameEl.value = selectedValue
            groupNameEl.focus()
            showToast('Group Deleted.', 'success');
        })

    function resolveBoardId(board) {
        return board.toLowerCase().replace(/\s+/g, "_");
    }

    function createBoardsTable(boards) {
        var initialState = DataStorage.getBoards();

        var table = document.createElement("table");
        var thead = document.createElement("thead");
        var tbody = document.createElement("tbody");
        var headerRow = document.createElement("tr");
        var boardHeader = document.createElement("th");
        var actionsHeader = document.createElement("th");
        boardHeader.textContent = "Board";
        actionsHeader.textContent = "Actions";
        headerRow.appendChild(boardHeader);
        headerRow.appendChild(actionsHeader);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        boards.forEach((board) => {
            var row = document.createElement("tr");
            var boardCell = document.createElement("td");
            var actionsCell = document.createElement("td");

            var boardId = "checkbox_" + resolveBoardId(board);

            var label = document.createElement("label");
            label.textContent = board;
            label.setAttribute("for", boardId);

            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = boardId;
            checkbox.checked =
                initialState.length > 0 ? initialState.includes(board) : true;
            checkbox.setAttribute("data-board", board);

            boardCell.appendChild(label);
            actionsCell.appendChild(checkbox);
            row.appendChild(boardCell);
            row.appendChild(actionsCell);
            tbody.appendChild(row);

            checkbox.addEventListener("change", toggleBoardVisibility);
        });

        table.appendChild(tbody);
        document.getElementById("table-container").innerHTML = "";
        document.getElementById("table-container").appendChild(table);
    }

    function createGroupsOption(selectedValue) {
        var initialState = DataStorage.getGroups(),
            selectEl = document.getElementById("group-list");

        selectEl.options.length = 1;

        if (initialState.length > 0) {

            initialState.forEach(function (value) {
                var option = document.createElement("option");
                option.value = value;
                option.textContent = value;

                if (selectedValue && value === selectedValue) {
                    option.selected = true;
                }

                selectEl.appendChild(option);
            })

            if (!selectedValue) {
                selectEl.selectedIndex = selectEl.options.length - 1;
            }

            console.log(selectedValue)
        }
    }

    function getBoardCheckboxes() {
        var boardCheckboxes = document.querySelectorAll('#table-container input[type="checkbox"]'),
            checked = [],
            unchecked = [];

        if (boardCheckboxes) {
            boardCheckboxes.forEach(function (checkbox) {
                var boardName = checkbox.getAttribute('data-board');
                if (checkbox.checked) {
                    checked.push(boardName)
                } else {
                    unchecked.push(boardName)
                }
            })
        }

        return {
            checked: checked,
            unchecked: unchecked
        }
    }

    function toggleBoardVisibility() {
        var boardName = this.getAttribute("data-board");

        if (this.checked) {
            DataStorage.addBoard(boardName);
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showBoard",
                    name: boardName,
                });
            });
        } else {
            DataStorage.removeBoard(boardName);
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "hideBoard",
                    name: boardName,
                });
            });
        }
    }

    function showToast(message, type) {
        var toastContainer = document.getElementById('toast-container');
        toastContainer.classList.remove('show');
        toastContainer.textContent = message;
        toastContainer.classList.add('show');
        toastContainer.classList.add('toast-' + type);

        setTimeout(function () {
            toastContainer.classList.remove('show');
            toastContainer.classList.remove('toast-' + type);
        }, 5000);
    }

    function str_format(str) {
        return str.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    }
});
