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
            {name: 'uartTx', location: '17', standard: 'LVCMOS33', pullMode: 'Pull Up'},
            {name: 'uartRx', location: '18', standard: 'LVCMOS33', pullMode: 'Pull Up'}
        ],
        'HDMI': [
            {name: 'hdmiTmdsData[0]', location: '71,70', drive: '8ma'},
            {name: 'hdmiTmdsData[1]', location: '73,72', drive: '8ma'},
            {name: 'hdmiTmdsData[2]', location: '75,74', drive: '8ma'},
            {name: 'hdmiTmdsClk', location: '69,68', drive: '8ma'}
        ]
    },
    'Tang Nano 20K': {
        'Clock': [
            {name: 'clk', location: '4', pullMode: 'Pull Up', standard: 'LVCMOS33'}
        ],
        'LEDs': [
            {name: 'led[0]', location: '20', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[1]', location: '19', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[2]', location: '18', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[3]', location: '17', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[4]', location: '16', standard: 'LVCMOS18', drive: '8ma'},
            {name: 'led[5]', location: '15', standard: 'LVCMOS18', drive: '8ma'}
        ],
        'Buttons': [
            {name: 'btn1', location: '88', standard: 'LVCMOS33'},
            {name: 'btn2', location: '87', standard: 'LVCMOS33'}
        ],
        'UART': [
            {name: 'uartTx', location: '69', standard: 'LVCMOS33', pullMode: 'Pull Up'},
            {name: 'uartRx', location: '70', standard: 'LVCMOS33', pullMode: 'Pull Up'}
        ],
        'HDMI': [
            {name: 'hdmiTmdsData[0]', location: '35,36', drive: '8ma'},
            {name: 'hdmiTmdsData[1]', location: '37,38', drive: '8ma'},
            {name: 'hdmiTmdsData[2]', location: '39,40', drive: '8ma'},
            {name: 'hdmiTmdsClk', location: '33,34', drive: '8ma'}
        ],
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
    },
    'iCEBreaker': {
        'Clock': [
            {name: 'clk', location: '35'}
        ],
        'UART': [
            {name: 'uartTx', location: '9'},
            {name: 'uartRx', location: '6'}
        ],
        'Button': [
            {name: 'btn', location: '10'},
        ],
        'LEDs': [
            {name: 'ledG', location: '37'},
            {name: 'ledR', location: '11'}
        ],
        'Extension LEDs': [
            {name: 'led[0]', location: '26'},
            {name: 'led[1]', location: '23'},
            {name: 'led[2]', location: '27'},
            {name: 'led[3]', location: '21'},
            {name: 'led[4]', location: '25'},
        ],
        'Extension Buttons': [
            {name: 'btn[0]', location: '20'},
            {name: 'btn[1]', location: '19'},
            {name: 'btn[2]', location: '18'},
        ]
    },
    'iCEStick': {
        'Clock': [
            {name: 'clk', location: '21'}
        ],
        'LEDs': [
            {name: 'led[0]', location: '95'},
            {name: 'led[1]', location: '96'},
            {name: 'led[2]', location: '97'},
            {name: 'led[3]', location: '98'},
            {name: 'led[4]', location: '99'},
        ],
        'UART': [
            {name: 'uartTx', location: '8'},
            {name: 'uartRx', location: '9'}
        ],
        'IR': [
            {name: 'irTx', location: '105'},
            {name: 'irRx', location: '106'},
            {name: 'irSD', location: '107'}
        ]
    },
    'Orange Crab': {
        'Clock': [
            {name: 'clk', location: 'A9', frequency: '48', standard: 'LVCMOS33'}
        ],
        'RGB LED': [
            {name: 'ledR', location: 'K4', standard: 'LVCMOS33'},
            {name: 'ledG', location: 'M3', standard: 'LVCMOS33'},
            {name: 'ledB', location: 'J3', standard: 'LVCMOS33'}
        ],
        'Buttons': [
            {name: 'btn1', location: 'J17', standard: 'LVCMOS33'},
            {name: 'btn2', location: 'V17', standard: 'LVCMOS33'}
        ]
    },
    'UPduino 3.1': {
        // TODO: Finish UPduino stuff
        // 'Clock': [
        //     {name: 'clk', location: '35'}
        // ],
        'UART': [
            {name: 'uartTx', location: '14'},
            {name: 'uartRx', location: '15'}
        ],
        // 'Button': [
        //     {name: 'btn', location: '10'},
        // ],
        'LEDs': [
            {name: 'ledB', location: '39'},
            {name: 'ledG', location: '40'},
            {name: 'ledR', location: '41'}
        ],
        // 'Extension LEDs': [
        //     {name: 'led[0]', location: '26'},
        //     {name: 'led[1]', location: '23'},
        //     {name: 'led[2]', location: '27'},
        //     {name: 'led[3]', location: '21'},
        //     {name: 'led[4]', location: '25'},
        // ],
        // 'Extension Buttons': [
        //     {name: 'btn[0]', location: '20'},
        //     {name: 'btn[1]', location: '19'},
        //     {name: 'btn[2]', location: '18'},
        // ]
    },

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
    'Tang Nano 20K': [
        // { x: 85, y: 33, pinNumber: 63 },
        // { x: 105, y: 33, pinNumber: 86 },
        { x: 126, y: 33, pinNumber: 76 },
        { x: 146, y: 33, pinNumber: 80 },
        { x: 166, y: 33, pinNumber: 42 },
        { x: 186, y: 33, pinNumber: 41 },
        { x: 207, y: 33, pinNumber: 56 },
        { x: 227, y: 33, pinNumber: 54 },
        { x: 248, y: 33, pinNumber: 51 },
        { x: 268, y: 33, pinNumber: 48 },
        { x: 289, y: 33, pinNumber: 55 },
        { x: 309, y: 33, pinNumber: 49 },
        { x: 330, y: 33, pinNumber: 86 },
        { x: 350, y: 33, pinNumber: 79 },
        // { x: 370, y: 33, pinNumber: 72 },
        // { x: 391, y: 33, pinNumber: 71 },
        { x: 411, y: 33, pinNumber: 72 },
        { x: 431, y: 33, pinNumber: 71 },
        { x: 452, y: 33, pinNumber: 53 },
        { x: 473, y: 33, pinNumber: 52 },

        { x: 85, y: 202, pinNumber: 73 },
        { x: 105, y: 202, pinNumber: 74 },
        { x: 126, y: 202, pinNumber: 75 },
        { x: 146, y: 202, pinNumber: 85 },
        { x: 166, y: 202, pinNumber: 77 },
        { x: 186, y: 202, pinNumber: 15 },
        { x: 207, y: 202, pinNumber: 16 },
        { x: 227, y: 202, pinNumber: 27 },
        { x: 248, y: 202, pinNumber: 28 },
        { x: 268, y: 202, pinNumber: 25 },
        { x: 289, y: 202, pinNumber: 26 },
        { x: 309, y: 202, pinNumber: 29 },
        { x: 330, y: 202, pinNumber: 30 },
        { x: 350, y: 202, pinNumber: 31 },
        { x: 370, y: 202, pinNumber: 17 },
        { x: 391, y: 202, pinNumber: 20 },
        { x: 411, y: 202, pinNumber: 19 },
        { x: 431, y: 202, pinNumber: 18 },
        // { x: 452, y: 202, pinNumber: 54 },
        // { x: 473, y: 202, pinNumber: 55 }
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
    ],
    'Orange Crab': [
        // { x: 205, y: 20, pinNumber: 1 },
        // { x: 230, y: 20, pinNumber: 2 },
        // { x: 256, y: 20, pinNumber: 3 },
        { x: 281, y: 20, pinNumber: 'J2' },
        { x: 305, y: 20, pinNumber: 'H2' },
        { x: 330, y: 20, pinNumber: 'A8' },
        { x: 355, y: 20, pinNumber: 'B8' },
        { x: 381, y: 20, pinNumber: 'C8' },
        { x: 406, y: 20, pinNumber: 'B9' },
        { x: 431, y: 20, pinNumber: 'B10' },
        { x: 456, y: 20, pinNumber: 'C9' },
        { x: 484, y: 20, pinNumber: 'C10' },
        { x: 105, y: 218, pinNumber: 'T15' },
        // { x: 130, y: 218, pinNumber: 25 },
        // { x: 156, y: 218, pinNumber: 25 },
        // { x: 181, y: 218, pinNumber: 25 },
        { x: 205, y: 218, pinNumber: 'L4' },
        { x: 230, y: 218, pinNumber: 'N3' },
        { x: 256, y: 218, pinNumber: 'N4' },
        { x: 281, y: 218, pinNumber: 'H4' },
        { x: 305, y: 218, pinNumber: 'G4' },
        { x: 330, y: 218, pinNumber: 'T17' },
        { x: 355, y: 218, pinNumber: 'R17' },
        { x: 381, y: 218, pinNumber: 'N16' },
        { x: 406, y: 218, pinNumber: 'N15' },
        { x: 431, y: 218, pinNumber: 'N17' },
        { x: 456, y: 218, pinNumber: 'M18' },
        // { x: 484, y: 218, pinNumber: 24 },
    ],
    'iCEBreaker': [
        { x: 100, y: 11, pinNumber: 3 },
        { x: 117, y: 11, pinNumber: 48 },
        { x: 135, y: 11, pinNumber: 46 },
        { x: 150, y: 11, pinNumber: 44 },
        // { x: 167, y: 11, pinNumber: 5 },
        // { x: 183, y: 11, pinNumber: 6 },
        { x: 100, y: 27, pinNumber: 4 },
        { x: 117, y: 27, pinNumber: 2 },
        { x: 135, y: 27, pinNumber: 47 },
        { x: 150, y: 27, pinNumber: 45 },
        // { x: 167, y: 27, pinNumber: 5 },
        // { x: 183, y: 27, pinNumber: 6 },

        // { x: 216, y: 11, pinNumber: 1 },
        // { x: 216, y: 27, pinNumber: 1 },

        { x: 248, y: 11, pinNumber: 42 },
        { x: 265, y: 11, pinNumber: 36 },
        { x: 282, y: 11, pinNumber: 32 },
        { x: 299, y: 11, pinNumber: 28 },
        // { x: 316, y: 11, pinNumber: 5 },
        // { x: 333, y: 11, pinNumber: 6 },
        { x: 248, y: 27, pinNumber: 43 },
        { x: 265, y: 27, pinNumber: 38 },
        { x: 282, y: 27, pinNumber: 34 },
        { x: 299, y: 27, pinNumber: 31 },
        // { x: 316, y: 27, pinNumber: 5 },
        // { x: 333, y: 27, pinNumber: 6 },

        { x: 132, y: 212, pinNumber: 39 },
        { x: 149, y: 212, pinNumber: 41 },
        // { x: 166, y: 212, pinNumber: 40 },
        // { x: 183, y: 212, pinNumber: 40 },
        { x: 132, y: 228, pinNumber: 40 },
        // { x: 149, y: 228, pinNumber: 40 },
        // { x: 166, y: 228, pinNumber: 40 },
        // { x: 183, y: 228, pinNumber: 40 },

        { x: 216, y: 228, pinNumber: 16 },
        { x: 233, y: 228, pinNumber: 15 },
        { x: 250, y: 228, pinNumber: 17 },
        { x: 266, y: 228, pinNumber: 14 },
        { x: 283, y: 228, pinNumber: 12 },
        { x: 300, y: 228, pinNumber: 13 },
        // { x: 317, y: 228, pinNumber: 37 },

        { x: 350, y: 78, pinNumber: 27 },
        { x: 365, y: 78, pinNumber: 26 },
        { x: 350, y: 95, pinNumber: 25 },
        { x: 365, y: 95, pinNumber: 23 },
        { x: 350, y: 112, pinNumber: 21 },
        { x: 365, y: 112, pinNumber: 20 },
        { x: 350, y: 128, pinNumber: 19 },
        { x: 365, y: 128, pinNumber: 18 },
        // { x: 350, y: 145, pinNumber: 18 },
        // { x: 365, y: 145, pinNumber: 18 },
        // { x: 350, y: 162, pinNumber: 18 },
        // { x: 365, y: 162, pinNumber: 18 },

        { x: 406, y: 78, pinNumber: 26 },
        { x: 422, y: 78, pinNumber: 27 },
        { x: 406, y: 95, pinNumber: 23 },
        { x: 422, y: 95, pinNumber: 25 },
        { x: 406, y: 112, pinNumber: 20 },
        { x: 422, y: 112, pinNumber: 21 },
        { x: 406, y: 128, pinNumber: 18 },
        { x: 422, y: 128, pinNumber: 19 },
        // { x: 406, y: 145, pinNumber: 18 },
        // { x: 422, y: 145, pinNumber: 18 },
        // { x: 406, y: 162, pinNumber: 18 },
        // { x: 422, y: 162, pinNumber: 18 },
    ],
    'iCEStick': [
        { x: 425, y: 59, pinNumber: 119 },
        { x: 438, y: 59, pinNumber: 118 },
        { x: 453, y: 59, pinNumber: 117 },
        { x: 467, y: 59, pinNumber: 116 },
        { x: 482, y: 59, pinNumber: 115 },
        { x: 496, y: 59, pinNumber: 114 },
        { x: 511, y: 59, pinNumber: 113 },
        { x: 525, y: 59, pinNumber: 112 },
        // { x: 540, y: 59, pinNumber: 0 },
        // { x: 554, y: 59, pinNumber: 0 },

        { x: 425, y: 182, pinNumber: 44 },
        { x: 438, y: 182, pinNumber: 45 },
        { x: 453, y: 182, pinNumber: 47 },
        { x: 467, y: 182, pinNumber: 48 },
        { x: 482, y: 182, pinNumber: 56 },
        { x: 496, y: 182, pinNumber: 60 },
        { x: 511, y: 182, pinNumber: 61 },
        { x: 525, y: 182, pinNumber: 62 },
        // { x: 540, y: 182, pinNumber: 0 },
        // { x: 554, y: 182, pinNumber: 0 },

        // { x: 511, y: 87, pinNumber: 3 },
        // { x: 524, y: 87, pinNumber: 3 },
        // { x: 511, y: 100, pinNumber: 3 },
        // { x: 524, y: 100, pinNumber: 3 },
        { x: 511, y: 113, pinNumber: 91 },
        { x: 524, y: 113, pinNumber: 81 },
        { x: 511, y: 125, pinNumber: 90 },
        { x: 524, y: 125, pinNumber: 80 },
        { x: 511, y: 138, pinNumber: 88 },
        { x: 524, y: 138, pinNumber: 79 },
        { x: 511, y: 150, pinNumber: 87 },
        { x: 524, y: 150, pinNumber: 78 },
    ],
    // TODO: Finish UPDuino stuff
    'UPduino 3.1': [
        // TODO: x/y in pix?   then FPGA pin number
        // each seems to be real x,y in pix - 11
        // Top ; x subtract 27
        { x:  13, y: 20, pinNumber: 28 },
        { x:  37, y: 20, pinNumber: 38 },
        { x:  61, y: 20, pinNumber: 42 },
        { x:  85, y: 20, pinNumber: 36 },
        { x: 109, y: 20, pinNumber: 43 },
        { x: 133, y: 20, pinNumber: 34 },
        { x: 157, y: 20, pinNumber: 37 },
        { x: 181, y: 20, pinNumber: 31 },
        { x: 205, y: 20, pinNumber: 35 },
        { x: 229, y: 20, pinNumber: 32 },
        { x: 253, y: 20, pinNumber: 27 },
        { x: 277, y: 20, pinNumber: 26 },
        { x: 301, y: 20, pinNumber: 25 },
        { x: 325, y: 20, pinNumber: 23 },
        // Gap:  349, 373, 397
        // RGB Pins
        { x: 424, y: 20, pinNumber: 39 },
        { x: 449, y: 20, pinNumber: 40 },
        { x: 472, y: 20, pinNumber: 41 },
        // 496, 520, 544, 569
        // Bottom
        { x:  13, y: 188, pinNumber:  2 },
        { x:  37, y: 188, pinNumber: 46 },
        { x:  61, y: 188, pinNumber: 47 },
        { x:  85, y: 188, pinNumber: 45 },
        { x: 109, y: 188, pinNumber: 48 },
        { x: 133, y: 188, pinNumber:  3 },
        { x: 157, y: 188, pinNumber:  4 },
        { x: 181, y: 188, pinNumber: 44 },
        { x: 205, y: 188, pinNumber:  6 },
        { x: 229, y: 188, pinNumber:  9 },
        { x: 253, y: 188, pinNumber: 11 },
        { x: 277, y: 188, pinNumber: 18 },
        { x: 301, y: 188, pinNumber: 19 },
        { x: 325, y: 188, pinNumber: 13 },
        { x: 349, y: 188, pinNumber: 21 },
        { x: 373, y: 188, pinNumber: 12 },
        // GND and 12Mhz out : 397, 421
        { x: 449, y: 188, pinNumber: 10 },
        { x: 472, y: 188, pinNumber: 20 },

        { x: 496, y: 188, pinNumber: 14 },
        { x: 520, y: 188, pinNumber: 17 },
        { x: 544, y: 188, pinNumber: 15 },
        { x: 568, y: 188, pinNumber: 16 },

    ],

}

const getBoardImages = () => {
    const tangnano20kBoard = document.getElementById('tangnano20k-board');
    const tangnano9kBoard = document.getElementById('tangnano9k-board');
    const tangnano4kBoard = document.getElementById('tangnano4k-board');
    const tangnano1kBoard = document.getElementById('tangnano1k-board');
    const tangnanoBoard = document.getElementById('tangnano-board');
    const orangeCrabBoard = document.getElementById('orangecrab-board');
    const icebreakerBoard = document.getElementById('icebreaker-board');
    const icestickBoard = document.getElementById('icestick-board');
    const upduinoBoard31 = document.getElementById('upduino31-board');

    return {
        'Tang Nano 20K': tangnano20kBoard,
        'Tang Nano 9K': tangnano9kBoard,
        'Tang Nano 4K': tangnano4kBoard,
        'Tang Nano 1K': tangnano1kBoard,
        'Tang Nano': tangnanoBoard,
        'iCEBreaker': icebreakerBoard,
        'iCEStick': icestickBoard,
        'Orange Crab': orangeCrabBoard,
        'UPduino 3.1': upduinoBoard31
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
    
    if (row.frequency) {
        options.push(`${row.frequency} MHz`);
    }

    if (row.termination) {
        if (row.termination === 'OFF') {
            options.push('Termination off');
        } else {
            options.push(`${row.termination} Termination`);
        }
    }

    if (row.slewRate) {
        options.push(`${row.slewRate} Slew Rate`);
    }

    if (row.diffResistor) {
        if (row.diffResistor === 'OFF') {
            options.push('Diff Resistor off');
        } else {
            options.push(`${row.diffResistor} Diff Resistor`);
        }
    }

    row.options = options.join(', ');
} 
                    
function main() {
    const constraintsTable = document.getElementById("constraints-table");
    const boardSelect = document.getElementById("board-select");
    const noConstraintMessage = document.getElementById("no-constraint");
    const editPanel = document.getElementById("edit-window");
    const editPortName = document.getElementById("edit-port-name");
    const frequencyInput = document.getElementById("frequency");
    const editPortLocation = document.getElementById("edit-port-location");
    const removeConstraintBtn = document.getElementById("remove-constraint");
    const addConstraintBtn = document.getElementById("add-constraint");
    const driveSelect = document.getElementById("drive-select");
    const standardSelect = document.getElementById("standard-select");
    const pullModeSelect = document.getElementById("pull-select");
    const slewRateSelect = document.getElementById("slew-select");
    const terminationSelect = document.getElementById("term-select");
    const diffResistorSelect = document.getElementById("diff-resistor-select");
    const standardSelectEcp5 = document.getElementById("standard-select-ecp5");
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
    const selectPortBtn = document.getElementById('select-port');
    const cancelPortPopupBtn = document.getElementById('cancel-port');
    const portPopup = document.getElementById('port-popup-container');
    const portContainer = document.getElementById('port-container');
    const noPortsMessage = document.getElementById('no-ports');
    const portsLoader = document.getElementById('port-loading');
    const savePortSelection = document.getElementById('save-port-selection');
    const boardImages = getBoardImages();
    let isEditable = false;
    let templates = {}
    let pins = {};
    let board = 'Tang Nano 9K';
    let ports = [];

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
        pins.forEach((pin, i) => {
            const button = document.createElement('vscode-button');
            button.id = `pin${i}`;
            button.setAttribute('pinNumber', `${pin.pinNumber}`);
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

    selectPortBtn.addEventListener('click', async () => {
        portContainer.innerHTML = '';
        portsLoader.classList.remove('hide');
        if (!noPortsMessage.classList.contains('hide')) {
            noPortsMessage.classList.add('hide');
        }
        if (!portContainer.classList.contains('hide')) {
            portContainer.classList.add('hide');
        }
        ports = [];
        portPopup.classList.remove('hide');
        vscode.postMessage({ 
            type: 'getPorts'
        });
    })
    portPopup.addEventListener('click', (e) => {
        if (e.target === portPopup) {
            portPopup.classList.add('hide');
        }
    });
    cancelPortPopupBtn.addEventListener('click', () => {
        if (!portPopup.classList.contains('hide')) {
            portPopup.classList.add('hide');
        }
    })
    savePortSelection.addEventListener('click', () => {
        const radioGroup = document.getElementById('port-radio-group');
        if (!radioGroup || !radioGroup.value || !constraintsTable.rowsData[editRowIndex]) { return; }
        const newName = radioGroup.value;
        constraintsTable.rowsData[editRowIndex] = {
            ...constraintsTable.rowsData[editRowIndex],
            name: newName
        };
        vscode.postMessage({ 
            type: 'edit', 
            editType: 'change',
            rowIndex: editRowIndex,
            field: 'name',
            newValue: constraintsTable.rowsData[editRowIndex].name
        });
        portPopup.classList.add('hide');

        updateEditWindow();
        recalculateOptions(constraintsTable.rowsData[editRowIndex]);
        updateConstraintsTable();
    });

    const updatePortList = () => {
        portContainer.innerHTML = '';
        if (!portsLoader.classList.contains('hide')) {
            portsLoader.classList.add('hide');
        }
        if (ports.length === 0) {
            noPortsMessage.classList.remove('hide');
            if (!portContainer.classList.contains('hide')) {
                portContainer.classList.add('hide');
            }
            return;
        }
        const radioGroup = document.createElement('vscode-radio-group');
        radioGroup.setAttribute('orientation', 'vertical');
        radioGroup.id = 'port-radio-group';
        
        const radioLabel = document.createElement('label');
        radioLabel.setAttribute('slot', 'label');
        radioLabel.innerText = 'Ports Found:'
        radioGroup.appendChild(radioLabel);

        for (const port of ports) {
            const radio = document.createElement('vscode-radio');
            radio.setAttribute('value', port);
            radio.innerText = port;
            const content = radio.innerHTML;
            radio.innerHTML = content.replace(/\<br ?\/?>/g, '');;
            radioGroup.appendChild(radio);
        }
        portContainer.appendChild(radioGroup);
       
        portContainer.classList.remove('hide');
    }

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
            numbers.map((n) => (n.trim())).forEach(number => {
                const buttons = pinContainer.querySelectorAll(`.pin-btn[pinNumber="${number}"]`);
                if (buttons.length > 0) {
                    buttons.forEach((b) => b.classList.add('used'));
                }
            });
        })
        if (data.location) {
            const numbers = data.location.split(',');
            numbers.map((n) => (n.trim())).forEach(number => {
                const buttons = pinContainer.querySelectorAll(`.pin-btn[pinNumber="${number}"]`);
                if (buttons.length > 0) {
                    buttons.forEach((b) => b.classList.add('selected'));
                }
            });
        }

        editPortName.value = data.name;
        editPortLocation.value = data.location === '<Not Selected>' ? '' : data.location;
        const boardType = detectConstraintsType(undefined, undefined, board);
        if (boardType === 'gowin') {
            standardSelectEcp5.parentElement.classList.add('hide');
            slewRateSelect.parentElement.classList.add('hide');
            terminationSelect.parentElement.classList.add('hide');
            diffResistorSelect.parentElement.classList.add('hide');
            frequencyInput.parentElement.classList.add('hide');
            standardSelect.parentElement.classList.remove('hide');
            pullModeSelect.parentElement.classList.remove('hide');
            driveSelect.parentElement.classList.remove('hide');
        } else if (boardType === 'ecp5') {
            standardSelect.parentElement.classList.add('hide');
            standardSelectEcp5.parentElement.classList.remove('hide');
            slewRateSelect.parentElement.classList.remove('hide');
            terminationSelect.parentElement.classList.remove('hide');
            diffResistorSelect.parentElement.classList.remove('hide');
            pullModeSelect.parentElement.classList.remove('hide');
            driveSelect.parentElement.classList.remove('hide');
            frequencyInput.parentElement.classList.remove('hide');
        } else if (boardType === 'ice') {
            standardSelect.parentElement.classList.add('hide');
            standardSelectEcp5.parentElement.classList.add('hide');
            slewRateSelect.parentElement.classList.add('hide');
            terminationSelect.parentElement.classList.add('hide');
            diffResistorSelect.parentElement.classList.add('hide');
            pullModeSelect.parentElement.classList.add('hide');
            driveSelect.parentElement.classList.add('hide');
            frequencyInput.parentElement.classList.remove('hide');
        }

        if (data.drive) {
            driveSelect.value = data.drive;
        } else {
            driveSelect.value = 'Unset';
        }
        if (data.standard) {
            standardSelect.value = data.standard;
            standardSelectEcp5.value = data.standard;
        } else {
            standardSelect.value = 'Unset';
            standardSelectEcp5.value = 'Unset';
        }
        if (data.pullMode) {
            pullModeSelect.value = data.pullMode;
        } else {
            pullModeSelect.value = 'None';
        }

        if (data.slewRate) {
            slewRateSelect.value = data.slewRate;
        } else {
            slewRateSelect.value = 'Unset';
        }

        if (data.termination) {
            terminationSelect.value = data.termination;
        } else {
            terminationSelect.value = 'Unset';
        }

        if (data.diffResistor) {
            diffResistorSelect.value = data.diffResistor;
        } else {
            diffResistorSelect.value = 'Unset';
        }

        if (data.frequency) {
            frequencyInput.value = data.frequency;
        } else {
            frequencyInput.value = '';
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
    frequencyInput.addEventListener('input', changeCallbackForField('frequency', ''));
    editPortLocation.addEventListener('input', changeCallbackForField('location', '<Not Selected>'));
    driveSelect.addEventListener('change', changeCallbackForField('drive', '').bind(driveSelect));
    pullModeSelect.addEventListener('change', changeCallbackForField('pullMode', '').bind(pullModeSelect));
    standardSelect.addEventListener('change', changeCallbackForField('standard', '').bind(standardSelect));
    standardSelectEcp5.addEventListener('change', changeCallbackForField('standard', '').bind(standardSelectEcp5));
    slewRateSelect.addEventListener('change', changeCallbackForField('slewRate', '').bind(slewRateSelect));
    terminationSelect.addEventListener('change', changeCallbackForField('termination', '').bind(terminationSelect));
    diffResistorSelect.addEventListener('change', changeCallbackForField('diffResistor', '').bind(diffResistorSelect));

    const setDefaults = async () => {
        constraintsTable.rowsData = [];
        editRowIndex = null;
        updateConstraintsTable();
        updateEditWindow();
    }

    const loadIceFile = async (rows, edits) => {
        const portMap = {};
        const ioRegex = /set_io\s+(([-]+[^\s]+\s+)*)([^\s]+)\s+([^\s]+\s*,?\s*(\d+)?)\s*/;
        const clockRegex = /set_frequency\s+([^\s]+)\s+([^\s]+\s*)\s*/;
        rows.forEach((row) => {
            const ioMatch = ioRegex.exec(row);
            if (ioMatch) {
                if (!portMap[ioMatch[3]]) {
                    portMap[ioMatch[3]] = {name: ioMatch[3]};
                }
                portMap[ioMatch[3]].location = ioMatch[4];
                if (ioMatch[1] && ioMatch[1].trim().length > 0) {
                    const options = ioMatch[1].trim().split(/\s+/);
                    portMap[ioMatch[3]].ice_options = options;
                }
                return;
            }
            const clockMatch = clockRegex.exec(row);
            if (clockMatch) {
                if (!portMap[clockMatch[1]]) {
                    portMap[clockMatch[1]] = {name: clockMatch[1]};
                }
                portMap[clockMatch[1]].frequency = clockMatch[2];
                return;
            }
        });
        return portMap;
    }

    const loadEcp5File = async (rows, edits) => {
        const portMap = {};
        const ioLocRegex = /LOCATE\s+COMP\s+"([^"]+)"\s+SITE\s+"([^"]+)"\s*;/;
        const ioPortRegex = /IOBUF\s+PORT\s+"([^"]+)"\s+(([^=]+=[^\s;]+\s*)+);/;
        const ioFrequencyRegex = /FREQUENCY\s+PORT\s+"([^"]+)"\s+([0-9]+([.][0-9]+)?)\s+([^\s]+)\s*;/;
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
                const options = ioPortMatch[2].trim().split(/\s+/);
                options.forEach((option) => {
                    const parts = option.split('=');
                    if (parts.length === 2) {
                        const key = parts[0].trim();
                        const value = parts[1].trim();
                        if (key === 'IO_TYPE') {
                            portMap[ioPortMatch[1]].standard = value;
                        } else if (key === 'SLEWRATE') {
                            portMap[ioPortMatch[1]].slewRate = value === 'FAST' ? 'Fast' : value === 'SLOW' ? 'Slow' : value;
                        } else if (key === 'TERMINATION') {
                            portMap[ioPortMatch[1]].termination = value;
                        } else if (key === 'PULLMODE') {
                            portMap[ioPortMatch[1]].pullMode = (value === 'DOWN') ? 'Pull Down' : (value === 'UP') ? 'Pull Up' : (value === 'NONE') ? '' : value;
                        } else if (key === 'DRIVE') {
                            const driveMap = {
                                '4': '4ma',
                                '8': '8ma',
                                '12': '12ma',
                                '16': '16ma',
                                '24': '24ma'
                            }
                            const driveOption = driveMap[value];
                            if (driveOption) {
                                portMap[ioPortMatch[1]].drive = driveOption;
                            }
                        } else if (key === 'DIFFRESISTOR') {
                            portMap[ioPortMatch[1]].diffResistor = value;
                        }
                    }
                });
                return;
            }
            const ioFrequencyMatch = ioFrequencyRegex.exec(row);
            if (ioFrequencyMatch) {
                if (!portMap[ioFrequencyMatch[1]]) {
                    portMap[ioFrequencyMatch[1]] = {name: ioFrequencyMatch[1]};
                }
                portMap[ioFrequencyMatch[1]].frequency = ioFrequencyMatch[2];
                return;
            }
        });
        return portMap;
    }

    const loadGowinFile = async (rows, edits) => {
        const portMap = {};
        const ioLocRegex = /IO_LOC\s+"([^"]+)"\s+(\d+\s*,?\s*(\d+)?)\s*;/;
        const ioPortRegex = /IO_PORT\s+"([^"]+)"\s+([^;]+)\s*;/;
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
        return portMap;
    }

    const detectConstraintsType = (uri, rows, board) => {
        if (board) {
            if (board.startsWith('Tang Nano')) {
                return 'gowin';
            }
            if (['Orange Crab'].includes(board)) {
                return 'ecp5';
            }
            if (['iCEBreaker', 'iCEStick', 'UPduino 3.1'].includes(board)) {
                return 'ice';
            }
        }
        if (rows) {
            if (rows.some((row) => row.trim().startsWith('set_io'))) {
                return 'ice';
            }
            if (rows.some((row) => row.trim().startsWith('IO_PORT'))) {
                return 'gowin';
            }
            if (rows.some((row) => row.trim().startsWith('IOBUF'))) {
                return 'ecp5';
            }
        }

        if (uri) {
            if (uri.endsWith('.cst')) {
                return 'gowin';
            }
            if (uri.endsWith('.pcf')) {
                return 'ice';
            }
            if (uri.endsWith('.lpf')) {
                return 'ecp5';
            }
        }
        return 'gowin';
    }


    const loadFile = async (body, edits, uri) => {
        const decoder = new TextDecoder();
        const text = body ? decoder.decode(body) : '';
        const rows = text.split('\n');

        const constraintsType = detectConstraintsType(uri, rows);
        let portMap = {}
        if (constraintsType === 'gowin') {
            portMap = await loadGowinFile(rows, edits);
        } else if (constraintsType === 'ice') {
            portMap = await loadIceFile(rows, edits);
        } else if (constraintsType === 'ecp5') {
            portMap = await loadEcp5File(rows, edits);
        }
        
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

    const convertToGowinConstraintsText = (constraints, fileRows) => {
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
                    constraintOptions.push('PULL_MODE=DOWN');
                } else {
                    constraintOptions.push(`PULL_MODE=${constraint.pullMode}`);
                }
            }
            if (constraintOptions.length > 0) {
                fileRows.push(`IO_PORT "${constraint.name}" ${constraintOptions.join(' ')};`);
            }
            fileRows.push('');
        });
    }

    const convertToEcp5ConstraintsText = (constraints, fileRows) => {
        constraints.forEach((constraint) => {
            if (constraint.location && constraint.location !== '<Not Selected>') {
                fileRows.push(`LOCATE COMP "${constraint.name}" SITE "${constraint.location}";`);
            }
            const constraintOptions = [];
            if (constraint.slewRate && ['Fast', 'Slow'].includes(constraint.slewRate)) {
                constraintOptions.push(`SLEWRATE=${constraint.slewRate === 'Fast' ? 'FAST' : 'SLOW'}`);
            }
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
            if (constraint.termination) {
                constraintOptions.push(`TERMINATION=${constraint.termination}`);
            }
            if (constraint.standard) {
                constraintOptions.push(`IO_TYPE=${constraint.standard}`);
            }
            if (constraint.pullMode) {
                if (constraint.pullMode === 'Pull Up') {
                    constraintOptions.push('PULLMODE=UP');
                } else if (constraint.pullMode === 'Pull Down') {
                    constraintOptions.push('PULLMODE=DOWN');
                }
            }
            if (constraint.diffResistor) {
                constraintOptions.push(`DIFFRESISTOR=${constraint.diffResistor}`);
            }
            if (constraintOptions.length > 0) {
                fileRows.push(`IOBUF PORT "${constraint.name}" ${constraintOptions.join(' ')};`);
            }
            if (constraint.frequency) {
                fileRows.push(`FREQUENCY PORT "${constraint.name}" ${constraint.frequency} MHz;`);
            }
            fileRows.push('');
        });
    }

    const convertToIceConstraintsText = (constraints, fileRows) => {
        constraints.forEach((constraint) => {
            if (constraint.location && constraint.location !== '<Not Selected>') {
                let constraintOptions = '';
                if (constraint.ice_options) {
                    constraintOptions = `${constraint.ice_options} `;
                }
                fileRows.push(`set_io ${constraintOptions}${constraint.name} ${constraint.location}`);
                if (constraint.frequency) {
                    fileRows.push(`set_frequency ${constraint.name} ${constraint.frequency}`);
                }
                fileRows.push('');
            }
        });
    }

    const convertToConstraintsText = async (uri) => {
        const constraints = constraintsTable.rowsData;
        let fileRows = [];
        const constraintsType = detectConstraintsType(uri, undefined, board);
        if (constraintsType === 'gowin') {
            convertToGowinConstraintsText(constraints, fileRows);
        } else if (constraintsType === 'ice') {
            convertToIceConstraintsText(constraints, fileRows);
        } else if (constraintsType === 'ecp5') {
            convertToEcp5ConstraintsText(constraints, fileRows);
        }
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
                    const reverseBoardMap = {
                        'tangnano9k': 'Tang Nano 9K',
                        'tangnano4k': 'Tang Nano 4K',
                        'tangnano1k': 'Tang Nano 1K',
                        'tangnano': 'Tang Nano',
                        'tangnano20k': 'Tang Nano 20K',
                        'orangeCrab': 'Orange Crab',
                        'icebreaker': 'iCEBreaker',
                        'icestick': 'iCEStick',
                        'upduino31': 'UPduino 3.1'
                    }
                    const boardName = reverseBoardMap[body.board] || 'Tang Nano 9K';
                    board = boardSelect.value = boardName;
                    setupBoard();
					if (body.untitled) {
						await setDefaults();
						return;
					} else {
						// Load the initial image into the canvas.
						await loadFile(body.value, [], body.uri);
						return;
					}
				}
			case 'update':
				{
                    await loadFile(body.content, body.edits, body.uri)
					return;
				}
            case 'portResponse':
                {
                    ports = body.ports;
                    updatePortList();
                }
			case 'getFileData':
				{
					const constraintsData = await convertToConstraintsText(body.uri);
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
