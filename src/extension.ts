// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import * as path from 'path';
import { parseProjectFile, ProjectFile } from './projecfile';
import { existsSync, fstat, rm, rmSync, statSync } from 'fs';
import { SerialPort } from 'serialport';
import { PortInfo } from '@serialport/bindings-cpp';
import { ConstraintsEditor } from './panels/constraints-editor';
import { writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { ToolchainStage } from './stages/stage';
import { CommandOption } from './utils/command-options';
import { getStagesForOption } from './stages';
import { ModuleDebuggerWebviewContentProvider } from './panels/module-debugger';

let myStatusBarItem: vscode.StatusBarItem;
let projectStatusBarItem: vscode.StatusBarItem;
let selectedProject: {name: string, path: string} | undefined;

const RUN_TOOLCHAIN_CMD_ID = 'lushay-code.runFPGAToolchain';
const SELECT_PROJECT_CMD_ID = 'lushay-code.selectProject';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

let outputPanel: vscode.OutputChannel | undefined;
let rawOutputPanel: vscode.OutputChannel | undefined;

async function refreshDiagnostics(doc: vscode.TextDocument, verilogDiagnostics: vscode.DiagnosticCollection) {
	const diagnostics: Record<string, vscode.Diagnostic[]> = {};
	if (!selectedProject) {
		const projectFiles = await vscode.workspace.findFiles('**/*.lushay.json');
		if (projectFiles.length > 0) {
			verilogDiagnostics.clear();
			return;
		}
	}
	const projectFile = await parseProjectFile(undefined, selectedProject?.path);
	const ossCadPath = await getOssCadSuitePath();
	if (!projectFile || !ossCadPath) {
		verilogDiagnostics.clear();
		return;
	}
	const verilatorPath = path.join(ossCadPath, 'verilator');
	const ossRootPath = path.resolve(ossCadPath, '..');
	const gowinCellsPath = path.join(ossRootPath, 'share/yosys/gowin/cells_sim.v');
	const vltConfigPath = path.join(projectFile.basePath, `___tempbuild_1${projectFile.name}.vlt`);
	const vltContent = `\`verilator_config
lint_off -file "${gowinCellsPath}"
`;
	writeFileSync(vltConfigPath, vltContent);
	const res = spawnSync(
		verilatorPath,  
		[
			'--top-module', projectFile.top || 'top',
			'--lint-only', 
			`-Wall`, 
			gowinCellsPath,
			vltConfigPath,
			...projectFile.includedFilePaths
		], 
		{
		env: {
			PATH: [
				path.join(ossRootPath, 'bin'),
				path.join(ossRootPath, 'lib'),
				path.join(ossRootPath, 'py3bin'),
				process.env.PATH
			].join(process.platform === 'win32' ? ';' : ':')
		},
		cwd: projectFile.basePath
	});
	rmSync(vltConfigPath);
	const errorLines = res.stderr?.toString().split('\n') || [];
	let subGroup: string[] = [];
	let inGroup = false;
	errorLines.forEach((line) => {
		if (inGroup) {
			if (line.startsWith(' ')) {
				subGroup.push(line);
			} else {
				inGroup = false;
				if (subGroup.length > 0) {
					const issue = convertLinesToIssue(subGroup);
					if (issue) {
						if (!diagnostics[issue.file]) {
							diagnostics[issue.file] = [];
						}
						diagnostics[issue.file].push(new vscode.Diagnostic(
							new vscode.Range(issue.line-1, issue.col-1, issue.line-1, issue.col + issue.length),
							issue.message,
							issue.type === IssueType.WARNING ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error
						));
					}
				}
			}
		}
		if (line.match((/^%(Error|Warning)/i))) {
			inGroup = true;
			subGroup = [line];
		} 
	});
	verilogDiagnostics.clear();
	for (const path in diagnostics) {
		verilogDiagnostics.set(vscode.Uri.file(path), diagnostics[path]);
	}
}

enum IssueType {
	WARNING = 'warning',
	ERROR = 'error'
}
interface Issue {
	type: IssueType;
	file: string;
	line: number;
	col: number;
	length: number;
	message: string;
}

function convertLinesToIssue(lines: string[]): Issue | undefined {
	const type = lines[0].toLowerCase().startsWith('%error') ? IssueType.ERROR : IssueType.WARNING;
	const fileInfo = lines[0].match(/^%[^ ]+: ([^:]+):([^:]+):([^:]+):(.*)$/);
	if (!fileInfo) {
		return;
	}
	const file = fileInfo[1];
	const line = +fileInfo[2];
	const col = +fileInfo[3];
	const message = fileInfo[4].trim();
	let length = 0;
	lines.forEach((line) => {
		const lengthIndicator = line.match(/\| *\^(~+)/);
		if (lengthIndicator) {
			length = lengthIndicator[1].length;
		}
	});
	if (message.includes("does not match MODULE name")) {
		return;
	}

	return {
		type,
		file,
		line,
		col,
		message,
		length
	}
}

export async function activate(context: vscode.ExtensionContext) {
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.text = '$(megaphone) FPGA Toolchain';
	myStatusBarItem.command = RUN_TOOLCHAIN_CMD_ID;

	projectStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	projectStatusBarItem.text = selectedProject?.name || '<Auto-Detect Project>';
	projectStatusBarItem.command = SELECT_PROJECT_CMD_ID;

	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(vscode.commands.registerCommand(RUN_TOOLCHAIN_CMD_ID, clickedPanelButton));

	context.subscriptions.push(projectStatusBarItem);
	context.subscriptions.push(vscode.commands.registerCommand(SELECT_PROJECT_CMD_ID, selectProjectFile));
	projectStatusBarItem.show();

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
		updateStatusBarItem();
		if (editor?.document.uri) {
			ModuleDebuggerWebviewContentProvider.updateCurrentFile(editor.document.uri);
		}
	}));
	updateStatusBarItem();
	context.subscriptions.push(ConstraintsEditor.register(context, getOssCadSuitePath, () => selectedProject));

	// diagnostics
	const verilogDiagnostics = vscode.languages.createDiagnosticCollection("verilog");
	context.subscriptions.push(verilogDiagnostics);

	if (vscode.window.activeTextEditor) {
		await refreshDiagnostics(vscode.window.activeTextEditor.document, verilogDiagnostics);
	}
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(document => {
			refreshDiagnostics(document, verilogDiagnostics);
			if (document.uri) {
				ModuleDebuggerWebviewContentProvider.updateCurrentFile(document.uri);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => () => {
			refreshDiagnostics(e.document, verilogDiagnostics);
			ModuleDebuggerWebviewContentProvider.updateCurrentFile(e.document.uri);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => verilogDiagnostics.delete(doc.uri))
	);

	context.subscriptions.push(ModuleDebuggerWebviewContentProvider.register(context.extensionUri, getOssCadSuitePath, () => selectedProject));
	if (vscode.window.activeTextEditor?.document.uri) {
		ModuleDebuggerWebviewContentProvider.updateCurrentFile(vscode.window.activeTextEditor?.document.uri);
	}
}

async function selectProjectFile(): Promise<void> {
	if (!vscode.workspace.workspaceFolders?.length) {
		vscode.window.showErrorMessage('No workspace open');
		return;
	}
	const projectFiles = await vscode.workspace.findFiles('**/*.lushay.json');
	const projectMap: Record<string, string> = {};
	const projectFullMap: Record<string, string> = {};
	let useFullMap = false;
	projectFiles.forEach((projectFile) => {
		projectFullMap[path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, projectFile.fsPath)] = projectFile.fsPath;
		if (projectMap[path.basename(projectFile.fsPath)]) {
			useFullMap = true;
		}
		projectMap[path.basename(projectFile.fsPath)] = projectFile.fsPath;
	});
	const mapToUse = useFullMap ? projectFullMap : projectMap;
	const projectFileNames = Object.keys(mapToUse);
	if (selectedProject) {
		projectFileNames.push('Unset Selected Project');
	}
	projectFileNames.push('+ Create new Project File');
	
	const selected = await vscode.window.showQuickPick(projectFileNames, {ignoreFocusOut: true, canPickMany: false, title: 'Choose Project File'});
	if (!selected) {
		return;
	}
	if (selected === 'Unset Selected Project') {
		selectedProject = undefined;
		projectStatusBarItem.text = '<Auto-Detect Project>';
		if (vscode.window.activeTextEditor?.document.uri) {
			ModuleDebuggerWebviewContentProvider.updateCurrentFile(vscode.window.activeTextEditor?.document.uri);
		}
		return;
	}
	if (selected === '+ Create new Project File') {
		let name = await vscode.window.showInputBox({title: 'Project file Name', ignoreFocusOut: true});
		if (!name) {return;}

		if (!name.endsWith('.lushay.json')) {
			name = name + '.lushay.json';
		}
		const fullPath = path.isAbsolute(name) ? name : path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, name);
		writeFileSync(fullPath, JSON.stringify({name: name.replace(/\.lushay\.json$/, ''), includedFiles: 'all'}, undefined, 4));
		projectStatusBarItem.text = name;
		selectedProject = {name, path: fullPath};
		const pFile = await vscode.workspace.openTextDocument(fullPath);
		await vscode.window.showTextDocument(pFile);
		return
	}
	projectStatusBarItem.text = selected;
	selectedProject = {name: selected, path: useFullMap ? projectFullMap[selected] : projectMap[selected]};
	if (vscode.window.activeTextEditor?.document.uri) {
		ModuleDebuggerWebviewContentProvider.updateCurrentFile(vscode.window.activeTextEditor?.document.uri);
	}
}

function updateStatusBarItem(): void {
	myStatusBarItem.show();
}

function writeToBoth(str: string) {
	outputPanel?.append(str);
	rawOutputPanel?.append(str);
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
	outputPanel = vscode.window.createOutputChannel('Toolchain Summary', 'fpga-toolchain-output');
	rawOutputPanel.show(true);
	outputPanel.show(false);
}

async function getOssCadSuitePath(): Promise<string | undefined> {
	const config = vscode.workspace.getConfiguration('lushay');
	if (!config.has('OssCadSuite') || !config.OssCadSuite.path) {
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
	try {
		const cadPathInfo = statSync(ossCadPath);
		if (!cadPathInfo || !cadPathInfo.isDirectory()) {
			return;
		}
	} catch (e) {
		return;
	}
	return ossCadPath;
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
		logToSummary,
		writeToBoth
	}
	const apiKey = config.Build.cloudApiKey || '';

	ToolchainStage.initialize(
		ossCadPath,
		logger,
		apiKey
	)


	const projectFile = await parseProjectFile(logger, selectedProject?.path);

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
		title: projectFile.fileName,
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
	const toolchain = config.has('Build') ? config.Build.toolchain : 'open-source';

	const validSettings = await validateProjectFileAndOption(projectFile, option as CommandOption);
	if (!validSettings) {
		return;
	}
	const stages = await getStagesForOption(projectFile, option as CommandOption, toolchain);
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
				].join(process.platform === "win32" ? ';' : ':'),
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