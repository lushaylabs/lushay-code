import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProjectFile {
	name: string;
	includedFiles: string[] | 'all';
	externalFlashFiles?: string[];
	top?: string;
    constraintsFile: string;
	programMode: 'flash' | 'ram';
	testBenches: string[] | 'all';
	baudRate: number;
	nextPnrGowinOptions: string[];
	synthGowinOptions: string[];
	basePath: string;
	fileName: string;
	includedFilePaths: string[];
    board: string;
	externalFlashFilePath: string;
	testBenchPath: string;
	skipCstChecking: boolean;
}

export interface Logger {
    logToBoth(msg: string): void;
    logToSummary(msg: string): void;
    logToRaw(msg: string): void;
}

export async function parseProjectFile(logger?: Logger, selectedProject?: string): Promise<ProjectFile | undefined> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceFolder) {
		logger?.logToBoth('    Error: No workspace open');
		return;
	}

    const projectFiles = await vscode.workspace.findFiles('**/*.lushay.json');
	if (!vscode.workspace.workspaceFolders?.length) {
		logger?.logToBoth('Error no <project>.lushay.json file or workspace found');
		return;
	}
	const projectFolderName = vscode.workspace.workspaceFolders[0].name;
	if (projectFiles.length === 0) {

		const constraintsFiles = await vscode.workspace.findFiles(path.join('**','*.cst'));
		if (constraintsFiles.length === 0) {
			logger?.logToBoth('Error no constraints (.cst) file found');	
			return
		}
		return expandProjectFile({
			name: projectFolderName,
			includedFiles: 'all',
			constraintsFile: constraintsFiles[0].fsPath,
			programMode: 'flash',
			basePath: vscode.workspace.workspaceFolders[0].uri.fsPath,
			fileName: projectFolderName,
			includedFilePaths: [],
			board: 'tangnano9k',
			externalFlashFilePath: '',
			testBenches: 'all',
			testBenchPath: '',
			synthGowinOptions: [],
			nextPnrGowinOptions: [],
			baudRate: 115200,
			skipCstChecking: false
		})
	}
	
	const projectFilePath = selectedProject ? selectedProject : await selectProjectFile(projectFiles);
	if (!projectFilePath) {
		return;
	}
	const projectFileName = path.basename(projectFilePath);
	
	logger?.logToBoth(`Processing ${projectFileName}`);
	let projectFile: ProjectFile | null = null;
	try {
		projectFile = JSON.parse(fs.readFileSync(projectFilePath).toString());
		if (!projectFile) {
			logger?.logToBoth('    Error: Not able to parse project file');
			return;
		}
		
		projectFile.fileName = projectFileName;
		projectFile.basePath = path.dirname(projectFilePath);

		// backward compatability 
		if (!projectFile.constraintsFile && (projectFile as any).constraintsFilePath) {
			projectFile.constraintsFile = (projectFile as any as {constraintsFilePath: string}).constraintsFilePath;
		}
		if (!projectFile.name) {
			projectFile.name = projectFileName.replace('.lushay.json', '');
		}
		if (!projectFile.includedFiles) {
			projectFile.includedFiles = 'all';
		}

		if (!projectFile.skipCstChecking) {
			projectFile.skipCstChecking = false;
		}

		if (!projectFile.testBenches) {
			projectFile.testBenches = [];
		}

		if (!projectFile.baudRate) {
			projectFile.baudRate = 115200;
		}

		if (!projectFile.synthGowinOptions) {
			projectFile.synthGowinOptions = [];
		}

		if (!projectFile.nextPnrGowinOptions) {
			projectFile.nextPnrGowinOptions = [];
		}
	
		if (!projectFile.constraintsFile) {
			const basePathRelativetoProject = path.relative(workspaceFolder, projectFile.basePath);
			const constraintsFile = await vscode.workspace.findFiles(path.join(basePathRelativetoProject, '*.cst'));
			if (constraintsFile.length > 0) {
				projectFile.constraintsFile = constraintsFile[0].fsPath;
			} else {
				logger?.logToBoth('    No constraints file found, set (key: `constraintsFile`) inside ' + projectFile.fileName);
				return;
			}
		} 
	} catch(e) {
		logger?.logToBoth('    Error: ' + e)
		return;
	}

    return expandProjectFile(projectFile);
}

async function expandProjectFile(projectFile: ProjectFile): Promise<ProjectFile> {
	const workspaceFolder = vscode.workspace.workspaceFolders![0]!.uri.fsPath;
	
	if (!projectFile.programMode) {
		projectFile.programMode = 'flash';
	}

	if (!projectFile.board) {
		projectFile.board = 'tangnano9k';
	}

	const basePathRelativetoProject = path.relative(workspaceFolder, projectFile.basePath);
	projectFile.includedFilePaths = ((projectFile.includedFiles === 'all') ? 
		(await vscode.workspace.findFiles(path.join(basePathRelativetoProject, '**', '*.v')))
		.map((file) => file.fsPath).filter((filePath) => !filePath.endsWith('_tb.v')) :
		projectFile.includedFiles.map((fileName: string) => {
			if (path.isAbsolute(fileName)) {
				return fileName;
			}
			return path.join(projectFile.basePath, fileName);
		})
	);

	projectFile.testBenches = ((projectFile.testBenches === 'all') ?
		(await vscode.workspace.findFiles(path.join(basePathRelativetoProject, '**', '*.v')))
		.map((file) => file.fsPath).filter((filePath) => filePath.endsWith('_tb.v')) :
		projectFile.testBenches.map((fileName: string) => {
			if (path.isAbsolute(fileName)) {
				return fileName;
			}
			return path.join(projectFile.basePath, fileName);
		})
	);

	projectFile.externalFlashFiles = projectFile.externalFlashFiles ? 
		projectFile.externalFlashFiles.map((fileName: string) => {
			if (path.isAbsolute(fileName)) {
				return fileName;
			}
			return path.join(projectFile.basePath, fileName);
		}) : [];

	if (!path.isAbsolute(projectFile.constraintsFile)) {
		projectFile.constraintsFile = path.join(projectFile.basePath, projectFile.constraintsFile);
	}

	return projectFile;
}

async function selectProjectFile(projectFiles: vscode.Uri[]): Promise<string | undefined> {
	if (projectFiles.length === 1) {
		return projectFiles[0].fsPath;
	}
	
	const filesMap: Record<string, vscode.Uri> = {};
	for (const file of projectFiles) {
		filesMap[path.basename(file.fsPath)] = file;
	}
	const selectedFile = await vscode.window.showQuickPick(
		Object.keys(filesMap),
		{
			title: 'Choose Project File',
			ignoreFocusOut: true,
			canPickMany: false
		}
	);
	if (!selectedFile) {
		return;
	}
	return filesMap[selectedFile].fsPath;
}