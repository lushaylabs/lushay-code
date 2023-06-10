import * as vscode from 'vscode';

export class ModuleDebuggerWebviewContentProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'lushay-code-module-debugger-content';
    private _view?: vscode.WebviewView;
    public static ossCadSuitePath?: () => Promise<string | undefined>;
    public static selectedProject?: () => {name: string, path: string} | undefined;

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) {
    }
    public static register(extensionUri: vscode.Uri, getOssCadSuitePath: (() => Promise<string | undefined>), getSelectedProject: () => {name: string, path: string} | undefined) {
        this.ossCadSuitePath = getOssCadSuitePath;
        this.selectedProject = getSelectedProject;
        return vscode.window.registerWebviewViewProvider(
            ModuleDebuggerWebviewContentProvider.viewType,
            new ModuleDebuggerWebviewContentProvider(extensionUri)
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
        this._view.show?.(true);
    }
    private getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Module Debugger</title>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src vscode-resource:; style-src vscode-resource: 'unsafe-inline'">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <h1>Module Debugger</h1>
            <p>Debug your module here</p>
        </body>
        </html>`;
    }
}