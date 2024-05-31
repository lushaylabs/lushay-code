const vscode = acquireVsCodeApi();

window.addEventListener('load', main);
let selectedModule = null;
let loadedModules = [];
let currentInputs = {};
let currentOutputs = {};
let currentMouseDownPort = null;
let currentActionDirection = null;
let currentMouseDownIndex = null;
let currentDragMode = null;
let fileData = {};
let currentActionSignal = null;
const numCells = 100;

function updateOutput() {
    vscode.postMessage({
        command: 'run-module',
        data: {
            moduleName: selectedModule.name,
            inputs: currentInputs,
        }
    });
}

const debouncedUpdateOutput = () => {
    clearTimeout(debouncedUpdateOutput.timeout);
    debouncedUpdateOutput.timeout = setTimeout(updateOutput, 150);
}

function updateOutputArea(inputs, cases) {

    const columns = document.querySelectorAll(`.port-column`);
    for (let i = 0; i < cases.length; i++) {
        for (const key in cases[i]) {
            if (currentOutputs[key]) {
                currentOutputs[key].value[i] = parseInt(cases[i][key], 2);
                if (currentOutputs[key].size === 1) {
                    const cell = columns[i+2].querySelector(`.port-output.${key}`);
                    const previousCell = columns[i+1].querySelector(`.port-output.${key}`);
                    if (cell) {
                        cell.update(true);
                    }
                    if (previousCell) {
                        previousCell.update(true);
                    }
                } else {
                    redrawAggPort(key, true);
                }
            }
        }
    }
    for (const key in cases[0]) {
        if (currentOutputs[key]) {
            recalculateNonAggOutput(key);
        }
    }
    
}

function updateSelectBox(selectBox, modules) {
    const newModuleOptions = modules.map(module => {
        const newOption = document.createElement('vscode-option');
        newOption.setAttribute('value', module.name);
        newOption.innerText = module.name;
        return newOption;
    });
    if (selectBox.options.length === newModuleOptions.length) {
        if (selectBox.options.every((option, i) => option.value === newModuleOptions[i].value)) {
            return;
        }
    }
    selectBox.innerHTML = '';
    selectBox.options = newModuleOptions;
    for (const option of selectBox.options) {
        selectBox.appendChild(option);
    }

    let selectedOption = null;
    if (selectedModule) {
        selectedOption = selectBox.options.find(option => option.value === selectedModule.name);
    }

    if (selectBox.options.length > 0 && !selectedOption) {
        selectBox.options[0].selected = true;
        selectBox.style.display = 'inline-block';
        selectBox.value = selectBox.options[0].value;
    } else if (selectedOption) {
        selectBox.style.display = 'inline-block';
        selectedOption.selected = true;
        if (selectBox.value !== selectedOption.value) {
            selectBox.value = selectedOption.value;
        }
    } else {
        selectBox.style.display = 'none';
    }
}

function createColumn(classes, parent) {
    const newColumn = document.createElement('div');
    newColumn.classList.add('port-column');
    for (const c of classes) {
        newColumn.classList.add(c);
    }
    parent.appendChild(newColumn);
    return newColumn;
}

function createCell(classes, parent) {
    const newCell = document.createElement('div');
    newCell.classList.add('port-cell');
    for (const c of classes) {
        newCell.classList.add(c);
    }
    parent.appendChild(newCell);
    return newCell;
}

function createIconButton(icon, parent) {
    const iconButton = document.createElement('div');
    iconButton.classList.add('port-icon');
    iconButton.classList.add('codicon');
    iconButton.classList.add(`codicon-${icon}`);
    parent.appendChild(iconButton);
    return iconButton;
}

function generateNewInputsMap(newInputs, currentInputs) {
    const newInputMap = {};
    for (const port of newInputs) {
        newInputMap[port.name] = {
            name: port.name,
            size: port.size,
            value: currentInputs[port.name] ? currentInputs[port.name].value ?? {} : {}
        };
        if (port.size > 1) {
            const subValues = {};
            for (let j = 0; j < port.size; j++) {
                newInputMap[`${port.name}_${j}`] = {
                    name: `${port.name}_${j}`,
                    size: 1,
                    isSubValue: true,
                    value: {}
                };
            }
            for (const k in newInputMap[port.name].value) {
                const val = newInputMap[port.name].value[k];
                const bin = val.toString(2).padStart(port.size, '0').split('').reverse().join('');
                for (let j = 0; j < port.size; j++) {
                    if (!subValues[`${port.name}_${j}`]) {
                        subValues[`${port.name}_${j}`] = {};
                    }
                    subValues[`${port.name}_${j}`][k] = bin[j] === '0' ? 0 : 1;
                }
            }
        }
    }
    return newInputMap;
}

function recalculateNonAggPorts(portName) {
    const port = currentInputs[portName];
    if (!port || port.size === 1) {
        return;
    }
    const columns = document.querySelectorAll(`.port-column`);
    for (let i = 0; i <= numCells; i++) {
        let val = parseInt(port.value[i] ?? '0').toString(2).padStart(port.size, '0').split('').reverse().join('');
        for (let j = 0; j < port.size; j++) {
            const newVal = val[j] === '0' ? 0 : 1;
            if (currentInputs[`${portName}_${j}`]?.value[i] !== newVal) {
                if (!currentInputs[`${portName}_${j}`]) {
                    currentInputs[`${portName}_${j}`] = {
                        name: `${portName}_${j}`,
                        size: 1,
                        isSubValue: true,
                        value: {}
                    };
                }
                currentInputs[`${portName}_${j}`].value[i] = newVal;
                const cell = columns[i+2]?.querySelector(`.port-input.${portName}_${j}`);
                const previousCell = columns[i+1]?.querySelector(`.port-input.${portName}_${j}`);
                if (cell) {
                    cell.update(true);
                }
                if (previousCell) {
                    previousCell.update(true);
                }
            }
        }
    }
}

function recalculateNonAggOutput(portName) {
    const port = currentOutputs[portName];
    if (!port || port.size === 1) {
        return;
    }
    const columns = document.querySelectorAll(`.port-column`);
    for (let i = 0; i <= numCells; i++) {
        let val = parseInt(port.value[i] ?? '0').toString(2).padStart(port.size, '0').split('').reverse().join('');
        for (let j = 0; j < port.size; j++) {
            const newVal = val[j] === '0' ? 0 : 1;
            if (currentOutputs[`${portName}_${j}`]?.value[i] !== newVal) {
                if (!currentOutputs[`${portName}_${j}`]) {
                    currentOutputs[`${portName}_${j}`] = {
                        name: `${portName}_${j}`,
                        size: 1,
                        isSubValue: true,
                        value: {}
                    };
                }
                currentOutputs[`${portName}_${j}`].value[i] = newVal;
                const cell = columns[i+2].querySelector(`.port-output.${portName}_${j}`);
                const previousCell = columns[i+1].querySelector(`.port-output.${portName}_${j}`);
                if (cell) {
                    cell.update(true);
                }
                if (previousCell) {
                    previousCell.update(true);
                }
            }
        }
    }
}

function recalculateAggInput(portName) {
    const port = currentInputs[portName];
    if (!port || port.size === 1) {
        return;
    }
    for (let i = 0; i <= numCells; i++) {
        let val = [];
        for (let j = 0; j < port.size; j++) {
            val.push(currentInputs[`${portName}_${j}`].value[i] ? '1' : '0');
        }
        port.value[i] = parseInt(val.reverse().join(''), 2);
    }
    redrawAggPort(portName);
}

function redrawAggPort(portName, isOutput) {
    const mapObject = isOutput ? currentOutputs : currentInputs;
    const port = mapObject[portName];
    const className = isOutput ? 'port-output' : 'port-input';
    const portCells = document.querySelectorAll(`.${className}.${portName}`);
    portCells.forEach(cell => {
        cell.innerHTML = '';
    });
    if (portCells.length !== (numCells + 1)) {
        return;
    }
    const aggregatedSignals = [];
    let currentSignal = null;
    for (let i = 0; i <= numCells; i++) {
        if (currentSignal === null) {
            currentSignal = {
                start: i,
                value: port.value[i] ?? 0
            }
        } else if (currentSignal.value !== port.value[i]) {
            currentSignal.end = i - 1;
            aggregatedSignals.push(currentSignal);
            currentSignal = {
                start: i,
                value: port.value[i] ?? 0
            }
        }
    }
    if (currentSignal !== null) {
        currentSignal.end = numCells;
        aggregatedSignals.push(currentSignal);
    }
    const rootContainer = document.getElementById('inputs');
    for (const signal of aggregatedSignals) {
        if (signal.value !== 0) {
            const newAggCell = document.createElement('div');
            newAggCell.classList.add('port-agg-cell');
            newAggCell.style.width = `${((signal.end - signal.start + 1) * 30)-2}px`;
            const signalText = document.createElement('span');
            signalText.innerHTML = `0x${signal.value.toString(16).padStart(2, '0').toUpperCase()}`;
            signalText.style.paddingTop = '5px';
            signalText.style.paddingBottom = '5px';
            newAggCell.appendChild(signalText);
            
            const signalInput = document.createElement('input');
            if (!isOutput) {
                signalInput.setAttribute('value', signal.value.toString(16));
                signalInput.style.display = 'none';
                newAggCell.appendChild(signalInput);
                
                signalText.addEventListener('dblclick', () => {
                    signalText.style.display = 'none';
                    signalInput.style.display = 'inline-block';
                    signalInput.focus();
                    signalInput.setSelectionRange(0, signalInput.value.length);
                });
                newAggCell.addEventListener('mouseover', () => {
                    rootContainer.classList.add('port-agg-cell-hover');
                });
                newAggCell.addEventListener('mouseout', () => {
                    if (!currentMouseDownPort) {
                        rootContainer.classList.remove('port-agg-cell-hover');
                    }
                });
            }
            const rightHandle = document.createElement('div');
            rightHandle.classList.add('port-agg-handle');
            rightHandle.classList.add('port-agg-handle-right');
            newAggCell.appendChild(rightHandle);
            const leftHandle = document.createElement('div');
            leftHandle.classList.add('port-agg-handle');
            leftHandle.classList.add('port-agg-handle-left');
            newAggCell.appendChild(leftHandle);
            if (!isOutput) {
                leftHandle.addEventListener('mousedown', (e) => {
                    rootContainer.classList.add('port-agg-cell-hover');
                    currentMouseDownPort = portName;
                    currentActionSignal = signal;
                    currentMouseDownIndex = signal.end - 1;
                    currentActionDirection = rightHandle;
                    currentDragMode = 'agg-left';
                });
                rightHandle.addEventListener('mousedown', (e) => {
                    rootContainer.classList.add('port-agg-cell-hover');
                    currentMouseDownPort = portName;
                    currentActionSignal = signal;
                    currentMouseDownIndex = signal.start + 1;
                    currentActionDirection = leftHandle;
                    currentDragMode = 'agg-right';
                });
            }

            const columns = document.querySelectorAll(`.port-column`);
            const resetInput = () => {
                signalText.style.display = 'inline-block';
                signalInput.style.display = 'none';
                signalText.innerHTML = `0x${signalInput.value.padStart(2, '0').toUpperCase()}`;
                signal.value = parseInt(signalInput.value || '0', 16);
                for (let i = signal.start; i <= signal.end; i++) {
                    port.value[i] = signal.value;
                    for (let j = 0; j < port.size; j++) {
                        const newVal = signal.value & (1 << j) ? 1 : 0;
                        if (newVal !== currentInputs[`${portName}_${j}`].value[i]) {
                            currentInputs[`${portName}_${j}`].value[i] = newVal;
                            const cell = columns[i+2].querySelector(`.port-input.${portName}_${j}`);
                            if (cell) {
                                cell.update();
                            }
                            const previousCell = columns[i+1].querySelector(`.port-input.${portName}_${j}`);
                            if (previousCell) {
                                previousCell.update();
                            }
                        }
                    }
                }
                redrawAggPort(portName);
                debouncedUpdateOutput();
            };
            if (!isOutput) {
                signalInput.addEventListener('blur', () => {
                    resetInput();
                });
                signalInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        resetInput();
                    }
                });
            }

            portCells[signal.start].appendChild(newAggCell);
        }
    }
}

function addSinglePortActions(portName, newCell) {
    const iconButton = createIconButton('watch', newCell);
    iconButton.addEventListener('click', () => {
        const firstVal = currentInputs[portName].value[0] ? 0 : 1;
        for (let i = 0; i <= numCells; i++) {
            currentInputs[portName].value[i] = i % 2 === 0 ? firstVal : (1-firstVal);
        }
        const portCells = document.querySelectorAll(`.port-input.${portName}`);
        portCells.forEach(cell => {
            cell.update();
        });
        debouncedUpdateOutput();
    });
    const clearButton = createIconButton('clear-all', newCell);
    clearButton.addEventListener('click', () => {
        for (let i = 0; i <= numCells; i++) {
            currentInputs[portName].value[i] = 0;
        }
        const portCells = document.querySelectorAll(`.port-input.${portName}`);
        portCells.forEach(cell => {
            cell.update();
        });
        debouncedUpdateOutput();
    });
}

function makeIntoLineCell(newCell, portName, i, parentPortName, isOutput) {
    const currentPorts = isOutput ? currentOutputs : currentInputs;
    const value = currentPorts[portName].value[i] ? 1 : 0;
    const lineCell = document.createElement('div');
    lineCell.classList.add('port-line');
    if (value) {
        lineCell.classList.add('port-line-active');
    } else {
        lineCell.classList.add('port-line-inactive');
    }
    const nextValue = currentPorts[portName].value[i + 1] ? 1 : 0;
    if (i < numCells && nextValue !== value) {
        lineCell.classList.add('port-line-transition');
    }
    newCell.appendChild(lineCell);
    newCell.index = i;
    newCell.update = (skipParent) => {
        if (currentPorts[portName].value[newCell.index]) {
            lineCell.classList.remove('port-line-inactive');
            lineCell.classList.add('port-line-active');
        } else {
            lineCell.classList.remove('port-line-active');
            lineCell.classList.add('port-line-inactive');
        }
        const nextValue = currentPorts[portName].value[newCell.index + 1] ? 1 : 0;
        if (newCell.index < numCells && nextValue !== (currentPorts[portName].value[newCell.index] ?? 0)) {
            lineCell.classList.add('port-line-transition');
        } else {
            lineCell.classList.remove('port-line-transition');
        }
        if (parentPortName && !skipParent) {
            recalculateAggInput(parentPortName);
        }
    }
    if (!isOutput) {
        newCell.addEventListener('mousedown', e => {
            currentMouseDownPort = portName;
            currentPorts[portName].value[newCell.index] = currentPorts[portName].value[newCell.index] ? 0 : 1;
            currentActionDirection = currentPorts[portName].value[newCell.index];
            currentMouseDownIndex = newCell.index;
            newCell.update();
            newCell.parentElement.previousSibling?.querySelector(`.port-input.${portName}`)?.update();
            debouncedUpdateOutput();
        });
        newCell.addEventListener('mouseover', e => {
            let valueToMatch = currentActionDirection;
            if (e.altKey) {
                const matchesSpacing = currentMouseDownIndex % 2 === newCell.index % 2;
                if (!matchesSpacing) {
                    valueToMatch = currentActionDirection ? 0 : 1;
                }
            }
            if (currentMouseDownPort && currentMouseDownPort === portName && valueToMatch !== currentPorts[portName].value[newCell.index]) {
                currentPorts[portName].value[newCell.index] = valueToMatch;
                newCell.update();
                newCell.parentElement.previousSibling?.querySelector(`.port-input.${portName}`)?.update();
                debouncedUpdateOutput();
            }
        });
        newCell.addEventListener('mouseup', e => {
            currentMouseDownPort = null;
        });
    }
}

function updateInputArea(inputs) {
    const newInputs = selectedModule.ports.filter(port => port.direction === 'input');
    const newOutputs = selectedModule.ports.filter(port => port.direction === 'output');
    const newInputMap = generateNewInputsMap(newInputs, currentInputs);
    const newOutputMap = generateNewInputsMap(newOutputs, currentOutputs);
    
    currentInputs = newInputMap;
    currentOutputs = newOutputMap;
    inputs.innerHTML = '';
    const outerElement = document.createElement('div');
    outerElement.classList.add('port-container');
    const actionColumn = createColumn(['port-main-action'], outerElement);
    const actionCell = createCell(['port-title', 'port-header', 'port-index', 'port-name', 'port-main-title-top'], actionColumn);
    actionCell.innerText = 'Inputs';
    for (const port of newInputs) {
        const newCell = createCell(['port-action'], actionColumn);
        if (port.size === 1) {
            addSinglePortActions(port.name, newCell);
        } else {
            const expandButton = createIconButton('chevron-up', newCell);
            let expanded = true;
            expandButton.addEventListener('click', () => {
                const secondaryCells = document.querySelectorAll(`.secondary-${port.name}`);
                expanded = !expanded;
                secondaryCells.forEach(cell => {
                    cell.style.display = expanded ? 'flex' : 'none';
                });
                expandButton.classList.toggle('codicon-chevron-down');
                expandButton.classList.toggle('codicon-chevron-up');
            });
            for (let j = 0; j < port.size; j++) {
                const nestedCell = createCell(['port-action', `secondary-${port.name}`], actionColumn);
                addSinglePortActions(`${port.name}_${j}`, nestedCell);
            }
        }
    }
    const outputsCell = createCell(['port-title', 'port-header', 'port-index', 'port-name', 'port-main-title-top2'], actionColumn);
    outputsCell.innerText = 'Outputs';
    for (const port of newOutputs) {
        const newCell = createCell(['port-action'], actionColumn);
        if (port.size === 1) {
        } else {
            const expandButton = createIconButton('chevron-up', newCell);
            let expanded = true;
            expandButton.addEventListener('click', () => {
                const secondaryCells = document.querySelectorAll(`.secondary-${port.name}`);
                expanded = !expanded;
                secondaryCells.forEach(cell => {
                    cell.style.display = expanded ? 'flex' : 'none';
                });
                expandButton.classList.toggle('codicon-chevron-down');
                expandButton.classList.toggle('codicon-chevron-up');
            });
            for (let j = 0; j < port.size; j++) {
                const nestedCell = createCell(['port-action', `secondary-${port.name}`], actionColumn);
                nestedCell.innerText = ' ';
            }
        }
    }

    const titleColumn = createColumn(['port-main-title'], outerElement);
    const headerCell = createCell(['port-title', 'port-header', 'port-index', 'port-name'], titleColumn);
    headerCell.innerText = ' ';
    for (const port of newInputs) {
        const newCell = createCell(['port-header', 'port-name'], titleColumn);
        newCell.innerText = port.name;
        if (port.size > 1) {
            for (let j = 0; j < port.size; j++) {
                const nestedCell = createCell([`secondary-${port.name}`, 'port-header', 'port-name'], titleColumn)
                nestedCell.innerText = `${port.name}[${j}]`;
            }
        }
    }
    const outputBlankCell = createCell(['port-header', 'port-name'], titleColumn);
    outputBlankCell.innerText = ' ';
    for (const port of newOutputs) {
        const newCell = createCell(['port-header', 'port-name'], titleColumn);
        newCell.innerText = port.name;
        if (port.size > 1) {
            for (let j = 0; j < port.size; j++) {
                const nestedCell = createCell([`secondary-${port.name}`, 'port-header', 'port-name'], titleColumn)
                nestedCell.innerText = `${port.name}[${j}]`;
            }
        }
    }

    const inputColumnContainer = document.createElement('div');
    inputColumnContainer.classList.add('port-input-container');
    outerElement.appendChild(inputColumnContainer);
    inputColumnContainer.addEventListener('mousemove', e => {
        if (currentDragMode !== 'agg-left' && currentDragMode !== 'agg-right') { return; }
        const mousePositionOffset = e.clientX - inputColumnContainer.getBoundingClientRect().left + inputColumnContainer.scrollLeft;
        const index = Math.floor(mousePositionOffset / 30);
        let changedSomething = false;
        if (currentDragMode === 'agg-left') {
            if (index <= currentMouseDownIndex) {
                if (index < currentActionSignal?.start) {
                    for (let j = index; j < currentActionSignal.start; j++) {
                        if (currentInputs[currentMouseDownPort].value[j] !== currentActionSignal.value) {
                            currentInputs[currentMouseDownPort].value[j] = currentActionSignal.value;
                            changedSomething = true;
                        }  
                    }
                    currentActionSignal.start = index;
                } else if (index > currentActionSignal.start) {
                    for (let j = currentActionSignal.start; j < index; j++) {
                        if (currentInputs[currentMouseDownPort].value[j] !== 0) {
                            currentInputs[currentMouseDownPort].value[j] = 0;
                            changedSomething = true;
                        }  
                    }
                    currentActionSignal.start = index;
                }
            }
        } else if (currentDragMode === 'agg-right') {
            if (index >= currentMouseDownIndex) {
                if (index > currentActionSignal?.end) {
                    for (let j = currentActionSignal.end + 1; j <= index; j++) {
                        if (currentInputs[currentMouseDownPort].value[j] !== currentActionSignal.value) {
                            currentInputs[currentMouseDownPort].value[j] = currentActionSignal.value;
                            changedSomething = true;
                        }  
                    }
                    currentActionSignal.end = index;
                } else if (index < currentActionSignal.end) {
                    for (let j = index + 1; j <= currentActionSignal.end; j++) {
                        if (currentInputs[currentMouseDownPort].value[j] !== 0) {
                            currentInputs[currentMouseDownPort].value[j] = 0;
                            changedSomething = true;
                        }  
                    }
                    currentActionSignal.end = index;
                }
            }
        }
        if (changedSomething) {
            recalculateNonAggPorts(currentMouseDownPort);
            redrawAggPort(currentMouseDownPort);
            debouncedUpdateOutput();
        }
    });

    for (let i = 0; i <= numCells; i++) {
        const row = createColumn([], inputColumnContainer);
        const headerCell = createCell(['port-header', 'port-index'], row);
        headerCell.innerText = i.toString();
        for (const port of newInputs) {
            if (port.size === 1) {
                const newCell = createCell(['port-input', port.name], row);
                makeIntoLineCell(newCell, port.name, i);
            } else {
                const newCell = createCell(['port-input', port.name, 'port-summary'], row);
                newCell.index = i;
                newCell.addEventListener('dblclick', e => {
                    if (!currentInputs[port.name].value[newCell.index]) {
                        currentInputs[port.name].value[newCell.index] = 1;
                        recalculateNonAggPorts(port.name);
                        redrawAggPort(port.name);
                        debouncedUpdateOutput();
                    }
                });
                for (let j = 0; j < port.size; j++) {
                    const portKey = `${port.name}_${j}`;
                    const nestedCell = createCell([`secondary-${port.name}`, 'port-input', portKey], row);
                    makeIntoLineCell(nestedCell, portKey, i, port.name);
                }
            }
        }
        const blankSpaceCell = createCell([], row);
        blankSpaceCell.innerText = ' ';
        for (const port of newOutputs) {
            if (port.size === 1) {
                const newCell = createCell(['port-output', port.name], row);
                makeIntoLineCell(newCell, port.name, i, undefined, true);
            } else {
                const newCell = createCell(['port-output', port.name, 'port-summary'], row);
                newCell.index = i;
                for (let j = 0; j < port.size; j++) {
                    const portKey = `${port.name}_${j}`;
                    const nestedCell = createCell([`secondary-${port.name}`, 'port-output', portKey], row);
                    makeIntoLineCell(nestedCell, portKey, i, port.name, true);
                }
            }
        }
    }
    inputs.appendChild(outerElement);
}


function selectBoxUpdated(moduleSelect, inputs, outputs) {
    requestAnimationFrame(() => {
        const currentModuleName = moduleSelect.value;
        const newSelectedModule = loadedModules.find(module => module.name === currentModuleName);
        if (!newSelectedModule) {
            return;
        }
        const allPortsMatch = selectedModule && newSelectedModule.ports.every(port => {
            const newPort = newSelectedModule.ports.find(p => p.name === port.name);
            if (!newPort) {
                return false;
            }
            return port.direction === newPort.direction && port.size === newPort.size;
        }) && newSelectedModule.ports.length === selectedModule?.ports?.length;
        if (selectedModule && allPortsMatch && selectedModule.name === newSelectedModule.name) {
            return;
        }
        selectedModule = newSelectedModule;
        loadValuesFromFile();
        updateInputArea(inputs);
        for (const port in currentInputs) {
            if (currentInputs[port].size > 1) {
                recalculateNonAggPorts(port);
                redrawAggPort(port);
            }
        }
    });
}

function loadValuesFromFile() {
    if (!selectedModule || !selectedModule.name || !fileData[selectedModule.name]) {
        currentInputs = {};
        currentOutputs = {};
        return;
    }
    currentInputs = fileData[selectedModule.name].inputs;
    // for (const port in currentInputs) {
    //     if (currentInputs[port].size > 1) {
    //         recalculateNonAggPorts(port);
    //     }
    // }
    recalculateNonAggPorts();
    updateOutputArea(document.getElementById('inputs'), fileData[selectedModule.name].cases);
}

function main() {
    const moduleSelect = document.getElementById('module-select');
    const inputs = document.getElementById('inputs');
    const outputs = document.getElementById('outputs');
    const clearBtn = document.getElementById('clear-button');
    moduleSelect.addEventListener('change', e => {
        selectBoxUpdated(moduleSelect, inputs, outputs);
        debouncedUpdateOutput();
    });

    clearBtn.addEventListener('click', e => {
        for (const port in currentInputs) {
            currentInputs[port].value = new Array(currentInputs[port].size).fill(0);
            debouncedUpdateOutput();
            updateInputArea(document.getElementById('inputs'));
        }
    });

    inputs.addEventListener('mouseout', e => {
        if (e.target !== inputs) {
            return;
        }
        currentActionDirection = null;
        currentActionSignal = null;
        currentMouseDownPort = null;
        currentMouseDownIndex = null;
        currentDragMode = null;
        inputs.classList.remove('port-agg-cell-hover');
    });
    inputs.addEventListener('mouseup', e => {
        currentActionDirection = null;
        currentActionSignal = null;
        currentMouseDownPort = null;
        currentMouseDownIndex = null;
        currentDragMode = null;
        inputs.classList.remove('port-agg-cell-hover');
        if (e.target.classList.contains('port-agg-cell') || e.target.parentElement.classList.contains('port-agg-cell')) {
            inputs.classList.add('port-agg-cell-hover');
        }
    });

    const status = document.getElementById('status');
    window.addEventListener('message', async e => {
        const {command, data, debugFile, error, extra} = e.data;
        if (command === 'updatedCurrentModules') {
            if (error) {
                status.innerHTML = '';
                const titleSpan = document.createElement('span');
                titleSpan.innerText = error;
                status.appendChild(titleSpan);
                if (extra) {
                    const extraSpan = document.createElement('div');
                    extraSpan.innerText = extra;
                    status.appendChild(extraSpan);
                }
                status.classList.remove('hide');
            } else {
                status.classList.add('hide');
                loadedModules = data;
                fileData = debugFile;
                updateSelectBox(moduleSelect, data);
                selectBoxUpdated(moduleSelect, inputs, outputs);
                debouncedUpdateOutput();
            }
        } else if (command === 'module-result') {
            const {cases} = data;
            updateOutputArea(inputs, cases);
        }
    });
}