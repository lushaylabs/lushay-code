
export const gowinDeviceInfo = (board: string):  {device: string, family: string, freq: string} => {
    if (board === 'tangnano9k') {
        return {
            device: 'GW1NR-LV9QN88PC6/I5',
            family: 'GW1N-9C',
            freq: '27'
        }
    } else if (board === 'tangnano4k') {
        return {
            device: 'GW1NSR-LV4CQN48PC7/I6',
            family: 'GW1NS-4',
            freq: '27'
        }
    } else if (board === 'tangnano1k') {
        return {
            device: 'GW1NZ-LV1QN48C6/I5',
            family: 'GW1NZ-1',
            freq: '27'
        }
    } else if (board === 'tangnano') {
        return {
            device: 'GW1N-LV1QN48C6/I5',
            family: 'GW1N-1',
            freq: '24'
        }
    }
    throw new Error('Board not supported');
}

export const ecp5DeviceInfo = (board: string):  {device: string, deviceFlag: string, package: string, freq: string} => {
    if (board === 'orangeCrab') {
        return {
            device: 'LFE5U-25F',
            package: 'CSFBGA285',
            deviceFlag: '--25k',
            freq: '48'
        }
    }
    throw new Error('Board not supported');
}

export const ice40DeviceInfo = (board: string):  {device: string, deviceFlag: string, package: string, freq: string} => {
    if (board === 'icebreaker') {
        return {
            device: 'iCE40UP5K',
            package: 'sg48',
            deviceFlag: '--up5k',
            freq: '48'
        }
    }
    throw new Error('Board not supported');
}


export enum ToolchainProject {
    APICULA = 'apicula',
    ICESTORM = 'icestorm',
    TRELIS = 'trelis'
}

export function boardToToolchain(board: string): ToolchainProject {
    if ([
        'tangnano',
        'tangnano1k',
        'tangnano4k',
        'tangnano9k',
    ].includes(board)) {
        return ToolchainProject.APICULA;
    }
    if ([
        'icebreaker',
    ].includes(board)) {
        return ToolchainProject.ICESTORM;
    }
    if ([
        'orangeCrab',
    ].includes(board)) {
        return ToolchainProject.TRELIS;
    }
    throw new Error('Unknown board');
}