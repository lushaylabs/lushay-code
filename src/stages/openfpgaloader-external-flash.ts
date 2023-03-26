import * as path from 'path';
import { ToolchainStage } from "./stage";

export class OpenFPGALoaderExternalFlashStage extends ToolchainStage {
    private detectedUsbNotFound: boolean = false;
	private detectedError: boolean = false;

    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const openFpgaLoaderPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'openFPGALoader');

        const programCommand = [
        	openFpgaLoaderPath,
        	'-b',
        	this.projectFile.board,
            '--external-flash',
        	this.projectFile.externalFlashFilePath
        ];

        return this.runCommand(programCommand);
    }

    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth('Starting FPGA Programming with OpenFPGALoader');
    }
    protected onCommandPrintLine(line: string): void {
        if (line.includes('Writing:')) {
            ToolchainStage.logger.logToSummary('    Flash Written');
            return;
        }
        if (line.includes('Erasing:')) {
            ToolchainStage.logger.logToSummary('    Flash Erased');
            return;
        }
        ToolchainStage.logger.logToSummary('    ' + line);
    }
    protected onCommandPrintErrorLine(line: string): void {
        if (line.includes('(device not found)')) {
            this.detectedUsbNotFound = true;
            this.detectedError = true;
        }
        if (!this.detectedError) {
            ToolchainStage.logger.logToSummary('    Error: ' + line);
        }
    }
    protected onCommandEnd(): void {
        if (this.detectedError) {
            ToolchainStage.logger.logToSummary("    There was an error programming the FPGA:")
            if (this.detectedUsbNotFound) {
                ToolchainStage.logger.logToSummary("        Device not found, verify the device is plugged in");
            }
        }
        ToolchainStage.logger.logToBoth('Finished FPGA Programming');
    }   
}