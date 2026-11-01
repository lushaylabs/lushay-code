import { ToolchainStage } from "./stage";
import * as path from 'path';

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