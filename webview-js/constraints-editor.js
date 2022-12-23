const vscode = acquireVsCodeApi();

window.addEventListener('load', main);

const TEMPLATES = {
    'Tang Nano 9K': {
        'Clock': [
            {name: 'clk', location: '52', pullMode: 'Pull Up', standard: 'LVCMOS33'}
        ],
        'LEDs': [
            {name: 'led[0]', location: '10', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[1]', location: '11', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[2]', location: '13', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[3]', location: '14', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[4]', location: '15', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[5]', location: '16', standard: 'LVCMOS18', drive: '8ma'}
        ],
        'Buttons': [
            {name: 'btn1', location: '3', standard: 'LVCMOS18'},
            {name: 'btn2', location: '4', standard: 'LVCMOS18'}
        ],
        'SD Card': [
            {name: 'sdClk', location: '36', standard: 'LVCMOS33'},
            {name: 'sdMiso', location: '39', standard: 'LVCMOS33'},
            {name: 'sdMosi', location: '37', standard: 'LVCMOS33'},
            {name: 'sdCs', location: '38', standard: 'LVCMOS33'}
        ],
        'Flash': [
            {name: 'flashClk', location: '59', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'},
            {name: 'flashMiso', location: '62', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'},
            {name: 'flashMosi', location: '61', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'},
            {name: 'flashCs', location: '60', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'}
        ],
        'UART': [
            {name: 'uartTx', location: '17', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'},
            {name: 'uartRx', location: '18', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'}
        ],
        'HDMI': [
            {name: 'hdmiTmdsData[0]', location: '71,70', drive: '8ma'},
            {name: 'hdmiTmdsData[1]', location: '73,72', drive: '8ma'},
            {name: 'hdmiTmdsData[2]', location: '75,74', drive: '8ma'},
            {name: 'hdmiTmdsClk', location: '69,68', drive: '8ma'}
        ]
    },
    'Tang Nano 4K': {
        'Clock': [
            {name: 'clk', location: '45', pullMode: 'Pull Up', standard: 'LVCMOS33'}
        ],
        'LED': [
            {name: 'led', location: '10', standard: 'LVCMOS33', drive: '8ma'}
        ],
        'HDMI': [
            {name: 'hdmiTmdsData[0]', location: '30,29', drive: '4ma'},
            {name: 'hdmiTmdsData[1]', location: '32,31', drive: '4ma'},
            {name: 'hdmiTmdsData[2]', location: '35,34', drive: '4ma'},
            {name: 'hdmiTmdsClk', location: '28,27', drive: '4ma'}
        ],
        'Button': [
            {name: 'btn1', location: '14', standard: 'LVCMOS18'},
            {name: 'btn2', location: '15', standard: 'LVCMOS18'}
        ],
        'Flash': [
            {name: 'flashClk', location: '1', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'},
            {name: 'flashMiso', location: '47', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'},
            {name: 'flashMosi', location: '48', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'},
            {name: 'flashCs', location: '2', standard: 'LVCMOS33', pullMode: 'Pull Up', drive: '8ma'}
        ],
    },
    'Tang Nano 1K': {
        'Clock': [
            {name: 'clk', location: '47', pullMode: 'Pull Up', standard: 'LVCMOS33'}
        ],
        'LED': [
            {name: 'ledR', location: '9', standard: 'LVCMOS33', drive: '8ma'},
            {name: 'ledB', location: '10', standard: 'LVCMOS33', drive: '8ma'},
            {name: 'ledG', location: '11', standard: 'LVCMOS33', drive: '8ma'}
        ],
        'Button': [
            {name: 'btn1', location: '13', standard: 'LVCMOS33'},
            {name: 'btn2', location: '44', standard: 'LVCMOS33'}
        ],
    },
    'Tang Nano': {
        'Clock': [
            {name: 'clk', location: '35'}
        ],
        'LED': [
            {name: 'ledR', location: '18'},
            {name: 'ledB', location: '17'},
            {name: 'ledG', location: '16'}
        ],
        'Button': [
            {name: 'btn1', location: '14'},
            {name: 'btn2', location: '15'}
        ],
    }
}

const pinLocations = {
    'Tang Nano 9K': [
        { x: 38, y: 33, pinNumber: 63 },
        { x: 56, y: 33, pinNumber: 86 },
        { x: 75, y: 33, pinNumber: 85 },
        { x: 94, y: 33, pinNumber: 84 },
        { x: 113, y: 33, pinNumber: 83 },
        { x: 132, y: 33, pinNumber: 82 },
        { x: 151, y: 33, pinNumber: 81 },
        { x: 169, y: 33, pinNumber: 80 },
        { x: 188, y: 33, pinNumber: 79 },
        { x: 207, y: 33, pinNumber: 77 },
        { x: 226, y: 33, pinNumber: 76 },
        { x: 245, y: 33, pinNumber: 75 },
        { x: 264, y: 33, pinNumber: 74 },
        { x: 283, y: 33, pinNumber: 73 },
        { x: 302, y: 33, pinNumber: 72 },
        { x: 321, y: 33, pinNumber: 71 },
        { x: 340, y: 33, pinNumber: 70 },
        // { x: 359, y: 33, pinNumber: 38 },
        { x: 377, y: 33, pinNumber: 48 },
        { x: 396, y: 33, pinNumber: 49 },
        { x: 415, y: 33, pinNumber: 31 },
        { x: 434, y: 33, pinNumber: 32 },
        // { x: 453, y: 33, pinNumber: 38 },
        // { x: 472, y: 33, pinNumber: 38 },

        { x: 38, y: 203, pinNumber: 38 },
        { x: 56, y: 203, pinNumber: 37 },
        { x: 75, y: 203, pinNumber: 36 },
        { x: 94, y: 203, pinNumber: 39 },
        { x: 113, y: 203, pinNumber: 25 },
        { x: 132, y: 203, pinNumber: 26 },
        { x: 151, y: 203, pinNumber: 27 },
        { x: 169, y: 203, pinNumber: 28 },
        { x: 188, y: 203, pinNumber: 29 },
        { x: 207, y: 203, pinNumber: 30 },
        { x: 226, y: 203, pinNumber: 33 },
        { x: 245, y: 203, pinNumber: 34 },
        { x: 264, y: 203, pinNumber: 40 },
        { x: 283, y: 203, pinNumber: 35 },
        { x: 302, y: 203, pinNumber: 41 },
        { x: 321, y: 203, pinNumber: 42 },
        { x: 340, y: 203, pinNumber: 51 },
        { x: 359, y: 203, pinNumber: 53 },
        { x: 377, y: 203, pinNumber: 54 },
        { x: 396, y: 203, pinNumber: 55 },
        { x: 415, y: 203, pinNumber: 56 },
        { x: 434, y: 203, pinNumber: 57 },
        { x: 453, y: 203, pinNumber: 68 },
        { x: 472, y: 203, pinNumber: 69 }
    ],
    'Tang Nano 4K': [
        { x: 57, y: 26, pinNumber: 14 },
        { x: 80, y: 26, pinNumber: 7 },
        { x: 103, y: 26, pinNumber: 4 },
        { x: 126, y: 26, pinNumber: 3 },
        { x: 149, y: 26, pinNumber: 6 },
        // { x: 172, y: 26, pinNumber: 63 },
        // { x: 195, y: 26, pinNumber: 63 },
        { x: 218, y: 26, pinNumber: 44 },
        { x: 241, y: 26, pinNumber: 46 },
        { x: 264, y: 26, pinNumber: 1 },
        { x: 287, y: 26, pinNumber: 48 },
        { x: 310, y: 26, pinNumber: 47 },
        { x: 333, y: 26, pinNumber: 43 },
        { x: 356, y: 26, pinNumber: 42 },
        { x: 379, y: 26, pinNumber: 41 },
        { x: 402, y: 26, pinNumber: 40 },
        { x: 425, y: 26, pinNumber: 39 },
        { x: 448, y: 26, pinNumber: 10 },
        { x: 471, y: 26, pinNumber: 35 },
        { x: 494, y: 26, pinNumber: 34 },
        { x: 517, y: 26, pinNumber: 32 },
        { x: 540, y: 26, pinNumber: 31 },

        { x: 57, y: 211, pinNumber: 15 },
        // { x: 80, y: 211, pinNumber: 63 },
        // { x: 103, y: 211, pinNumber: 63 },
        // { x: 126, y: 211, pinNumber: 63 },
        // { x: 149, y: 211, pinNumber: 63 },
        { x: 172, y: 211, pinNumber: 2 },
        { x: 195, y: 211, pinNumber: 33 },
        { x: 218, y: 211, pinNumber: 8 },
        { x: 241, y: 211, pinNumber: 9 },
        { x: 264, y: 211, pinNumber: 16 },
        { x: 287, y: 211, pinNumber: 13 },
        { x: 310, y: 211, pinNumber: 17 },
        { x: 333, y: 211, pinNumber: 18 },
        { x: 356, y: 211, pinNumber: 19 },
        { x: 379, y: 211, pinNumber: 20 },
        { x: 402, y: 211, pinNumber: 21 },
        { x: 425, y: 211, pinNumber: 22 },
        { x: 448, y: 211, pinNumber: 23 },
        { x: 471, y: 211, pinNumber: 27 },
        { x: 494, y: 211, pinNumber: 28 },
        { x: 517, y: 211, pinNumber: 29 },
        { x: 540, y: 211, pinNumber: 30 }
    ],
    'Tang Nano 1K': [
        { x: 22, y: 35, pinNumber: 28 },
        { x: 46, y: 35, pinNumber: 27 },
        { x: 70, y: 35, pinNumber: 15 },
        { x: 93, y: 35, pinNumber: 16 },
        { x: 117, y: 35, pinNumber: 17 },
        { x: 141, y: 35, pinNumber: 18 },
        { x: 165, y: 35, pinNumber: 22 },
        { x: 189, y: 35, pinNumber: 23 },
        { x: 212, y: 35, pinNumber: 24 },
        { x: 235, y: 35, pinNumber: 10 },
        { x: 259, y: 35, pinNumber: 9 },
        { x: 282, y: 35, pinNumber: 11 },
        { x: 306, y: 35, pinNumber: 46 },
        { x: 330, y: 35, pinNumber: 45 },
        { x: 353, y: 35, pinNumber: 47 },
        // { x: 377, y: 35, pinNumber: 30 },
        // { x: 400, y: 35, pinNumber: 30 },
        // { x: 424, y: 35, pinNumber: 30 },
        // { x: 448, y: 35, pinNumber: 30 },
        { x: 471, y: 35, pinNumber: 13 },
        // { x: 495, y: 35, pinNumber: 30 },
        // { x: 495, y: 59, pinNumber: 30 },

        { x: 22, y: 199, pinNumber: 31 },
        { x: 46, y: 199, pinNumber: 30 },
        { x: 70, y: 199, pinNumber: 29 },
        { x: 93, y: 199, pinNumber: 19 },
        { x: 117, y: 199, pinNumber: 20 },
        { x: 141, y: 199, pinNumber: 34 },
        { x: 165, y: 199, pinNumber: 35 },
        { x: 189, y: 199, pinNumber: 42 },
        { x: 212, y: 199, pinNumber: 39 },
        { x: 235, y: 199, pinNumber: 38 },
        { x: 259, y: 199, pinNumber: 41 },
        { x: 282, y: 199, pinNumber: 40 },
        { x: 306, y: 199, pinNumber: 26 },
        { x: 330, y: 199, pinNumber: 29 },
        { x: 353, y: 199, pinNumber: 30 },
        // { x: 377, y: 199, pinNumber: 30 },
        // { x: 400, y: 199, pinNumber: 30 },
        // { x: 424, y: 199, pinNumber: 30 },
        // { x: 448, y: 199, pinNumber: 30 },
        { x: 471, y: 199, pinNumber: 44 },
        // { x: 495, y: 199, pinNumber: 30 },
        // { x: 495, y: 173, pinNumber: 30 }
    ],
    'Tang Nano': [
        { x: 94, y: 64, pinNumber: 7 },
        { x: 94, y: 39, pinNumber: 4 },
        { x: 118, y: 39, pinNumber: 14 },
        // { x: 141, y: 39, pinNumber: 23 },
        // { x: 164, y: 39, pinNumber: 23 },
        // { x: 187, y: 39, pinNumber: 23 },
        // { x: 210, y: 39, pinNumber: 23 },
        { x: 233, y: 39, pinNumber: 13 },
        { x: 256, y: 39, pinNumber: 9 },
        { x: 279, y: 39, pinNumber: 8 },
        { x: 302, y: 39, pinNumber: 5 },
        { x: 325, y: 39, pinNumber: 46 },
        { x: 348, y: 39, pinNumber: 10 },
        { x: 371, y: 39, pinNumber: 11 },
        { x: 394, y: 39, pinNumber: 45 },
        { x: 417, y: 39, pinNumber: 44 },
        { x: 441, y: 39, pinNumber: 43 },
        { x: 465, y: 39, pinNumber: 42 },
        { x: 488, y: 39, pinNumber: 41 },
        { x: 511, y: 39, pinNumber: 40 },
        { x: 534, y: 39, pinNumber: 39 },
        { x: 556, y: 39, pinNumber: 38 },

        { x: 94, y: 174, pinNumber: 3 },
        { x: 94, y: 200, pinNumber: 6 },
        { x: 118, y: 200, pinNumber: 15 },
        // { x: 141, y: 200, pinNumber: 23 },
        // { x: 164, y: 200, pinNumber: 23 },
        { x: 187, y: 200, pinNumber: 23 },
        { x: 210, y: 200, pinNumber: 19 },
        { x: 233, y: 200, pinNumber: 24 },
        { x: 256, y: 200, pinNumber: 22 },
        { x: 279, y: 200, pinNumber: 21 },
        { x: 302, y: 200, pinNumber: 20 },
        { x: 325, y: 200, pinNumber: 18 },
        { x: 348, y: 200, pinNumber: 17 },
        { x: 371, y: 200, pinNumber: 16 },
        { x: 394, y: 200, pinNumber: 34 },
        { x: 417, y: 200, pinNumber: 33 },
        { x: 441, y: 200, pinNumber: 32 },
        { x: 465, y: 200, pinNumber: 31 },
        { x: 488, y: 200, pinNumber: 30 },
        { x: 511, y: 200, pinNumber: 29 },
        { x: 534, y: 200, pinNumber: 28 },
        { x: 556, y: 200, pinNumber: 27 },
    ]
}

const getBoardImages = () => {
    const tangnano9kBoard = document.getElementById('tangnano9k-board');
    const tangnano4kBoard = document.getElementById('tangnano4k-board');
    const tangnano1kBoard = document.getElementById('tangnano1k-board');
    const tangnanoBoard = document.getElementById('tangnano-board');

    return {
        'Tang Nano 9K': tangnano9kBoard,
        'Tang Nano 4K': tangnano4kBoard,
        'Tang Nano 1K': tangnano1kBoard,
        'Tang Nano': tangnanoBoard
    }
}

const showBoardImage = (boardImages, chosenBoard) => {
    for (const board in boardImages) {
        if (board === chosenBoard) {
            boardImages[board].classList.remove('hide');
        } else if (!boardImages[board].classList.contains('hide')) {
            boardImages[board].classList.add('hide');
        }
    }
}

const recalculateOptions = (row) => {
    const options = [];

    if (row.drive) {
        options.push(`${row.drive} Drive`);
    }
    if (row.pullMode) {
        options.push(`${row.pullMode}`);
    }
    if (row.standard) {
        options.push(`${row.standard}`);
    }

    row.options = options.join(', ');
} 
                    
function main() {
    const constraintsTable = document.getElementById("constraints-table");
    const boardSelect = document.getElementById("board-select");
    const noConstraintMessage = document.getElementById("no-constraint");
    const editPanel = document.getElementById("edit-window");
    const editPortName = document.getElementById("edit-port-name");
    const editPortLocation = document.getElementById("edit-port-location");
    const removeConstraintBtn = document.getElementById("remove-constraint");
    const addConstraintBtn = document.getElementById("add-constraint");
    const driveSelect = document.getElementById("drive-select");
    const standardSelect = document.getElementById("standard-select");
    const pullModeSelect = document.getElementById("pull-select");
    const addConstraintTemplateBtn = document.getElementById('add-constraint-templates');
    const showTemplateWindowBtn = document.getElementById('show-templates');
    const popup = document.getElementById('popup-container');
    const cancelPopupBtn = document.getElementById('cancel-templates');
    const templateContainer = document.getElementById('template-options');
    const noConstrainsMsg = document.getElementById('no-constraints-msg');
    const selectPinBtn = document.getElementById('select-pin');
    const pinContainer = document.getElementById('pin-container');
    const cancelBoardPopupBtn = document.getElementById('cancel-board');
    const boardPopup = document.getElementById('board-popup-container');
    const boardImages = getBoardImages();
    let isEditable = false;
    let templates = {}
    let pins = {};
    let board = 'Tang Nano 9K';

    constraintsTable.rowsData = [];
    constraintsTable.columnDefinitions = [
        { columnDataKey: "name", title: "PORT NAME" },
        { columnDataKey: "location", title: "LOCATION" },
        { columnDataKey: "options", title: "PORT OPTIONS" },
    ];

    if (constraintsTable.rowsData.length === 0) {
        noConstrainsMsg.classList.remove('hide');
    }

    const updateConstraintsTable = () => {
        if (constraintsTable.rowsData.length === 0) {
            noConstrainsMsg.classList.remove('hide');
        } else if (!noConstrainsMsg.classList.contains('hide')) {
            noConstrainsMsg.classList.add('hide');
        }
        constraintsTable.rowsData = constraintsTable.rowsData.slice(0);
    }

    const selectPin = (pin) => {
        if (editRowIndex !== null && constraintsTable.rowsData[editRowIndex]) {
            constraintsTable.rowsData[editRowIndex] = {
                ...constraintsTable.rowsData[editRowIndex],
                location: '' + pin
            };
            vscode.postMessage({ 
                type: 'edit', 
                editType: 'change',
                rowIndex: editRowIndex,
                field: 'location',
                newValue: constraintsTable.rowsData[editRowIndex].location
            });
        }
        updateEditWindow();
        updateConstraintsTable();
        boardPopup.classList.add('hide');
    }

    const setupBoard = () => {
        templates = TEMPLATES[board] || {};
        pins = pinLocations[board] || [];
        templateContainer.innerHTML = Object.keys(templates).map((templateName) => {
            return `<p><vscode-checkbox>${templateName}</vscode-checkbox></p>`
        }).join('');
        showBoardImage(boardImages, board);
        pinContainer.innerHTML = '';
        pins.forEach((pin) => {
            const button = document.createElement('vscode-button');
            button.id = `pin${pin.pinNumber}`;
            button.classList.add('pin-btn');
            button.setAttribute('appearance', 'icon');
            const icon = document.createElement('span');
            icon.classList.add('codicon');
            icon.classList.add('codicon-pass-filled');
            button.appendChild(icon);
            button.addEventListener('click', () => selectPin(pin.pinNumber));
            button.style.left = `${pin.x}px`;
            button.style.top = `${pin.y}px`;
            pinContainer.appendChild(button);
        });
        updateEditWindow();
    }

    boardSelect.addEventListener('change', () => {
        board = boardSelect.value;
        setupBoard();
    });

    selectPinBtn.addEventListener('click', () => {
        boardPopup.classList.remove('hide');
    });
    cancelBoardPopupBtn.addEventListener('click', () => {
        if (!boardPopup.classList.contains('hide')) {
            boardPopup.classList.add('hide');
        }
    })
    boardPopup.addEventListener('click', (e) => {
        if (e.target === boardPopup) {
            boardPopup.classList.add('hide');
        }
    });

    showTemplateWindowBtn.addEventListener('click', () => {
        const options = templateContainer.querySelectorAll('vscode-checkbox');
        options.forEach((opt) => {
            opt.checked = false;
        });
        popup.classList.remove('hide');
    });
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.add('hide');
        }
    });
    cancelPopupBtn.addEventListener('click', () => {
        if (!popup.classList.contains('hide')) {
            popup.classList.add('hide');
        }
    });
    addConstraintTemplateBtn.addEventListener('click', () => {
        const options = templateContainer.querySelectorAll('vscode-checkbox');
        const newTemplates = [];
        options.forEach((option) => {
            const optName = option.innerText.trim();
            if (!templates[optName]) { return; }
            if (option.checked) {
                templates[optName].forEach((newConstraint) => {
                    recalculateOptions(newConstraint);
                    newTemplates.push(newConstraint);
                });   
            }
        });
        if (newTemplates.length > 0) {
            const index = constraintsTable.length;
            constraintsTable.rowsData = [
                ...constraintsTable.rowsData,
                ...newTemplates
            ]
            vscode.postMessage({ 
                type: 'edit', 
                editType: 'template',
                rowIndex: index,
                rowValues: newTemplates
            });
            updateConstraintsTable();
        }
        if (!popup.classList.contains('hide')) {
            popup.classList.add('hide');
        }
    });

    let editRowIndex = null;

    const updateEditWindow = () => {
        if (editRowIndex === null || !constraintsTable.rowsData[editRowIndex]) {
            noConstraintMessage.classList.remove('hide');
            if (!editPanel.classList.contains('hide')) {
                editPanel.classList.add('hide');
            }
            return;
        }
        
        pinContainer.querySelectorAll('.pin-btn').forEach((el) => {
            el.classList.remove('selected');
            el.classList.remove('used');
        });

        const data = constraintsTable.rowsData[editRowIndex];
        editPanel.classList.remove('hide');
        if (!noConstraintMessage.classList.contains('hide')) {
            noConstraintMessage.classList.add('hide');
        }

        const pinNumbers = [];
        
        constraintsTable.rowsData.forEach((row, i) => {
            if (i === editRowIndex) { return; }
            const numbers = row.location.split(',');
            numbers.map((n) => +(n.trim())).forEach(number => {
                const button = pinContainer.querySelector(`#pin${number}`);
                if (button) {
                    button.classList.add('used');
                }
            });
        })
        if (data.location) {
            const numbers = data.location.split(',');
            numbers.map((n) => +(n.trim())).forEach(number => {
                const button = pinContainer.querySelector(`#pin${number}`);
                if (button) {
                    button.classList.add('selected');
                }
            });
        }

        editPortName.value = data.name;
        editPortLocation.value = data.location === '<Not Selected>' ? '' : data.location;
        if (data.drive) {
            driveSelect.value = data.drive;
        } else {
            driveSelect.value = 'Unset';
        }
        if (data.standard) {
            standardSelect.value = data.standard;
        } else {
            standardSelect.value = 'Unset';
        }
        if (data.pullMode) {
            pullModeSelect.value = data.pullMode;
        } else {
            pullModeSelect.value = 'None';
        }
    }

    const updateTableHighlight = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
            if (!document.activeElement.id === 'constraints-table') {
                constraintsTable.focus();
            }
            const rows = constraintsTable.querySelectorAll('vscode-data-grid-row');
            rows.forEach((row) => {
                if (row.rowIndex === (editRowIndex + 1) && row.rowIndex > 0) {
                    if (!row.classList.contains('highlight')) {
                        row.classList.add('highlight');
                    }
                } else {
                    row.classList.remove('highlight')
                }
            });
            updateEditWindow();
        });
        });
    }

    constraintsTable.addEventListener('cell-focused', (cellEvent) => {
        editRowIndex = cellEvent.detail.parentElement.rowIndex - 1;
        updateTableHighlight();
    });

    addConstraintBtn.addEventListener('click', () => {
        const newRow = {name: `port${constraintsTable.rowsData.length+1}`, location: '<Not Selected>', options: ''};
        constraintsTable.rowsData = [
            newRow,
            ...constraintsTable.rowsData
        ];
        vscode.postMessage({ 
            type: 'edit', 
            editType: 'addition',
            rowIndex: constraintsTable.rowsData.length - 1,
            rowValue: newRow
        });
        editRowIndex = 0;
        updateConstraintsTable();
        updateTableHighlight();
    });

    removeConstraintBtn.addEventListener('click', () => {
        if (editRowIndex === null || !constraintsTable.rowsData[editRowIndex]) {
            return;
        }

        vscode.postMessage({ 
            type: 'edit', 
            editType: 'deletion',
            rowIndex: editRowIndex,
            rowValue: constraintsTable.rowsData[editRowIndex]    
        });
        
        constraintsTable.rowsData.splice(editRowIndex, 1);
        if (constraintsTable.rowsData.length === 0) {
            editRowIndex = null;
        } else {
            editRowIndex = Math.max(0,Math.min(constraintsTable.rowsData.length-1, (editRowIndex) || 0));
        }
        updateConstraintsTable();
        updateTableHighlight();
    });

    const changeCallbackForField = (fieldName, defaultVal) => {
        return (e) => {
            if (constraintsTable.rowsData[editRowIndex]) {
                const val = this.value || e.target.value;
                constraintsTable.rowsData[editRowIndex] = {
                    ...constraintsTable.rowsData[editRowIndex],
                    [fieldName]: (!val || ['None', 'Unset'].includes(val)) ? defaultVal : val
                }
                vscode.postMessage({ 
                    type: 'edit', 
                    editType: 'change',
                    rowIndex: editRowIndex,
                    field: fieldName,
                    newValue: constraintsTable.rowsData[editRowIndex][fieldName]
                });
                recalculateOptions(constraintsTable.rowsData[editRowIndex]);
                updateConstraintsTable();
            }
        }
    }

    editPortName.addEventListener('input', changeCallbackForField('name'));
    editPortLocation.addEventListener('input', changeCallbackForField('location', '<Not Selected>'));
    driveSelect.addEventListener('change', changeCallbackForField('drive', '').bind(driveSelect));
    pullModeSelect.addEventListener('change', changeCallbackForField('pullMode', '').bind(pullModeSelect));
    standardSelect.addEventListener('change', changeCallbackForField('standard', '').bind(standardSelect));

    const setDefaults = async () => {
        constraintsTable.rowsData = [];
        editRowIndex = null;
        updateConstraintsTable();
        updateEditWindow();
    }

    const loadFile = async (body, edits) => {
        const decoder = new TextDecoder();
        const text = body ? decoder.decode(body) : '';
        const rows = text.split('\n');
        const ioLocRegex = /IO_LOC\s+"([^"]+)"\s+(\d+\s*,?\s*(\d+)?)\s*;/;
        const ioPortRegex = /IO_PORT\s+"([^"]+)"\s+([^;]+)\s*;/;
        const portMap = {};
        rows.forEach((row) => {
            const ioLocMatch = ioLocRegex.exec(row);
            if (ioLocMatch) {
                if (!portMap[ioLocMatch[1]]) {
                    portMap[ioLocMatch[1]] = {name: ioLocMatch[1]};
                }
                portMap[ioLocMatch[1]].location = ioLocMatch[2];
                return;
            }
            const ioPortMatch = ioPortRegex.exec(row);
            if (ioPortMatch) {
                if (!portMap[ioPortMatch[1]]) {
                    portMap[ioPortMatch[1]] = {name: ioPortMatch[1]};
                }
                const options = ioPortMatch[2].split(' ').filter((opt) => !!opt);
                options.forEach((opt) => {
                    const keyVal = opt.split('=');
                    if (keyVal.length !== 2) {
                        return;
                    }
                    const optKey = keyVal[0].trim();
                    const optVal = keyVal[1].trim();
                    if (optKey === 'IO_TYPE') {
                        portMap[ioPortMatch[1]].standard = optVal;
                    } else if (optKey === 'PULL_MODE') {
                        portMap[ioPortMatch[1]].pullMode = (optVal === 'DOWN') ? 'Pull Down' : (optVal === 'UP') ? 'Pull Up' : (optVal === 'NONE') ? '' : optVal;
                    } else if (optKey === 'DRIVE') {
                        const driveMap = {
                            '4': '4ma',
                            '8': '8ma',
                            '12': '12ma',
                            '16': '16ma',
                            '24': '24ma'
                        }
                        const driveOption = driveMap[optVal];
                        portMap[ioPortMatch[1]].drive = driveOption ? driveOption : optVal;
                    }
                });
                return;
            }
        })
        const constraintsToAdd = Object.values(portMap);
        constraintsToAdd.forEach((constraintRow) => {
            recalculateOptions(constraintRow);
        })
        if (body) {
        constraintsTable.rowsData = constraintsToAdd;
        }
        edits.forEach((edit) => {
            handleEdit(edit);
        })
        updateConstraintsTable();
        updateEditWindow();
    }

    const convertToConstraintsText = async () => {
        const constraints = constraintsTable.rowsData;
        let fileRows = [
            '// Generated with Lushay Code',
            ''
        ];
        constraints.forEach((constraint) => {
            if (constraint.location && constraint.location !== '<Not Selected>') {
                fileRows.push(`IO_LOC  "${constraint.name}" ${constraint.location};`);
            }
            const constraintOptions = [];
            if (constraint.drive) {
                const driveMap = {
                    '4ma': '4',
                    '8ma': '8',
                    '12ma': '12',
                    '16ma': '16',
                    '24ma': '24'
                }
                const driveOption = driveMap[constraint.drive];
                constraintOptions.push(`DRIVE=${driveOption ? driveOption : constraint.drive}`);
            }
            if (constraint.standard) {
                constraintOptions.push(`IO_TYPE=${constraint.standard}`);
            }
            if (constraint.pullMode) {
                if (constraint.pullMode === 'Pull Up') {
                    constraintOptions.push('PULL_MODE=UP');
                } else if (constraint.pullMode === 'Pull Down') {
                    constraintOptions.push('PULL_MODE=UP');
                } else {
                    constraintOptions.push(`PULL_MODE=${constraint.pullMode}`);
                }
            }
            if (constraintOptions.length > 0) {
                fileRows.push(`IO_PORT "${constraint.name}" ${constraintOptions.join(' ')};`);
            }
            fileRows.push('');
        });
        return fileRows.join('\n');
    }

    const handleEdit = (edit) => {
        if (edit.editType === 'change') {
            constraintsTable.rowsData[edit.rowIndex][edit.field] = edit.newValue;
            recalculateOptions(constraintsTable.rowsData[edit.rowIndex]);
        } else if (edit.editType === 'deletion') {
            constraintsTable.rowsData.splice(edit.rowIndex, 1);
        } else if (edit.editType === 'addition') {
            const row = edit.rowValue;
            recalculateOptions(row);
            constraintsTable.rowsData.splice(edit.rowIndex, 0, row);
        } else if (edit.editType === 'template') {
            const rows = edit.rowValues;
            rows.forEach(recalculateOptions);
            constraintsTable.rowsData.splice(edit.rowIndex, 0, ...rows);
        }
    };
    // Handle messages from the extension
	window.addEventListener('message', async e => {
		const { type, body, requestId } = e.data;
		switch (type) {
			case 'init':
				{
                    isEditable = body.editable;
					if (body.untitled) {
						await setDefaults();
						return;
					} else {
						// Load the initial image into the canvas.
						await loadFile(body.value, []);
						return;
					}
				}
			case 'update':
				{
                    await loadFile(body.content, body.edits)
					return;
				}
			case 'getFileData':
				{
					const constraintsData = await convertToConstraintsText();
                    let utf8Encode = new TextEncoder();
                    vscode.postMessage({ type: 'response', requestId, body: utf8Encode.encode(constraintsData) });
					return;
				}
		}
	});

    
    setupBoard();
	// Signal to VS Code that the webview is initialized.
	vscode.postMessage({ type: 'ready' });
}
