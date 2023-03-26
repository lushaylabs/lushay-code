import { ToolchainStage } from "./stage";
import * as path from 'path';

export class IcePackStage extends ToolchainStage {
    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const icePackPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'icepack');
		const inputPath = previousStage?.getFilesCreated()[0];
        if (!inputPath) {
            ToolchainStage.logger.logToBoth('    Error: no routed netlist file');
            return null;
        }
		const outputPath = path.join(this.projectFile.basePath, this.projectFile.name + '.bin');

        const bitstreamCommand = [
        	icePackPath,
        	inputPath,
        	outputPath
        ];

        this.filesCreated.push(outputPath);
        return this.runCommand(bitstreamCommand);
    }
    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth('Starting Bitstream Generation with IceStorm');
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