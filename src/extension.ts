// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
let myStatusBarItem: vscode.StatusBarItem;
import * as path from 'path';
import { GowinPackStage, IVerilogTestbenchStage, NextPnrGowinStage, OpenFPGALoaderExternalFlashStage, OpenFPGALoaderFsStage, ToolchainStage, YosysGowinStage } from './stages';
import { parseProjectFile, ProjectFile } from './projecfile';
import { existsSync, fstat, statSync } from 'fs';

type StageClass = new (projectFile: ProjectFile) => ToolchainStage;

const RUN_TOOLCHAIN_CMD_ID = 'lushay-code.runFPGAToolchain';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

const outputPanel = vscode.window.createOutputChannel('Toolchain Summary');
const rawOutputPanel = vscode.window.createOutputChannel('Toolchain Raw Output');

enum CommandOption {
	BUILD_AND_PROGRAM = 'Build and Program',
	BUILD_ONLY = 'Build Only',
	PROGRAM_ONLY = 'Program Only',
	EXTERNAL_FLASH = 'External Flash',
	RUN_TESTBENCH = 'Run Testbench',
	CANCEL = 'Cancel'
}

export async function activate(context: vscode.ExtensionContext) {
	outputPanel.hide();
	rawOutputPanel.hide();

	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.text = '$(megaphone) FPGA Toolchain';
	myStatusBarItem.command = RUN_TOOLCHAIN_CMD_ID;

	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(vscode.commands.registerCommand(RUN_TOOLCHAIN_CMD_ID, clickedPanelButton))

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
	updateStatusBarItem();
}

function updateStatusBarItem(): void {
	myStatusBarItem.show();
}

function clearLogs() {
	rawOutputPanel.clear();
	outputPanel.clear();
}

function showLogs() {
	rawOutputPanel.show(true);
	outputPanel.show(false);
}

function logToBoth(str: string) {
	outputPanel.appendLine(str);
	rawOutputPanel.appendLine(str);
}
function logToRaw(str: string) {
	rawOutputPanel.appendLine(str);
}
function logToSummary(str: string) {
	outputPanel.appendLine(str);
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
		console.log(config);
		console.log(config.inspect('OssCadSuite'));
		await config.update('OssCadSuite.path', ossCadPath, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage('Path Set Successfuly');
	} else {
		vscode.window.showErrorMessage('Path not set');
	}
}

async function getOssCadSuite(): Promise<void> {
	vscode.env.openExternal(vscode.Uri.parse('https://github.com/YosysHQ/oss-cad-suite-build/releases'));
}

async function clickedPanelButton(): Promise<void> {
	clearLogs();
	showLogs();
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

	commandOptions.push(CommandOption.CANCEL);

	const option = await vscode.window.showQuickPick(commandOptions, {
		canPickMany: false,
		title: 'FPGA Toolchain Options',
		ignoreFocusOut: true
	});

	if (!option || option === CommandOption.CANCEL) {
		return;
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

export function deactivate() {}