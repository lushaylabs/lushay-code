import { exec, spawnSync } from "child_process";
import path = require("path");
import { workspace, Disposable as VSCodeDisposable, window as vsCodeWindow, commands, ExtensionContext, EventEmitter, CancellationToken, CustomDocumentBackup, Uri, ViewColumn, WebviewPanel, window, CustomDocument, CustomEditorProvider, CustomDocumentBackupContext, CustomDocumentContentChangeEvent, CustomDocumentEditEvent, CustomDocumentOpenContext, Event, Webview } from "vscode";
import { parseProjectFile } from "../projecfile";

export function disposeAll(disposables: VSCodeDisposable[]): void {
	while (disposables.length) {
		const item = disposables.pop();
		if (item) {
			item.dispose();
		}
	}
}

export abstract class Disposable {
	private _isDisposed = false;

	protected _disposables: VSCodeDisposable[] = [];

	public dispose(): any {
		if (this._isDisposed) {
			return;
		}
		this._isDisposed = true;
		disposeAll(this._disposables);
	}

	protected _register<T extends VSCodeDisposable>(value: T): T {
		if (this._isDisposed) {
			value.dispose();
		} else {
			this._disposables.push(value);
		}
		return value;
	}

	protected get isDisposed(): boolean {
		return this._isDisposed;
	}
}

interface ConstraintsRowEdit {
    editType: 'change';
    rowIndex: number;
    field: string;
    newValue: string;
}

interface ConstraintsRowDeletion {
    editType: 'deletion';
    rowIndex: number;
    rowValue: any;
}

interface ConstraintsRowAddition {
    editType: 'addition';
    rowIndex: number;
    rowValue: any;
}

interface ConstraintsTemplateAddition {
    editType: 'template';
    rowIndex: number;
    rowValues: any[];
}

type ConstraintsFileEdit = ConstraintsRowEdit | ConstraintsRowDeletion | ConstraintsRowAddition | ConstraintsTemplateAddition;

interface ConstraintsFileDelegate {
	getFileData(): Promise<Uint8Array>;
}
class ConstraintsFileDocument extends Disposable implements CustomDocument {
    static async create(
		uri: Uri,
		backupId: string | undefined,
        delegate: ConstraintsFileDelegate
	): Promise<ConstraintsFileDocument | PromiseLike<ConstraintsFileDocument>> {
		// If we have a backup, read that. Otherwise read the resource from the workspace
		const dataFile = typeof backupId === 'string' ? Uri.parse(backupId) : uri;
		const fileData = await ConstraintsFileDocument.readFile(dataFile);
		return new ConstraintsFileDocument(uri, fileData, delegate);
	}
    private static async readFile(uri: Uri): Promise<Uint8Array> {
		if (uri.scheme === 'untitled') {
			return new Uint8Array();
		}
		return new Uint8Array(await workspace.fs.readFile(uri));
	}

    private readonly _uri: Uri;
	private _documentData: Uint8Array;
	private _edits: Array<ConstraintsFileEdit> = [];
	private _savedEdits: Array<ConstraintsFileEdit> = [];
	private readonly _delegate: ConstraintsFileDelegate;

    private constructor(
		uri: Uri,
		initialContent: Uint8Array,
		delegate: ConstraintsFileDelegate
	) {
		super();
		this._uri = uri;
		this._documentData = initialContent;
		this._delegate = delegate;
	}
    public get uri() { return this._uri; }

	public get documentData(): Uint8Array { return this._documentData; }

	private readonly _onDidDispose = this._register(new EventEmitter<void>());
    /**
	 * Fired when the document is disposed of.
	 */
	public readonly onDidDispose = this._onDidDispose.event;

	private readonly _onDidChangeDocument = this._register(new EventEmitter<{
		readonly content?: Uint8Array;
		readonly edits: readonly ConstraintsFileEdit[];
	}>());
	/**
	 * Fired to notify webviews that the document has changed.
	 */
	public readonly onDidChangeContent = this._onDidChangeDocument.event;

	private readonly _onDidChange = this._register(new EventEmitter<{
		readonly label: string,
		undo(): void,
		redo(): void,
	}>());
	/**
	 * Fired to tell VS Code that an edit has occurred in the document.
	 *
	 * This updates the document's dirty indicator.
	 */
	public readonly onDidChange = this._onDidChange.event;

	/**
	 * Called by VS Code when there are no more references to the document.
	 *
	 * This happens when all editors for it have been closed.
	 */
	dispose(): void {
		this._onDidDispose.fire();
		super.dispose();
	}

	/**
	 * Called when the user edits the document in a webview.
	 *
	 * This fires an event to notify VS Code that the document has been edited.
	 */
	makeEdit(edit: ConstraintsFileEdit) {
		this._edits.push(edit);

		this._onDidChange.fire({
			label: 'Update',
			undo: async () => {
				this._edits.pop();
				this._onDidChangeDocument.fire({
                    content: this.documentData,
					edits: this._edits,
				});
			},
			redo: async () => {
				this._edits.push(edit);
				this._onDidChangeDocument.fire({
                    content: this.documentData,
					edits: this._edits,
				});
			}
		});
	}

    /**
	 * Called by VS Code when the user saves the document.
	 */
	async save(cancellation: CancellationToken): Promise<void> {
		await this.saveAs(this.uri, cancellation);
		this._savedEdits = Array.from(this._edits);
	}

	/**
	 * Called by VS Code when the user saves the document to a new location.
	 */
	async saveAs(targetResource: Uri, cancellation: CancellationToken): Promise<void> {
		const fileData = await this._delegate.getFileData();
		if (cancellation.isCancellationRequested) {
			return;
		}
		await workspace.fs.writeFile(targetResource, fileData);
	}

	/**
	 * Called by VS Code when the user calls `revert` on a document.
	 */
	async revert(_cancellation: CancellationToken): Promise<void> {
		const diskContent = await ConstraintsFileDocument.readFile(this.uri);
		this._documentData = diskContent;
		this._edits = this._savedEdits;
		this._onDidChangeDocument.fire({
			content: diskContent,
			edits: this._edits,
		});
	}

	/**
	 * Called by VS Code to backup the edited document.
	 *
	 * These backups are used to implement hot exit.
	 */
	async backup(destination: Uri, cancellation: CancellationToken): Promise<CustomDocumentBackup> {
		await this.saveAs(destination, cancellation);

		return {
			id: destination.toString(),
			delete: async () => {
				try {
					await workspace.fs.delete(destination);
				} catch {
					// noop
				}
			}
		};
	}
}

export class ConstraintsEditor implements CustomEditorProvider<ConstraintsFileDocument> {
    public static currentPanel: ConstraintsEditor | undefined;
    private _disposables: Disposable[] = [];

    private static newConstraintsFileId: number = 1;
    private static getOssCadSuitePath: undefined | (() => Promise<string | undefined>);
    private static getSelectedProject: undefined | (() => {name: string, path: string} | undefined);

	public static register(context: ExtensionContext, getOssCadSuitePath: (() => Promise<string | undefined>), getSelectedProject: () => {name: string, path: string} | undefined): VSCodeDisposable {
        ConstraintsEditor.getSelectedProject = getSelectedProject;
        ConstraintsEditor.getOssCadSuitePath = getOssCadSuitePath;
		commands.registerCommand('lushay-code.constraintsEditor.new', () => {
			const workspaceFolders = workspace.workspaceFolders;
			if (!workspaceFolders) {
				vsCodeWindow.showErrorMessage("Creating new Paw Draw files currently requires opening a workspace");
				return;
			}

			const uri = Uri.joinPath(workspaceFolders[0].uri, `new-${ConstraintsEditor.newConstraintsFileId++}.pawdraw`)
				.with({ scheme: 'untitled' });

			commands.executeCommand('vscode.openWith', uri, ConstraintsEditor.viewType);
		});

		return window.registerCustomEditorProvider(
			ConstraintsEditor.viewType,
			new ConstraintsEditor(context),
			{
				// For this demo extension, we enable `retainContextWhenHidden` which keeps the
				// webview alive even when it is not visible. You should avoid using this setting
				// unless is absolutely required as it does have memory overhead.
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			});
	}

	private static readonly viewType = 'lushay-code.constraintsEditor';

	/**
	 * Tracks all known webviews
	 */
	private readonly webviews = new WebviewCollection();

    // private constructor(private panel: WebviewPanel, extensionUri: Uri) {
    //     this.panel.onDidDispose(this.dispose, null, this._disposables);
    //     this.panel.webview.html = this.getHTML(extensionUri);
    //     panel.webview.onDidReceiveMessage((message: any) => {

    //     }, undefined, this._disposables);
    // }
    constructor(
		private readonly _context: ExtensionContext
	) { }

    private readonly _onDidChangeCustomDocument = new EventEmitter<CustomDocumentEditEvent<ConstraintsFileDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    saveCustomDocument(document: ConstraintsFileDocument, cancellation: CancellationToken): Thenable<void> {
        return document.save(cancellation);
    }
    saveCustomDocumentAs(document: ConstraintsFileDocument, destination: Uri, cancellation: CancellationToken): Thenable<void> {
        return document.saveAs(destination, cancellation);
    }
    revertCustomDocument(document: ConstraintsFileDocument, cancellation: CancellationToken): Thenable<void> {
        return document.revert(cancellation);
    }
    backupCustomDocument(document: ConstraintsFileDocument, context: CustomDocumentBackupContext, cancellation: CancellationToken): Thenable<CustomDocumentBackup> {
        return document.backup(context.destination, cancellation);
    }
    async openCustomDocument(uri: Uri, openContext: CustomDocumentOpenContext, token: CancellationToken): Promise<ConstraintsFileDocument> {
        const document: ConstraintsFileDocument = await ConstraintsFileDocument.create(uri, openContext.backupId, {
			getFileData: async () => {
				const webviewsForDocument = Array.from(this.webviews.get(document.uri));
				if (!webviewsForDocument.length) {
					throw new Error('Could not find webview to save for');
				}
				const panel = webviewsForDocument[0];
				const response = await this.postMessageWithResponse<number[]>(panel, 'getFileData', {});
				return new Uint8Array(response);
			}
		});

		const listeners: VSCodeDisposable[] = [];

		listeners.push(document.onDidChange(e => {
			// Tell VS Code that the document has been edited by the use.
			this._onDidChangeCustomDocument.fire({
				document,
				...e,
			});
		}));

		listeners.push(document.onDidChangeContent(e => {
			// Update all webviews when the document changes
			for (const webviewPanel of this.webviews.get(document.uri)) {
				this.postMessage(webviewPanel, 'update', {
					edits: e.edits,
					content: e.content,
				});
			}
		}));

		document.onDidDispose(() => disposeAll(listeners));

		return document;
    }
    async resolveCustomEditor(
		document: ConstraintsFileDocument,
		webviewPanel: WebviewPanel,
		_token: CancellationToken
	): Promise<void> {
		// Add the webview to our internal set of active webviews
		this.webviews.add(document.uri, webviewPanel);

		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = this.getHTML(webviewPanel.webview);

		webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

		// Wait for the webview to be properly ready before we init
		webviewPanel.webview.onDidReceiveMessage(e => {
			if (e.type === 'ready') {
				if (document.uri.scheme === 'untitled') {
					this.postMessage(webviewPanel, 'init', {
						untitled: true,
						editable: true,
					});
				} else {
					const editable = workspace.fs.isWritableFileSystem(document.uri.scheme);

					this.postMessage(webviewPanel, 'init', {
						value: document.documentData,
						editable,
					});
				}
			} else if (e.type === 'getPorts') {
                this.getPorts(webviewPanel);
            }
		});
	}

    private _requestId = 1;
	private readonly _callbacks = new Map<number, (response: any) => void>();

	private postMessageWithResponse<R = unknown>(panel: WebviewPanel, type: string, body: any): Promise<R> {
		const requestId = this._requestId++;
		const p = new Promise<R>(resolve => this._callbacks.set(requestId, resolve));
		panel.webview.postMessage({ type, requestId, body });
		return p;
	}

	private postMessage(panel: WebviewPanel, type: string, body: any): void {
		panel.webview.postMessage({ type, body });
	}

	private onMessage(document: ConstraintsFileDocument, message: any) {
		switch (message.type) {
			case 'edit':
				document.makeEdit(message as ConstraintsFileEdit);
				return;
			case 'response':
				{
					const callback = this._callbacks.get(message.requestId);
					callback?.(message.body);
					return;
				}
		}
	}

    private async getPorts(webview: WebviewPanel) {
        const ossCadPath = await ConstraintsEditor.getOssCadSuitePath?.();
        if (!ossCadPath) {
            return;
        }
        const selectedProject = ConstraintsEditor.getSelectedProject?.();
        const projectFile = await parseProjectFile(undefined, selectedProject?.path);
        if (!projectFile) {
            return;
        }

        const yosysPath = path.join(ossCadPath, 'yosys');
        const ossRootPath = path.resolve(ossCadPath, '..');
        const res = spawnSync(yosysPath,  ['-p', `read_verilog ${projectFile.includedFilePaths.join(' ')}; portlist ${projectFile.top || 'top'}`], {
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
        const ports: string[] = [];
        const lines = res.stdout.toString().split('\n');
        lines.forEach((line) => {
            const portMatch = line.match(/(input|output|inout) \[([0-9]+):([0-9]+)\] ([^\n]+)/);
            if (portMatch) {
                const portSize = Math.abs((+portMatch[2]) - (+portMatch[3])) + 1;
                if (portSize === 1) {
                    ports.push(portMatch[4].trim());
                } else {
                    for (let i = 0; i < portSize; i += 1) {
                        ports.push(`${portMatch[4].trim()}[${i}]`);
                    }
                }
            }
        })
        this.postMessage(webview, 'portResponse', {ports})
        
    }

    // public static render(extensionUri: Uri) {
    //     if (ConstraintsEditor.currentPanel) {
    //         ConstraintsEditor.currentPanel.panel.reveal(ViewColumn.One);
    //     } else {
    //         const panel = window.createWebviewPanel(
    //             'constraintsEditor',
    //             'Constraints Editor',
    //             ViewColumn.One,
    //             {
    //                 enableScripts: true
    //             }
    //         )
    //         ConstraintsEditor.currentPanel = new ConstraintsEditor(panel, extensionUri);;
    //     }
    // }
    
    // private dispose() {
    //     ConstraintsEditor.currentPanel = undefined;
    //     this.panel.dispose();
    //     while (this._disposables.length) {
    //         const disposable = this._disposables.pop();
    //         if (disposable) {
    //             disposable.dispose();
    //         }
    //     }
    // }

    private getHTML(webview: Webview): string {
        const toolkitUri = webview.asWebviewUri(Uri.joinPath(this._context.extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js'));
        const mainUri = webview.asWebviewUri(Uri.joinPath(this._context.extensionUri, 'webview-js', 'constraints-editor.js'));
        const codiconsUri = webview.asWebviewUri(Uri.joinPath(this._context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));
        const boardImageTangNano9K = webview.asWebviewUri(Uri.joinPath(this._context.extensionUri, 'webview-js', 'board-layout-tangnano9k.png'));
        const boardImageTangNano4K = webview.asWebviewUri(Uri.joinPath(this._context.extensionUri, 'webview-js', 'board-layout-tangnano4k.png'));
        const boardImageTangNano1K = webview.asWebviewUri(Uri.joinPath(this._context.extensionUri, 'webview-js', 'board-layout-tangnano1k.png'));
        const boardImageTangNano = webview.asWebviewUri(Uri.joinPath(this._context.extensionUri, 'webview-js', 'board-layout-tangnano.png'));

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script type="module" src="${toolkitUri}"></script>
                    <script type="module" src="${mainUri}"></script>
                    <link rel="stylesheet" href="${codiconsUri}">
                    <title>Test</title>
                    <style>
                        section {
                            margin: 10px 0px;
                        }
                        #table-split {
                            display: flex;
                            flex-grow: 1;
                            overflow: hidden;
                        }
                        #table-split > #table-side {
                            flex-grow: 1;
                            box-sizing: border-box;
                            padding-right: 10px;
                            display: flex;
                            flex-direction: column;
                        }
                        #table-split > #panel-side {
                            border-left: 1px solid rgba(255,255,255,0.2);
                            padding-left: 10px;
                            box-sizing: border-box;
                            width: 250px;
                        }
                        #panel-side > #edit-row {
                            height: 100%;
                            overflow: hidden;
                            display: flex;
                            flex-direction: column;
                        }
                        .hide {
                            display: none;
                        }
                        .highlight {
                            background: rgba(255, 255, 255, 0.1);
                        }
                        #edit-panel-title {
                            display: flex;
                            align-items: center;
                        }
                        #edit-panel-title span {
                            flex-grow: 1
                        }
                        #table-title-section {
                            display: flex;
                            align-items: center;
                            align-content: center;
                            gap: 4px;
                        }
                        #table-title-section > h2 {
                            flex-grow: 1;
                        }
                        #edit-window {
                            flex-grow: 1;
                            overflow: auto;
                        }
                        #edit-window > section > label {
                            display: block;
                            margin-bottom: 4px;
                        }
                        #table {
                            flex-grow: 1;
                            overflow: auto;
                        }
                        #template-options {
                            margin-bottom: 10px;
                        }
                        #template-options > p {
                            margin-bottom: 2px;
                            margin-top: 2px;
                        }
                        #popup {
                            position: absolute;
                            left: 50%;
                            width: 400px;
                            background: #2d2d2d;
                            top: 50%;
                            transform: translate(-50%, -50%);
                            padding: 25px 25px;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                        }
                        #popup-container {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0,0,0,0.2);
                        }
                        #board-popup {
                            position: absolute;
                            text-align: center;
                            left: 50%;
                            width: 650px;
                            background: #2d2d2d;
                            top: 50%;
                            transform: translate(-50%, -50%);
                            padding: 25px 25px;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                        }
                        #port-popup-container {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0,0,0,0.2);
                        }
                        #port-popup {
                            position: absolute;
                            left: 50%;
                            width: 400px;
                            background: #2d2d2d;
                            top: 50%;
                            transform: translate(-50%, -50%);
                            padding: 25px 25px;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                        }
                        #board-popup-container {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0,0,0,0.2);
                        }
                        #editor-container {
                            max-height: 100%;
                            overflow: hidden;
                            height: 100%;
                            position: absolute;
                            top: 0;
                            left: 20px;
                            right: 20px;
                            bottom: 0;
                            display: flex;
                            flex-direction: column;
                        }
                        #editor-container h1 {
                            margin-top: 4px;
                            margin-bottom: 4px;
                        }
                        #board-container {
                            text-align: center;
                            width: 600px;
                            position: relative;
                            margin: auto;
                        }
                        #board-container img {
                            width: 600px;
                        }
                        .pin-btn {
                            position: absolute;
                        }
                        .pin-btn:hover {
                            color: #17a665 !important;
                            background: #FFF !important;
                        }
                        .pin-btn.selected {
                            color: #17a665;
                            background: #FFF;
                        }
                        .pin-btn.used {
                            color: #000;
                            background: rgba(255,255,255,0.8);
                        }
                        .pin-btn.used.selected {
                            color: red;
                            background: #FFF;
                        }
                        vscode-data-grid-cell:focus, vscode-data-grid-cell:active {
                            background: unset;
                            border: unset;
                            color: unset;
                        }
                        #port-outer-container {
                            margin-bottom: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div id="editor-container">
                        <h1>Constraints Editor 
                        <vscode-dropdown id="board-select" position="below">
                            <vscode-option>Tang Nano 9K</vscode-option>
                            <vscode-option>Tang Nano 4K</vscode-option>
                            <vscode-option>Tang Nano 1K</vscode-option>
                            <vscode-option>Tang Nano</vscode-option>
                        </vscode-dropdown>
                        </h1>
                        <div id="table-split">
                            <div id="table-side">
                                <section id="table-title-section">
                                    <h2>Constraints</h2>
                                    <vscode-button id="show-templates" appearance="primary" aria-label="Add Constraint Templates">
                                        Add From Template <span slot="start" class="codicon codicon-plus"></span>
                                    </vscode-button>
                                    <vscode-button id="add-constraint" appearance="primary" aria-label="Add Constraint">
                                        Add Constraint <span slot="start" class="codicon codicon-plus"></span>
                                    </vscode-button>
                                </section>
                                <section id="table">
                                    <p class="hide" id="no-constraints-msg">No Constraints in this file</p>
                                    <vscode-data-grid generate-header="sticky" id="constraints-table" aria-label="Basic"></vscode-data-grid>
                                </section>
                            </div>
                            <div id="panel-side">
                                <section id="edit-row">
                                    <h3 id="edit-panel-title">
                                        <span>Edit Constraint</span>
                                        <vscode-button id="remove-constraint" appearance="icon" aria-label="Remove Constraint">
                                            <span class="codicon codicon-trash"></span>
                                        </vscode-button>
                                    </h3>
                                    <p id="no-constraint">Select Constraint to Edit</p>
                                    <section class="hide" id="edit-window">
                                        <section>
                                            <label>Port Name</label>
                                            <vscode-text-field id="edit-port-name"></vscode-text-field>
                                            <vscode-link id="select-port" href="#">Select From Top Module</vscode-link>
                                        </section>
                                        <section>
                                            <label>Location</label>
                                            <vscode-text-field id="edit-port-location"></vscode-text-field>
                                            <vscode-link id="select-pin" href="#">Select IO Pin</vscode-link>
                                        </section>
                                        <section>
                                            <label>Pull Mode:</label>
                                            <vscode-dropdown id="pull-select" position="below">
                                                <vscode-option>None</vscode-option>
                                                <vscode-option>Pull Up</vscode-option>
                                                <vscode-option>Pull Down</vscode-option>
                                            </vscode-dropdown>
                                        </section>
                                        <section>
                                            <label>Drive Power:</label>
                                            <vscode-dropdown id="drive-select" position="below">
                                                <vscode-option>Unset</vscode-option>
                                                <vscode-option>4ma</vscode-option>
                                                <vscode-option>8ma</vscode-option>
                                                <vscode-option>12ma</vscode-option>
                                                <vscode-option>16ma</vscode-option>
                                                <vscode-option>24ma</vscode-option>
                                            </vscode-dropdown>
                                        </section>
                                        <section>
                                            <label>IO Standard:</label>
                                            <vscode-dropdown id="standard-select" position="below">
                                                <vscode-option>Unset</vscode-option>
                                                <vscode-option>LVCMOS33</vscode-option>
                                                <vscode-option>LVCMOS25</vscode-option>
                                                <vscode-option>LVCMOS18</vscode-option>
                                                <vscode-option>LVCMOS15</vscode-option>
                                                <vscode-option>LVCMOS12</vscode-option>
                                                <vscode-option>SSTL25_I</vscode-option>
                                                <vscode-option>SSTL25_II</vscode-option>
                                                <vscode-option>SSTL33_I</vscode-option>
                                                <vscode-option>SSTL33_II</vscode-option>
                                                <vscode-option>SSTL18_I</vscode-option>
                                                <vscode-option>SSTL18_II</vscode-option>
                                                <vscode-option>SSTL15</vscode-option>
                                                <vscode-option>HSTL18_I</vscode-option>
                                                <vscode-option>HSTL18_II</vscode-option>
                                                <vscode-option>HSTL15_I</vscode-option>
                                                <vscode-option>PCI33</vscode-option>
                                            </vscode-dropdown>
                                        </section>
                                    </section>
                                </section>
                            </div>
                        </div>
                    </div>
                    <div class="hide" id="popup-container">
                        <div id="popup">
                            <h3>Select Constraint Templates</h3>
                            <div id="template-options">
                                
                            </div>
                            <vscode-button id="add-constraint-templates">Add Constraints</vscode-button>
                            <vscode-button appearance="secondary" id="cancel-templates">Cancel</vscode-button>
                        </div>
                    </div>
                    <div class="hide" id="board-popup-container">
                        <div id="board-popup">
                            <h3>Select Pin</h3>
                            <div id="board-container">
                                <img class="board-pic hide" id="tangnano9k-board" src="${boardImageTangNano9K}" />
                                <img class="board-pic hide" id="tangnano4k-board" src="${boardImageTangNano4K}" />
                                <img class="board-pic hide" id="tangnano1k-board" src="${boardImageTangNano1K}" />
                                <img class="board-pic hide" id="tangnano-board" src="${boardImageTangNano}" />
                                <div id="pin-container"></div>
                            </div>
                            <vscode-button appearance="secondary" id="cancel-board">Cancel</vscode-button>
                        </div>
                    </div>
                    <div class="hide" id="port-popup-container">
                        <div id="port-popup">
                            <h3>Select Port</h3>
                            <div id="port-outer-container">
                                <vscode-progress-ring id="port-loading" class="hide"></vscode-progress-ring>
                                <div class="hide" id="port-container"></div>
                                <div class="hide" id="no-ports">No Ports found, check your top module is defined and has no errors</div>
                            </div>
                            <vscode-button appearance="primary" id="save-port-selection">Select Port</vscode-button>
                            <vscode-button appearance="secondary" id="cancel-port">Cancel</vscode-button>
                        </div>
                    </div>
                </body>
            </html>`;
    }
}

/**
 * Tracks all webviews.
 */
class WebviewCollection {

	private readonly _webviews = new Set<{
		readonly resource: string;
		readonly webviewPanel: WebviewPanel;
	}>();

	/**
	 * Get all known webviews for a given uri.
	 */
	public *get(uri: Uri): Iterable<WebviewPanel> {
		const key = uri.toString();
		for (const entry of this._webviews) {
			if (entry.resource === key) {
				yield entry.webviewPanel;
			}
		}
	}

	/**
	 * Add a new webview to the collection.
	 */
	public add(uri: Uri, webviewPanel: WebviewPanel) {
		const entry = { resource: uri.toString(), webviewPanel };
		this._webviews.add(entry);

		webviewPanel.onDidDispose(() => {
			this._webviews.delete(entry);
		});
	}
}