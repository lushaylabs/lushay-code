import * as path from 'path';
import { boardToToolchain, ToolchainProject } from "../utils/device-info";
import { ToolchainStage } from "./stage";

export class OpenFPGALoaderProgramStage extends ToolchainStage {
    private detectedUsbNotFound: boolean = false;
    private detectedError: boolean = false;

    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        const openFpgaLoaderPath = ToolchainStage.overrides['openFPGALoader'] || path.join(ToolchainStage.ossCadSuiteBinPath, 'openFPGALoader');
        const toolchain = boardToToolchain(this.projectFile.board);
        const extension = toolchain === ToolchainProject.APICULA ? '.fs' : toolchain === ToolchainProject.ICESTORM ? '.bin' : '.bit';
        const inputPath = path.join(this.projectFile.basePath, this.projectFile.name + extension);

        const programCommand = [
            openFpgaLoaderPath,
            '-b',
            this.projectFile.board,
            inputPath,
            '-v',
            ...(this.projectFile.programMode === 'flash' ? ['-f'] : [])
        ];

        return this.runCommand(programCommand);
    }

    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth('Starting FPGA Programming with OpenFPGALoader');
    }
    protected onCommandPrintLine(line: string): void {
        if (line.includes('write Flash')) {
            ToolchainStage.logger.logToSummary('    Flash Written');
            return;
        }
        if (line.includes('pollFlag')) {
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
