import { spawn } from 'child_process';
import * as path from 'path';
import { Logger, ProjectFile } from './projecfile';
import * as fs from 'fs';

export const deviceInfo = (board: string):  {device: string, family: string} => {
        if (board === 'tangnano9k') {
            return {
                device: 'GW1NR-LV9QN88PC6/I5',
                family: 'GW1N-9C'
            }
        } else if (board === 'tangnano4k') {
            return {
                device: 'GW1NSR-LV4CQN48PC7/I6',
                family: 'GW1NS-4'
            }
        } else if (board === 'tangnano1k') {
            return {
                device: 'GW1NZ-LV1QN48C6/I5',
                family: 'GW1NZ-1'
            }
        } else if (board === 'tangnano') {
            return {
                device: 'GW1N-LV1QN48C6/I5',
                family: 'GW1N-1'
            }
        }
        throw new Error('Board not supported');
}

export abstract class ToolchainStage {
    protected static ossCadSuiteBinPath: string;
    protected static logger: Logger;

    public static initialize(
        ossCadSuitPath: string,
        logger: Logger
    ) {
        this.ossCadSuiteBinPath = ossCadSuitPath;
        this.logger = logger;
    }

    protected filesCreated: string[] = [];

	constructor( 
		protected projectFile: ProjectFile
	) {

	}

    public getFilesCreated(): string[] {
        return this.filesCreated;
    }

	public abstract runProg(previousStage: ToolchainStage | undefined): Promise<number | null>;
	protected abstract onCommandStart(): void;
	protected abstract onCommandPrintLine(line: string): void;
	protected abstract onCommandPrintErrorLine(line: string): void;
	protected abstract onCommandEnd(): void;

protected runCommand(commandArr: string[]): Promise<number | null> {
        const ossRootPath = path.resolve(ToolchainStage.ossCadSuiteBinPath, '..');
		return new Promise<number | null>(async (resolve, reject) => {
			const prog = spawn(commandArr[0], commandArr.slice(1), {
                env: {
                    PATH: [
                        path.join(ossRootPath, 'bin'),
                        path.join(ossRootPath, 'lib'),
                        path.join(ossRootPath, 'py3bin'),
                        process.env.PATH
                    ].join(process.platform === 'win32' ? ';' : ':')
                },
                cwd: this.projectFile.basePath
            });
			let spareData = '';
			let spareErrData = '';
			this.onCommandStart()
			prog.stdout.on('data', (data) => {
				ToolchainStage.logger.logToRaw(data.toString());
				const lines = (spareData + data).toString().split('\n');
				spareData = '';
				const lastLine = lines.pop();
				if (lastLine && lastLine !== '') {
					spareData = lastLine;
				}
				for (const line of lines) {
					this.onCommandPrintLine(line.replace(/\r/g, ''));
				}
			});
			prog.stderr.on('error', (err) => {
				ToolchainStage.logger.logToBoth('Receieved STDERR Error');
				ToolchainStage.logger.logToBoth(err.name + ' ' + err.message + '\n' + err.stack);
			})
			prog.stderr.on('data', (data) => {
				ToolchainStage.logger.logToRaw(data.toString());
				const lines = (spareErrData + data).toString().split('\n');
				spareErrData = '';
				const lastLine = lines.pop();
				if (lastLine && lastLine !== '') {
					spareErrData = lastLine;
				}
				for (const line of lines) {
					this.onCommandPrintErrorLine(line.replace(/\r/g, ''));
				}
			});
			prog.on('error', (err) => {
				ToolchainStage.logger.logToBoth('Receieved Error');
				ToolchainStage.logger.logToBoth(err.name + ' ' + err.message + '\n' + err.stack);
			});
			prog.on('close', (code, signal) => {
				this.onCommandEnd();
				resolve(code);
			});
		});
	}
}

export class YosysGowinStage extends ToolchainStage {
	private startedCounter: boolean = false;
	private counter: string[] = [];

	public async runProg(): Promise<number | null> {
		const yosysPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'yosys');
		const outPath = path.join(this.projectFile.basePath, this.projectFile.name + '.json');
		const synthesisCommand = [
			yosysPath,
			'-p',
			`read_verilog ${this.projectFile.includedFilePaths.join(' ')}; synth_gowin -top ${this.projectFile.top || 'top'} -json ${outPath} ${this.projectFile.synthGowinOptions.join(' ')}`
		];
        this.filesCreated.push(outPath);
		return this.runCommand(synthesisCommand);
	}

	protected onCommandStart(): void {
		ToolchainStage.logger.logToBoth("Starting Synthesys with Yosys (Gowin)");
	}

	protected onCommandEnd(): void {
		if (this.counter.length > 0) {
			ToolchainStage.logger.logToSummary("\n    Summary");
			const rows = this.counter.map((c) => {
				const lineType = c.includes(':') ? 'topLevel' : 'subLevel';
				if (lineType === 'topLevel') {
					const parts = c.split(':').map((p) => p.trim());
					return {
						name: parts[0] + ':',
						val: parts[1]
					}
				} else {
					const parts = c.trim().split(' ');
					return {
						name: '    ' + parts[0],
						val: parts[parts.length-1]
					}
				}
			});
			const longestName = rows.reduce((longest, row) => row.name.length > longest ? row.name.length : longest, 0);
			const longestVal = rows.reduce((longest, row) => row.val.length > longest ? row.val.length : longest, 0);
			rows.forEach((row) => {
				ToolchainStage.logger.logToSummary('        ' + row.name.padEnd(longestName + 6, ' ') + row.val.padStart(longestVal, ' '));
			});
            ToolchainStage.logger.logToSummary('');
		}
		ToolchainStage.logger.logToBoth("Finished Synthesys");
	}

	protected onCommandPrintLine(line: string): void {
		if (['|', '/', '\\'].includes(line.trim()[0])) {
			// skipping copyright area here as printed in CST check stage
			return;
		}
		const titleRegexp = /^([0-9.]+)\. (.+)$/;
		const titleMatch = titleRegexp.exec(line);
		if (titleMatch) {
			this.startedCounter = false;
			const titleLength = titleMatch[1].split('.').length-1;
			if (titleLength > 1) {return}
			let spacing = ''.padEnd(titleLength * 4, ' ');
			ToolchainStage.logger.logToSummary(spacing + "    Step " + (titleMatch[1] + ':').padEnd(6, ' ') + ' ' + titleMatch[2])
		}
		if (line && this.startedCounter) {
			this.counter.push(line);
		}

		if (line.match(/=== .* ===/)) {
			this.startedCounter = true;
		}
	}

	protected onCommandPrintErrorLine(line: string): void {
		ToolchainStage.logger.logToSummary('    Error: ' + line.trimEnd());
        if (line.includes('ERROR: syntax error, unexpected')) {
            const errorLocation = line.match(/([^/\\]+\.v):([0-9]+):/);
            if (errorLocation && +errorLocation[2] > 1) {
                ToolchainStage.logger.logToSummary(`    Check lines ${+errorLocation[2]-1}-${errorLocation[2]} of file ${errorLocation[1]} you may be missing a semicolon or left a block open`)
            }
        }
        if (line.includes('ERROR: Module') && line.includes("is not part of the design")) {
            //Error: ERROR: Module `\mds' referenced in module `\led_blink' in cell `\m' is not part of the design.
            const moduleMatches = line.match(/ERROR: Module `\\([^']+)' referenced in module `\\([^']+)' in cell `\\([^']+)'/);
            if (moduleMatches) {
                ToolchainStage.logger.logToSummary(`    Check if module instantiation \`${moduleMatches[1]} ${moduleMatches[3]}(...)\` in module ${moduleMatches[2]} is a typo or maybe the module is not included in your projectfile`)
            }
        }
	}
}

export class NextPnrGowinStage extends ToolchainStage {
    private deviceUtilisation: string[] = [];
	private utilisationStarted = false;

    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const nextPnrPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'nextpnr-gowin');
		const inputPath = previousStage?.getFilesCreated()[0];
        if (!inputPath) {
            ToolchainStage.logger.logToBoth('    Error: no synthesised netlist file');
            return null;
        }
		const outputPath = path.join(this.projectFile.basePath, this.projectFile.name + '_pnr.json');
	
        const {device, family} = deviceInfo(this.projectFile.board);

        const pnrCommand = [
            nextPnrPath,
            '--json',
            inputPath,
            '--write',
            outputPath,
            '--freq',
            '27',
            '--device',
            device,
            '--family',
            family,
            '--cst',
            this.projectFile.constraintsFile,
            ...this.projectFile.nextPnrGowinOptions
        ];

        this.filesCreated.push(outputPath);

        return this.runCommand(pnrCommand);
    }
    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth("Starting PnR with NextPnR");
    }
    protected onCommandPrintLine(line: string): void {
        if (line.toLowerCase().startsWith('info: ') || line.toLowerCase().startsWith('error: ')) {
            const data = line.replace(/^(info): /i, '');
            if (
                data.match(/^[A-Z]/)
                && !data.trim().endsWith(":")
                && !data.toLowerCase().includes('numpy')
            ) {
                ToolchainStage.logger.logToSummary('    ' + data);
            }
            if (this.utilisationStarted && data) {
                if (data.startsWith(' ') || data.startsWith('	')) {
                    this.deviceUtilisation.push(data.trim());
                } else {
                    this.utilisationStarted = false;
                }
            }
            if (data.includes('Device utilisation')) {
                this.utilisationStarted = true;
            }
        }
    }

    protected onCommandPrintErrorLine(line: string): void {
        this.onCommandPrintLine(line);
    }

    protected onCommandEnd(): void {
        if (this.deviceUtilisation.length > 0) {
            ToolchainStage.logger.logToSummary('\n    Device Utilisation:');
            const rows = this.deviceUtilisation.map((row) => {
                const parts = row.split(':');
                return {
                    name: parts[0],
                    val: parts[1]
                }
            });
            const maxLength = rows.reduce((max, val) => val.name.length > max ? val.name.length : max, 0);
            ToolchainStage.logger.logToSummary(rows.map((row) => '        ' + (row.name + ':').padEnd(maxLength + 5, ' ') + row.val).join('\n') + '\n');
        }
        ToolchainStage.logger.logToBoth('Finished PnR');
    }
}

export class GowinPackStage extends ToolchainStage {
    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const gowinPackPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'gowin_pack');
		const inputPath = previousStage?.getFilesCreated()[0];
        if (!inputPath) {
            ToolchainStage.logger.logToBoth('    Error: no routed netlist file');
            return null;
        }
		const outputPath = path.join(this.projectFile.basePath, this.projectFile.name + '.fs');

        const {family} = deviceInfo(this.projectFile.board);
        const bitstreamCommand = [
        	gowinPackPath,
        	'-d',
        	family,
        	'-o',
        	outputPath,
        	inputPath
        ];

        this.filesCreated.push(outputPath);
        return this.runCommand(bitstreamCommand);
    }
    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth('Starting Bitstream Generation with Apicula');
    }
    protected onCommandPrintLine(line: string): void {
        if (line.toLowerCase().includes('numpy')) {
            return;
        }
        ToolchainStage.logger.logToSummary(line);
    }
    protected onCommandPrintErrorLine(line: string): void {
        if (line.toLowerCase().includes('numpy')) {
            return;
        }
        ToolchainStage.logger.logToSummary(line);
    }
    protected onCommandEnd(): void {
        ToolchainStage.logger.logToBoth('Finished Bitstream Generation');
    }   
}

export class OpenFPGALoaderFsStage extends ToolchainStage {
    private detectedUsbNotFound: boolean = false;
	private detectedError: boolean = false;

    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const openFpgaLoaderPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'openFPGALoader');
		const inputPath = path.join(this.projectFile.basePath, this.projectFile.name + '.fs');

        const programCommand = [
        	openFpgaLoaderPath,
        	'-b',
        	this.projectFile.board,
        	inputPath,
            '-v',
            ...(this.projectFile.programMode === 'flash' ? ['-f'] : [])
        ];

        return this.runCommand(programCommand);
    }

    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth('Starting FPGA Programming with OpenFPGALoader');
    }
    protected onCommandPrintLine(line: string): void {
        if (line.includes('write Flash')) {
            ToolchainStage.logger.logToSummary('    Flash Written');
            return;
        }
        if (line.includes('pollFlag')) {
            return;
        }
        ToolchainStage.logger.logToSummary('    ' + line);
    }
    protected onCommandPrintErrorLine(line: string): void {
        if (line.includes('(device not found)')) {
            this.detectedUsbNotFound = true;
            this.detectedError = true;
        }
        if (!this.detectedError) {
            ToolchainStage.logger.logToSummary('    Error: ' + line);
        }
    }
    protected onCommandEnd(): void {
        if (this.detectedError) {
            ToolchainStage.logger.logToSummary("    There was an error programming the FPGA:")
            if (this.detectedUsbNotFound) {
                ToolchainStage.logger.logToSummary("        Device not found, verify the device is plugged in");
            }
        }
        ToolchainStage.logger.logToBoth('Finished FPGA Programming');
    }   
}


export class OpenFPGALoaderExternalFlashStage extends ToolchainStage {
    private detectedUsbNotFound: boolean = false;
	private detectedError: boolean = false;

    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const openFpgaLoaderPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'openFPGALoader');

        const programCommand = [
        	openFpgaLoaderPath,
        	'-b',
        	this.projectFile.board,
            '--external-flash',
        	this.projectFile.externalFlashFilePath
        ];

        return this.runCommand(programCommand);
    }

    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth('Starting FPGA Programming with OpenFPGALoader');
    }
    protected onCommandPrintLine(line: string): void {
        if (line.includes('Writing:')) {
            ToolchainStage.logger.logToSummary('    Flash Written');
            return;
        }
        if (line.includes('Erasing:')) {
            ToolchainStage.logger.logToSummary('    Flash Erased');
            return;
        }
        ToolchainStage.logger.logToSummary('    ' + line);
    }
    protected onCommandPrintErrorLine(line: string): void {
        if (line.includes('(device not found)')) {
            this.detectedUsbNotFound = true;
            this.detectedError = true;
        }
        if (!this.detectedError) {
            ToolchainStage.logger.logToSummary('    Error: ' + line);
        }
    }
    protected onCommandEnd(): void {
        if (this.detectedError) {
            ToolchainStage.logger.logToSummary("    There was an error programming the FPGA:")
            if (this.detectedUsbNotFound) {
                ToolchainStage.logger.logToSummary("        Device not found, verify the device is plugged in");
            }
        }
        ToolchainStage.logger.logToBoth('Finished FPGA Programming');
    }   
}


export class IVerilogTestbenchStage extends ToolchainStage {
    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const iverilogPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'iverilog');
        const vvpPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'vvp');
        const baseTestName = path.basename(this.projectFile.testBenchPath).replace(/\.v$/, '');
		const outputPath = path.join(this.projectFile.basePath, baseTestName + '.o');
	
        const generateTestCommand = [
            iverilogPath,
            '-o',
            outputPath,
            '-s',
            'test',
            this.projectFile.testBenchPath,
            ...this.projectFile.includedFilePaths
        ];

        this.filesCreated.push(outputPath);

        const status = await this.runCommand(generateTestCommand);
        if (status !== 0) {
            return status;
        }
        
        const runTestbench = [
            vvpPath,
            outputPath
        ];

        return this.runCommand(runTestbench);
    }
    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth("Starting Testbench with iVerilog");
    }
    protected onCommandPrintLine(line: string): void {
        ToolchainStage.logger.logToBoth('    ' + line);
    }

    protected onCommandPrintErrorLine(line: string): void {
        this.onCommandPrintLine(line);
    }

    protected onCommandEnd(): void {
        ToolchainStage.logger.logToBoth('Finished Testbench');
    }
}

export class YosysCSTCheckStage extends ToolchainStage {
    private ports: string[] = [];

    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        ToolchainStage.logger.logToBoth('Starting Yosys CST Checking');

        const yosysPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'yosys');

        const checkCommand = [
			yosysPath,
			'-p',
			`read_verilog ${this.projectFile.includedFilePaths.join(' ')}; portlist ${this.projectFile.top || 'top'}`
		];

        let code = await this.runCommand(checkCommand);
        if (code === 0) {
            ToolchainStage.logger.logToBoth('    Checking if all ports are defined in constraints file');
            const constraintNamesMap: Record<string, boolean> = {}
            const constraintsFile = fs.readFileSync(this.projectFile.constraintsFile).toString();
            const rows = constraintsFile.split('\n');
            const ioLocRegex = /IO_LOC\s+"([^"]+)"\s+(\d+\s*,?\s*(\d+)?)\s*;/;
            const ioPortRegex = /IO_PORT\s+"([^"]+)"\s+([^;]+)\s*;/;
            rows.forEach((row) => {
                let match = row.match(ioLocRegex);
                if (match) {
                    constraintNamesMap[match[1]] = true;
                    return;
                }
                match = row.match(ioPortRegex);
                if (match) {
                    constraintNamesMap[match[1]] = true;
                }
            });
            const constraintNames = Object.keys(constraintNamesMap);
            const portsMissingDefinition = this.ports.filter((topPort) => !constraintNames.includes(topPort));
            if (portsMissingDefinition.length === 0) {
                ToolchainStage.logger.logToBoth('    All Ports are defined');
            } else {
                ToolchainStage.logger.logToBoth(`    Error: Port${portsMissingDefinition.length > 1 ? 's' : ''} are missing from CST file: ${portsMissingDefinition.join(', ')}`)
                return 1;
            }
        }

        ToolchainStage.logger.logToBoth('Finished CST Checking');
        return code;

    }

    protected onCommandStart(): void {
    }
    protected onCommandPrintLine(line: string): void {
        if (['|', '/', '\\'].includes(line.trim()[0])) {
			// copyright area
            ToolchainStage.logger.logToSummary('    ' + line);
			return;
		}
        const parseMatch = line.match(/Parsing Verilog input from `([^']+)' to AST/);
        if (parseMatch) {
            ToolchainStage.logger.logToSummary(`    Parsing ${path.basename(parseMatch[1])}`);
            return;
        }
        const moduleMatch = line.match(/RTLIL representation for module `\\([^']+)'/);
        if (moduleMatch) {
            ToolchainStage.logger.logToSummary(`        - Module ${moduleMatch[1]} parsed`);
            return;
        }
        const portMatch = line.match(/(input|output|inout) \[([0-9]+):([0-9]+)\] ([^\n]+)/);
        if (portMatch) {
            const portSize = Math.abs((+portMatch[2]) - (+portMatch[3])) + 1;
            if (portSize === 1) {
                this.ports.push(portMatch[4]);
            } else {
                for (let i = 0; i < portSize; i += 1) {
                    this.ports.push(`${portMatch[4]}[${i}]`);
                }
            }
        }
    }
    protected onCommandPrintErrorLine(line: string): void {
        ToolchainStage.logger.logToSummary('    Error: ' + line.trimEnd());
        if (line.includes('ERROR: syntax error, unexpected')) {
            const errorLocation = line.match(/([^/\\]+\.v):([0-9]+):/);
            if (errorLocation && +errorLocation[2] > 1) {
                ToolchainStage.logger.logToSummary(`    Check lines ${+errorLocation[2]-1}-${errorLocation[2]} of file ${errorLocation[1]} you may be missing a semicolon or left a block open`)
            }
        }
        if (line.includes('ERROR: Module') && line.includes("is not part of the design")) {
            //Error: ERROR: Module `\mds' referenced in module `\led_blink' in cell `\m' is not part of the design.
            const moduleMatches = line.match(/ERROR: Module `\\([^']+)' referenced in module `\\([^']+)' in cell `\\([^']+)'/);
            if (moduleMatches) {
                ToolchainStage.logger.logToSummary(`    Check if module instantiation \`${moduleMatches[1]} ${moduleMatches[3]}(...)\` in module ${moduleMatches[2]} is a typo or maybe the module is not included in your projectfile`)
            }
        }
    }
    protected onCommandEnd(): void {
    }   
}