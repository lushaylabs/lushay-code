import * as vscode from 'vscode';
import { parseProjectFile } from '../projecfile';
import path = require('path');
import { spawnSync } from 'child_process';
import { Uri } from 'vscode';
import * as fs from 'fs';
import * as os from 'os';

export class ModuleDebuggerWebviewContentProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lushay-code-module-debugger-content';
    private _view?: vscode.WebviewView;
    public static ossCadSuitePath?: () => Promise<string | undefined>;
    public static selectedProject?: () => {name: string, path: string} | undefined;
    public static getOverridePaths?: () => Promise<Record<string, string>>;
    public static currentFile?: vscode.Uri;
    private static _instance?: ModuleDebuggerWebviewContentProvider;
    private modulesInFile: Array<{ name: string; ports: Array<{ name: string; direction: string; size: number; }>; }>;

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) {
        this.modulesInFile = [];
    }
    static updateCurrentFile(uri: vscode.Uri) {
        const fileChanged = ModuleDebuggerWebviewContentProvider.currentFile?.fsPath !== uri.fsPath;
        this.currentFile = uri;
        if (this._instance) {
            this._instance.updateCurrentFile(fileChanged);
        }
    }

    public async updateCurrentFile(changedFile: boolean) {
        if (!ModuleDebuggerWebviewContentProvider.currentFile || !ModuleDebuggerWebviewContentProvider.currentFile.fsPath.endsWith('.v')) {
            this._view?.webview.postMessage({
                command: 'updatedCurrentModules',
                data: []
            })
            return;
        }
        const ossCadPath = await ModuleDebuggerWebviewContentProvider.ossCadSuitePath?.();
        if (!ossCadPath) {
            this._view?.webview.postMessage({
                command: 'updatedCurrentModules',
                data: []
            })
            return;
        }
        const selectedProject = ModuleDebuggerWebviewContentProvider.selectedProject?.();
        const numLushayFiles = (await vscode.workspace.findFiles('**/*.lushay.json'));
        if (!selectedProject && numLushayFiles.length > 1) {
            this._view?.webview.postMessage({
                command: 'updatedCurrentModules',
                data: [],
                error: 'Please Select a Project',
                extra: 'This can be done by clicking the button in the bottom toolbar labeled "<Auto-Detect Project>"'
            })
            return;
        }
        const projectToUse = selectedProject || {name: 'default', path: numLushayFiles[0].fsPath};
        const projectFile = await parseProjectFile(undefined, projectToUse?.path, false);
        if (!projectFile) {
            this._view?.webview.postMessage({
                command: 'updatedCurrentModules',
                data: [],
                error: numLushayFiles.length > 1 ? 'Please Select a Project' : 'No Project Found',
                extra: numLushayFiles.length > 1 ? 'This can be done by clicking the button in the bottom toolbar labeled "<Auto-Detect Project>"' : undefined
            })
            return;
        }
        const overrides = await ModuleDebuggerWebviewContentProvider.getOverridePaths?.() || {};
        const yosysPath = overrides['yosys'] || path.join(ossCadPath, 'yosys');
        const ossRootPath = path.resolve(ossCadPath, '..');
        const res = spawnSync(yosysPath,  ['-p', `read_verilog "${ModuleDebuggerWebviewContentProvider.currentFile.fsPath}"; portlist *`], {
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
        if (res.status !== 0) {
            console.log(res.stderr.toString());
            this._view?.webview.postMessage({
                command: 'updatedCurrentModules',
                data: [],
                error: 'Error compiling module',
                extra: res.stderr.toString()
            })
            return;
        }
        const resLines = res.stdout.toString().replace(/\r\n/g, '\n').split('\n');
        const modulesInFile: Array<{
            name: string, 
            ports: Array<{name: string, direction: string, size: number}>
        }> = [];
        let currentModule: {name: string, ports: Array<{name: string, direction: string, size: number}>} | undefined;
        for (const line of resLines) {
            if (line.startsWith('module ')) {
                const moduleName = line.replace('module ', '').replace('(', '').trim();
                currentModule = {
                    name: moduleName,
                    ports: []
                };
                modulesInFile.push(currentModule);
            } else if (line.startsWith('input ') || line.startsWith('output ')) {
                const direction = line.startsWith('input ') ? 'input' : 'output';
                const portName = line.replace('input ', '').replace('output ', '').replace(';', '').trim();
                const [sizeStr, name] = portName.split(' ', 2);
                const size = parseInt(sizeStr.replace('[', '').replace(']', '').split(':')[0]) + 1;
                currentModule?.ports.push({
                    name,
                    direction,
                    size
                });
            }
        }
        this.modulesInFile = modulesInFile;
        const pathToFile = ModuleDebuggerWebviewContentProvider.currentFile.fsPath;
        const pathWithoutExtension = pathToFile.substring(0, pathToFile.length - 2);
        const dModulePath = pathWithoutExtension + '.dbgmodule';
        let debugFile = {};
        if (fs.existsSync(dModulePath)) {
            debugFile = JSON.parse(fs.readFileSync(dModulePath).toString())
        }

        this._view?.webview.postMessage({
            command: 'updatedCurrentModules',
            data: modulesInFile,
            debugFile: debugFile
        })
    }


    private async createAndRunTestForModule(inputs: Record<string, {name: string, size: number, value: Record<string, number>, isSubValue?: boolean}>, moduleName: string) {
        const module = this.modulesInFile.find(m => m.name === moduleName);
        if (!module) {
            return;
        }
        const newFile = [];
        newFile.push(`module ${moduleName}_test;`);
        module.ports.forEach(port => {
            if (port.direction === 'input') {
                if (port.size === 1) {
                    newFile.push(`reg ${port.name};`);
                } else {
                    newFile.push(`reg [${port.size - 1}:0] ${port.name};`);
                }
            } else {
                if (port.size === 1) {
                    newFile.push(`wire ${port.name};`);
                } else {
                    newFile.push(`wire [${port.size - 1}:0] ${port.name};`);
                }
            }
        });

        const outputs = module.ports.filter(p => p.direction === 'output')

        newFile.push(`${moduleName} ${moduleName}_inst(`);
        newFile.push(...(module.ports.map(port => `    .${port.name}(${port.name})`).join(',\n').split('\n')));
        newFile.push(`);`);

        newFile.push(`initial begin`);
        for (let i = 0; i <= 100; i+=1) {
            newFile.push(`    #1`);
            for (const [key, value] of Object.entries(inputs)) {
                if (value.isSubValue) {
                    continue;
                }
                newFile.push(`    ${key} = ${value.value[i] ?? 0};`);
                newFile.push(`    $display("${key} = %b", ${key});`)
            }
            newFile.push(`    #0`);
            for (const output of outputs) {
                newFile.push(`    $display("${output.name} = %b", ${output.name});`)
            }
            newFile.push(`    $display("");`);
            newFile.push(``);
        }
        newFile.push(`    $finish;`);
        newFile.push(`end`);
        newFile.push(`endmodule`);
        newFile.push(``);

        const testContent = newFile.join('\n');
        const testFile = fs.mkdtempSync(path.join(os.tmpdir(), 'oss-cad-suite-vscode-'));
        const fileName = `${moduleName}_test.v`;
        const filePath = path.join(testFile, fileName);
        fs.writeFileSync(filePath, testContent);
        const ossCadPath = await ModuleDebuggerWebviewContentProvider.ossCadSuitePath?.();
        if (!ossCadPath) {
            return;
        }
        const selectedProject = ModuleDebuggerWebviewContentProvider.selectedProject?.();
        const projectFile = await parseProjectFile(undefined, selectedProject?.path);
        if (!projectFile) {
            return;
        }
        const iverilogPath = path.join(ossCadPath, 'iverilog');
        const ossRootPath = path.resolve(ossCadPath, '..');
        const gowinCellsPath = path.join(ossRootPath, 'share/yosys/gowin/cells_sim.v');
        const gowinXtraCellsPath = path.join(ossRootPath, 'share/yosys/gowin/cells_xtra.v');

        const res = spawnSync(iverilogPath,  ['-o', `${moduleName}_test.vvp`, '-s', `${moduleName}_test`, `${moduleName}_test.v`, ...(projectFile.includedFilePaths), gowinCellsPath, ...(fs.existsSync(gowinXtraCellsPath) ? [gowinXtraCellsPath] : [])], {
            cwd: testFile,
            env: {
                PATH: [
                    path.join(ossRootPath, 'bin'),
                    path.join(ossRootPath, 'lib'),
                    path.join(ossRootPath, 'py3bin'),
                    process.env.PATH
                ].join(process.platform === 'win32' ? ';' : ':')
            }
        });
        if (res.status !== 0) {
            console.log('Iverilog failed', res.stderr.toString());
            this._view?.webview.postMessage({
                command: 'updatedCurrentModules',
                error: 'Simulation failed',
                extra: res.stderr.toString()
            });
            return;
        }
        const vvpFilePath = path.join(testFile, `${moduleName}_test.vvp`);
        const vvpPath = path.join(ossCadPath, 'vvp');
        const vvp = spawnSync(vvpPath, [`${moduleName}_test.vvp`], {
            cwd: testFile,
            env: {
                PATH: [
                    path.join(ossRootPath, 'bin'),
                    path.join(ossRootPath, 'lib'),
                    path.join(ossRootPath, 'py3bin'),
                    process.env.PATH
                ].join(process.platform === 'win32' ? ';' : ':')
            }
        });
        if (vvp.status !== 0) {
            console.log(vvp.stderr?.toString());
            return;
        }
        const caseGroups = vvp.stdout?.toString().replace(/\r/g, '').split('\n\n').filter((a) => a.includes(' = '));
        const cases = caseGroups?.map(c => c.split('\n').map(l => l.split(' = ')).filter((a) => a.toString().trim().length > 0 && a.length === 2).reduce((acc, [key, value]) => {
            if (!key || !value) {
                return acc;
            }
            acc[key.trim()] = value.trim();
            return acc;
        }, {} as {[key: string]: string}));
        fs.rmSync(testFile, {recursive: true, force: true});
        await this.saveResults(inputs, cases, moduleName);
        return cases;
    }

    async saveResults(inputs: Record<string, { name: string; size: number; value: Record<string, number>; isSubValue?: boolean | undefined; }>, cases: { [key: string]: string; }[], moduleName: string) {
        const currentFile = ModuleDebuggerWebviewContentProvider.currentFile;
        if (!currentFile) {
            return;
        }
        const pathWithoutExtension = currentFile.fsPath.split('.').slice(0, -1).join('.');
        const dModulePath = `${pathWithoutExtension}.dbgmodule`;
        let fileContent: Record<string, {inputs: typeof inputs, cases: typeof cases}> = {};
        if (fs.existsSync(dModulePath)) {
            fileContent = JSON.parse(fs.readFileSync(dModulePath).toString());
        }

        fileContent[moduleName] = {
            inputs,
            cases
        };
        fs.writeFileSync(dModulePath, JSON.stringify(fileContent, null, 4));
    }

    public static register(extensionUri: vscode.Uri, getOssCadSuitePath: (() => Promise<string | undefined>), getSelectedProject: () => {name: string, path: string} | undefined, getOverridePaths: () => Promise<Record<string, string>>) {
        this.getOverridePaths = getOverridePaths;
        this.ossCadSuitePath = getOssCadSuitePath;
        this.selectedProject = getSelectedProject;
        this._instance = new ModuleDebuggerWebviewContentProvider(extensionUri);
        return vscode.window.registerWebviewViewProvider(
            ModuleDebuggerWebviewContentProvider.viewType,
            this._instance
        )
    }
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage((e) => this.onMessage(e));
        webviewView.onDidChangeVisibility((e) => {
            if (webviewView.visible) {
                this.updateCurrentFile(false);
            }
        });
        this._view.show?.(true);
        this.updateCurrentFile(true);
    }
    
    private async onMessage(message: any) {
        const { command, data } = message;
        switch (command) {
            case 'run-module':
                const {inputs, moduleName} = data;
                const cases = await this.createAndRunTestForModule(inputs, moduleName);
                this._view?.webview.postMessage({
                    command: 'module-result',
                    data: {
                        cases
                    }
                });
                break;
            case 'get-file':
                this.updateCurrentFile(false);
        }
    }

    private getHtmlForWebview(webview: vscode.Webview) {
        const toolkitUri = webview.asWebviewUri(Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js'));
        const mainUri = webview.asWebviewUri(Uri.joinPath(this._extensionUri, 'webview-js', 'module-debugger.js'));
        const codiconsUri = webview.asWebviewUri(Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));
    
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Module Debugger</title>
            <script type="module" src="${toolkitUri}"></script>
            <script type="module" src="${mainUri}"></script>
            <link rel="stylesheet" href="${codiconsUri}">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                h3 > vscode-dropdown {
                    margin-left: 10px;
                }
                h3 {
                    align-items: center;
                    display: flex;
                }
                .port-column {
                    display: flex;
                    gap: 0px;
                    flex-direction: column;
                }
                .port-container {
                    display: flex;
                    flex-direction: row;
                    margin-right: 50px;
                    width: 100%;
                    overflow: hidden;
                    user-select: none;
                }
                .port-line {
                    height: 20px;
                    position: absolute;
                    width: 30px;
                    box-sizing: border-box;
                    top: 5px;
                }
                .port-line-transition {
                    border-right: 1px solid #0291ff;
                }
                .port-line-active {
                    border-top: 1px solid #0291ff;
                }
                .port-line-inactive {
                    border-bottom: 1px solid #0291ff;
                }
                .port-agg-handle {
                    position: absolute;
                    top: 0px;
                    width: 10px;
                    cursor: col-resize;
                    bottom: 0px;
                }
                .port-agg-handle-right {
                    right: 0px;
                }
                .port-agg-handle-left {
                    left: 0px;
                }
                .port-agg-cell {
                    background: #0291ff;
                    color: white;
                    position: absolute;
                    left: 1px;
                    height: 20px;
                    top: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    z-index: 10;
                    border-radius: 2px;
                    transition: background 0.2s ease-out;
                    cursor: pointer;
                }
                .port-agg-cell:hover {
                    background: #48b0ff;
                }
                .port-input-container {
                    display: flex;
                    flex: 1;
                    overflow: scroll;
                }
                .port-cell {
                    position: relative;
                    height: 30px;
                    width: 30px;
                    font-size: 12px;
                    user-select: none;
                    box-sizing: border-box;
                    border-right: 1px solid rgba(255, 255, 255, 0.0);
                    border-left: 1px solid rgba(255, 255, 255, 0.0);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                #inputs {
                    width: 100%;
                    overflow: hidden;
                    flex: 1;
                    overflow-y: scroll;
                }
                .port-input-container .port-column:hover .port-cell {
                    border-left-color: rgba(255, 255, 255, 0.1);
                    border-right-color: rgba(255, 255, 255, 0.1);
                }
                #inputs.port-agg-cell-hover .port-input-container .port-column:hover .port-cell {
                    border-left-color: rgba(255, 255, 255, 0.0);
                    border-right-color: rgba(255, 255, 255, 0.0);
                }
                .port-index {
                    border-top: 0px;
                }
                .port-agg-cell input {
                    display: inline-block;
                    width: 100%;
                    font-size: 11px;
                    text-align: center;
                }
                .port-cell:last-child {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .port-input {
                    transition: background 0.2s ease-out;
                    cursor: pointer;
                }
                .port-input:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .port-input.port-summary:hover {
                    background: rgba(255, 255, 255, 0.0);
                    // cursor: default;
                }
                .port-container > .port-main-title .port-cell.port-header {
                    width: unset;
                    padding: 0px 10px;
                    overflow: ellipsis;
                }
                .port-container .port-main-action {
                    width: unset;
                }
                .port-container .port-main-action .port-cell {
                    width: unset;
                }
                .port-name {
                    display: flex;
                    align-items: center;
                }
                .port-title.port-header.port-index.port-name.port-main-title-top {
                    align-items: center;
                    font-size: 11px;
                    height: 30px;
                }
                .port-title.port-header.port-index.port-name.port-main-title-top2 {
                    align-items: center;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    font-size: 11px;
                    height: 30px;
                    
                }
                .port-cell.port-index {
                    height: 30px;
                    font-size: 10px;
                    overflow: hidden;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .port-icon.codicon {
                    font-size: 14px !important;
                    padding: 4px;
                    box-sizing: border-box;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .port-icon.codicon:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .port-icon.codicon:active {
                    background: rgba(255, 255, 255, 0.2);
                }
                .port-action {
                    display: flex;
                    align-items: center;
                    justify-content: start;
                }
                #module-select {
                    z-index: 100;
                }
                #clear-button {
                    margin-left: 10px;
                }
                .hide {
                    display: none;
                }
                #status {
                    margin: 10px;
                    background: #af3535;
                    padding: 5px 10px;
                    font-size: 10px;
                    border-radius: 3px;
                }
                #status span {
                    font-weight: bold;
                    font-size: 12px;
                }
                #container {
                    position: absolute;
                    top: 0;
                    right: 0;
                    left: 0;
                    padding: 0px 20px;
                    box-sizing: border-box;
                    bottom: 0;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
            </style>
        </head>
        <body>
            <div id="container">
                <h3>
                Module Debugger 
                <vscode-dropdown id="module-select" position="below"></vscode-dropdown>
                <vscode-button id="clear-button" title="Clear" icon="clear-all">Clear All</vscode-button>
                </h3>
                <div id="status" class="hide"></div>
                <div id="inputs"></div>
            </div>
        </body>
        </html>`;
    }
}