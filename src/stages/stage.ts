import * as path from 'path';
import { Logger, ProjectFile } from "../projecfile";
import { spawn } from 'child_process';

export abstract class ToolchainStage {
    protected static ossCadSuiteBinPath: string;
    protected static logger: Logger;
    public static apiKey: string;
    protected static overrides: Record<string, string> = {};

    public static initialize(
        ossCadSuitPath: string,
        logger: Logger,
        apiKey: string,
        overrides: Record<string, string>
    ) {
        this.ossCadSuiteBinPath = ossCadSuitPath;
        this.logger = logger;
        this.apiKey = apiKey;
        this.overrides = overrides;
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