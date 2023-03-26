import { ToolchainStage } from "./stage";
import * as path from 'path';
import { gowinDeviceInfo } from "../utils/device-info";

export class GowinPackStage extends ToolchainStage {
    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const gowinPackPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'gowin_pack');
		const inputPath = previousStage?.getFilesCreated()[0];
        if (!inputPath) {
            ToolchainStage.logger.logToBoth('    Error: no routed netlist file');
            return null;
        }
		const outputPath = path.join(this.projectFile.basePath, this.projectFile.name + '.fs');

        const {family} = gowinDeviceInfo(this.projectFile.board);
        const bitstreamCommand = [
        	gowinPackPath,
        	'-d',
        	family,
        	'-o',
        	outputPath,
        	inputPath
        ];

        this.filesCreated.push(outputPath);
        return this.runCommand(bitstreamCommand);
    }
    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth('Starting Bitstream Generation with Apicula');
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