// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
let myStatusBarItem: vscode.StatusBarItem;
import * as path from 'path';
import { GowinPackStage, IVerilogTestbenchStage, NextPnrGowinStage, OpenFPGALoaderExternalFlashStage, OpenFPGALoaderFsStage, ToolchainStage, YosysGowinStage } from './stages';
import { parseProjectFile, ProjectFile } from './projecfile';
import { existsSync, fstat, statSync } from 'fs';
import { SerialPort } from 'serialport';
import { PortInfo } from '@serialport/bindings-cpp';
import { ConstraintsEditor } from './panels/constraints-editor';

type StageClass = new (projectFile: ProjectFile) => ToolchainStage;

const RUN_TOOLCHAIN_CMD_ID = 'lushay-code.runFPGAToolchain';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

let outputPanel: vscode.OutputChannel | undefined;
let rawOutputPanel: vscode.OutputChannel | undefined;

enum CommandOption {
	BUILD_AND_PROGRAM = 'Build and Program',
	BUILD_ONLY = 'Build Only',
	PROGRAM_ONLY = 'Program Only',
	EXTERNAL_FLASH = 'External Flash',
	RUN_TESTBENCH = 'Run Testbench',
	OPEN_TERMINAL = 'Open Terminal',
	SERIAL_CONSOLE = 'Open Serial Console',
	CANCEL = 'Cancel'
}

export async function activate(context: vscode.ExtensionContext) {
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.text = '$(megaphone) FPGA Toolchain';
	myStatusBarItem.command = RUN_TOOLCHAIN_CMD_ID;

	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(vscode.commands.registerCommand(RUN_TOOLCHAIN_CMD_ID, clickedPanelButton))

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
	updateStatusBarItem();
	ConstraintsEditor.register(context);
}

function updateStatusBarItem(): void {
	myStatusBarItem.show();
}


function logToBoth(str: string) {
	outputPanel?.appendLine(str);
	rawOutputPanel?.appendLine(str);
}
function logToRaw(str: string) {
	rawOutputPanel?.appendLine(str);
}
function logToSummary(str: string) {
	outputPanel?.appendLine(str);
}

async function setupOssCadSuitePath(): Promise<void> {
	const ossCadSuitePath = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Select Path'
	});
	if (ossCadSuitePath && ossCadSuitePath.length > 0) {
		let ossCadPath = ossCadSuitePath[0].fsPath;
		if (!ossCadPath.replace(/\/\\/g, '').endsWith('bin')) {
			ossCadPath = path.join(ossCadPath, 'bin');
		}
		if (!existsSync(path.join(ossCadPath, 'yosys')) && !existsSync(path.join(ossCadPath, 'yosys.exe'))) {
			vscode.window.showErrorMessage('Could not locate binaries at that path');
			return;
		}
		const config = vscode.workspace.getConfiguration('lushay');
		await config.update('OssCadSuite.path', ossCadPath, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage('Path Set Successfuly');
	} else {
		vscode.window.showErrorMessage('Path not set');
	}
}

async function getOssCadSuite(): Promise<void> {
	vscode.env.openExternal(vscode.Uri.parse('https://github.com/YosysHQ/oss-cad-suite-build/releases'));
}

async function setupLogs(): Promise<void> {
	if (rawOutputPanel) {
		rawOutputPanel.dispose();
	}
	if (outputPanel) {
		outputPanel.dispose();
	}
	rawOutputPanel = vscode.window.createOutputChannel('Toolchain Raw Output');
	outputPanel = vscode.window.createOutputChannel('Toolchain Summary');
	rawOutputPanel.show(true);
	outputPanel.show(false);
}

async function clickedPanelButton(): Promise<void> {
	await setupLogs();
	const config = vscode.workspace.getConfiguration('lushay');
	if (!config.has('OssCadSuite') || !config.OssCadSuite.path) {
		logToBoth('Error OSS Cad Suite Path not setup in settings');
		const selection = await vscode.window.showErrorMessage('OSS Cad Suite Path not setup', 'Setup Now', 'Get OSS Cad Suite');
		if (selection === 'Setup Now') {
			setupOssCadSuitePath();
		}
		if (selection === 'Get OSS Cad Suite') {
			getOssCadSuite();
		}
		return;
	}
	let ossCadPath: string = config.OssCadSuite.path;
	if (!ossCadPath.replace(/\/\\/g, '').endsWith('bin')) {
		ossCadPath = path.join(ossCadPath, 'bin');
	}

	const cadPathInfo = statSync(ossCadPath);
	if (!cadPathInfo || !cadPathInfo.isDirectory()) {
		logToBoth('Error OSS Cad Suite Path is not a directory');
		return;
	}

	const logger = {
		logToBoth,
		logToRaw,
		logToSummary
	}

	ToolchainStage.initialize(
		ossCadPath,
		logger
	)


	const projectFile = await parseProjectFile(logger);

	if (!projectFile) {
		return;
	}

	const commandOptions: CommandOption[] = [
		CommandOption.BUILD_AND_PROGRAM,
		CommandOption.BUILD_ONLY,
		CommandOption.PROGRAM_ONLY,
	];

	if (projectFile.externalFlashFiles && projectFile.externalFlashFiles.length > 0) {
		commandOptions.push(CommandOption.EXTERNAL_FLASH);
	}

	if (projectFile.testBenches.length > 0) {
		commandOptions.push(CommandOption.RUN_TESTBENCH);
	}

	commandOptions.push(CommandOption.SERIAL_CONSOLE);
	commandOptions.push(CommandOption.OPEN_TERMINAL);
	commandOptions.push(CommandOption.CANCEL);

	const option = await vscode.window.showQuickPick(commandOptions, {
		canPickMany: false,
		title: 'FPGA Toolchain Options',
		ignoreFocusOut: true
	});

	if (!option || option === CommandOption.CANCEL) {
		return;
	}

	if (option === CommandOption.OPEN_TERMINAL) {
		await openTerminal(ossCadPath, projectFile);
		return;
	}

	if (option === CommandOption.SERIAL_CONSOLE) {
		await openSerialTerminal(projectFile);
		return
	}

	logToBoth('Starting FPGA Toolchain');

	const validSettings = await validateProjectFileAndOption(projectFile, option as CommandOption);
	if (!validSettings) {
		return;
	}
	const stages = await getStagesForOption(option as CommandOption);
	const stageInstances: ToolchainStage[] = [];
	for (const stageClass of stages) {
		const nextStage = new stageClass(projectFile);
		const responseCode = await nextStage.runProg(stageInstances[stageInstances.length - 1]);
		if (responseCode !== 0) {
			logToBoth('Task finished with errors exiting')
			break;
		}
		stageInstances.push(nextStage);
	}
	logToBoth('Toolchain Completed');
}

function getStagesForOption(option: CommandOption): StageClass[] {
	if (option === CommandOption.BUILD_ONLY) {
		return [
			YosysGowinStage,
			NextPnrGowinStage,
			GowinPackStage
		];
 	}
	if (option === CommandOption.BUILD_AND_PROGRAM) {
		return [
			YosysGowinStage,
			NextPnrGowinStage,
			GowinPackStage,
			OpenFPGALoaderFsStage
		];
	}
	if (option === CommandOption.PROGRAM_ONLY) {
		return [OpenFPGALoaderFsStage];
	}

	if (option === CommandOption.EXTERNAL_FLASH) {
		return [OpenFPGALoaderExternalFlashStage];
	}

	if (option === CommandOption.RUN_TESTBENCH) {
		return [IVerilogTestbenchStage];
	}

	return [];
}

async function chooseFile(title: string, files: string[]): Promise<string | undefined> {
	if (files.length === 1) {
		return files[0];
	}

	const fileMap: Record<string, string> = {};
	for (const file of files) {
		fileMap[path.basename(file)] = file;
	}
	const chosenFile = await vscode.window.showQuickPick(Object.keys(fileMap), {
		title,
		canPickMany: false,
		ignoreFocusOut: true,
	});
	if (!chosenFile) {
		return;
	}
	return fileMap[chosenFile];
}

async function validateProjectFileAndOption(projectFile: ProjectFile, option: CommandOption): Promise<boolean> {
	if ([CommandOption.BUILD_AND_PROGRAM, CommandOption.BUILD_ONLY].includes(option) && projectFile.includedFilePaths.length === 0) {
		logToBoth('No files to synthesize');
		return false;
	}
	if (option === CommandOption.EXTERNAL_FLASH) {
		const externalFlashFile = await chooseFile('Choose External Flash Binary', projectFile.externalFlashFiles!);
		if (!externalFlashFile) {
			logToBoth('No external flash file selected');
			return false;
		}
		projectFile.externalFlashFilePath = externalFlashFile;
	}
	if (option === CommandOption.RUN_TESTBENCH) {
		const testbench = await chooseFile('Choose Testbench to Run', projectFile.testBenches as string[]);
		if (!testbench) {
			logToBoth('No testbench selected');
			return false;
		}
		projectFile.testBenchPath = testbench;
	}
	return true;
}
let terminal: vscode.Terminal | undefined;
async function openTerminal(ossCadSuiteBinPath: string, projectFile: ProjectFile): Promise<void> {
	const ossRootPath = path.resolve(ossCadSuiteBinPath, '..');
	if (!terminal || terminal.exitStatus) {
		terminal = vscode.window.createTerminal({
			name: 'OSS-Cad-Suite',
			cwd: projectFile.basePath,
			env: {
				PATH: [
					path.join(ossRootPath, 'bin'),
					path.join(ossRootPath, 'lib'),
					path.join(ossRootPath, 'py3bin'),
					process.env.PATH
				].join(';'),
				something: 'demo'
			},
		});
	}
	if (process.platform === 'win32') {
		terminal.sendText('cls', true);
	} else {
		terminal.sendText('clear', true);
	}
	terminal.show();
}

let serialConsole: vscode.Terminal | undefined;
let serialPort: SerialPort | undefined;
let reconnectTimeout: NodeJS.Timeout | undefined;

async function openSerialTerminal(projectFile: ProjectFile): Promise<void> {
	if (!serialConsole || serialConsole.exitStatus) {
		const ports = await SerialPort.list();
		if (ports.length === 0) {
			logToBoth('No Serial Devices found');
			if (process.platform === 'win32') {
				logToBoth('    This may be because the device is not plugged in or the driver is not correct');
				logToBoth('    It should show up as "USB Serial Converter B" in device manager');
			} else {
				logToBoth('    This may be because the device is not plugged in');
			}
		}

		let devicePorts = ports.filter((port) => {
			return port.vendorId === '0403' && port.productId === '6010';
		});

		let devicePort: PortInfo | undefined;
		if (devicePorts.length === 1) {
			devicePort = devicePorts[0];
		}
		if (devicePorts.length > 1) {
			const devicePaths = devicePorts.map((port) => port.path);
			const selectedPath = await vscode.window.showQuickPick(devicePaths,{
				title: 'Select Device',
				canPickMany: false,
				ignoreFocusOut: true
			});
			if (!selectedPath) {
				return;
			}
			devicePort = devicePorts.find((port) => port.path === selectedPath);
		}

		if (!devicePort) {
			const devicePortMap: Record<string, PortInfo>  = {}
			
			ports.forEach((port) => {
				devicePortMap[(port as any).friendlyName || port.path] = port;
			});

			const chosenPort = await vscode.window.showQuickPick(Object.keys(devicePortMap), {
				title: 'Choose Serial Port',
				canPickMany: false,
				ignoreFocusOut: true,
			});
			if (!chosenPort) {
				logToBoth('No port chosen')
				return;
			}
			devicePort = devicePortMap[chosenPort];
		}

		if (serialPort) {
			await closeCurrentConnection();
		}

		
		const serialWriteEmitter = new vscode.EventEmitter<string>();
		const serialStopEmitter = new vscode.EventEmitter<number | void>();

		const setupDevicePort = (devicePort: PortInfo) => {
			serialPort = new SerialPort({
				path: devicePort.path,
				baudRate: projectFile.baudRate,
				endOnClose: true,
			}, (err) => {
				if (err) {
					serialWriteEmitter.fire(err.message + '\r\n');
				} else {
					serialWriteEmitter.fire('Connected\r\n');
				}
			});
			serialPort.on('end', () => {
				serialWriteEmitter.fire('Connection Closed\r\n');
				if (reconnectTimeout) {
					clearTimeout(reconnectTimeout);
				}
				const checkForPort = async () => {
					if (serialConsole?.exitStatus) { return; }
					const connectedPorts = await SerialPort.list();
					const ourPort = connectedPorts.find((port) => {
						return port.path === devicePort.path
					});
					if (ourPort) {
						setupDevicePort(ourPort);
					} else {
						setTimeout(checkForPort, 1000);
					}
				}
				reconnectTimeout = setTimeout(checkForPort, 1000);
			});

			serialPort.on('data', (data: Buffer) => {
				serialWriteEmitter.fire(data.toString());
			});
			serialPort.on('error', (err) => {
				serialWriteEmitter.fire(err.message+ '\r\n');
			})
		}
		
		serialConsole = vscode.window.createTerminal({
			name: 'Serial Console',
			pty: {
				open() {
					if (!devicePort) { return; }
					serialWriteEmitter.fire('Serial Console'+ '\r\n');
					setupDevicePort(devicePort);
				},
				close() {
					serialPort?.close();
					if (reconnectTimeout) {
						clearTimeout(reconnectTimeout);
					}
				},
				onDidWrite: serialWriteEmitter.event,
				onDidClose: serialStopEmitter.event,
				handleInput(data: string) {
					serialWriteEmitter.fire(data === '\r' ? '\r\n' : data)
					serialPort?.write(Buffer.from(data));
				},
			}
		});
	}
	serialConsole.show(false);
	
}

function closeCurrentConnection(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!serialPort) {
			resolve();
			return;
		}
		serialPort.close((err) => {
			resolve();
		})
	});
}

export function deactivate() {}