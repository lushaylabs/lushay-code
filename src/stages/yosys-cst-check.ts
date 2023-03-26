import { ToolchainStage } from "./stage";
import * as fs from 'fs';
import * as path from 'path';
import { boardToToolchain, ToolchainProject } from "../utils/device-info";

export class YosysCSTCheckStage extends ToolchainStage {
    private ports: string[] = [];

    private parseGowinConstraintFile(constraintsFile: string): string[] {
        const constraintNamesMap: Record<string, boolean> = {}
        const rows = constraintsFile.split('\n');
        const ioLocRegex = /IO_LOC\s+"([^"]+)"\s+(\d+\s*,?\s*(\d+)?)\s*;/;
        const ioPortRegex = /IO_PORT\s+"([^"]+)"\s+([^;]+)\s*;/;
        rows.forEach((row) => {
            let match = row.match(ioLocRegex);
            if (match) {
                constraintNamesMap[match[1]] = true;
                return;
            }
            match = row.match(ioPortRegex);
            if (match) {
                constraintNamesMap[match[1]] = true;
            }
        });
        return Object.keys(constraintNamesMap);
    }

    private parseIceConstraintFile(constraintsFile: string): string[] {
        const constraintNamesMap: Record<string, boolean> = {}
        const rows = constraintsFile.split('\n');
        const ioRegex = /set_io\s+(-nowarn\s+)?(-pullup\s+(yes|no)\s+)?(-pullup_resistor\s+(3P3K|6P8K|10K|100K)\s+)?([^;]+)\s*;/;
        rows.forEach((row) => {
            const match = row.match(ioRegex);
            if (match) {
                constraintNamesMap[match[6]] = true;
            }
        });
        return Object.keys(constraintNamesMap);
    }

    private parseEcp5ConstraintFile(constraintsFile: string): string[] {
        const constraintNamesMap: Record<string, boolean> = {}
        const rows = constraintsFile.split('\n');
        const locateRegex = /LOCATE\s+(COMP\s+)?"([^"]+)"\s+SITE\s+"([^"]+)"\s*;/;
        const ioBufRegex = /IOBUF\s+(PORT\s+)?"([^"]+)"[^;]+;/;
        rows.forEach((row) => {
            let match = row.match(locateRegex);
            if (match) {
                constraintNamesMap[match[2]] = true;
                return;
            }
            match = row.match(ioBufRegex);
            if (match) {
                constraintNamesMap[match[2]] = true;
            }
        });

        return Object.keys(constraintNamesMap);
    }

    private parseConstraintsFile(toolchain: ToolchainProject, constraintsFile: string): string[] {
        if (toolchain === ToolchainProject.APICULA) {
            return this.parseGowinConstraintFile(constraintsFile);
        } else if (toolchain === ToolchainProject.ICESTORM) {
            return this.parseIceConstraintFile(constraintsFile);
        } else if (toolchain === ToolchainProject.TRELIS) {
            return this.parseEcp5ConstraintFile(constraintsFile);
        }
        throw new Error(`Unknown toolchain ${toolchain}`);
    }

    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        ToolchainStage.logger.logToBoth('Starting Yosys CST Checking');

        const yosysPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'yosys');

        const checkCommand = [
			yosysPath,
			'-p',
			`read_verilog ${this.projectFile.includedFilePaths.join(' ')}; portlist ${this.projectFile.top || 'top'}`
		];
        console.log(this.projectFile.board);
        const toolchain = boardToToolchain(this.projectFile.board);

        let code = await this.runCommand(checkCommand);
        if (code === 0) {
            ToolchainStage.logger.logToBoth('    Checking if all ports are defined in constraints file');
            const constraintsFile = fs.readFileSync(this.projectFile.constraintsFile).toString();
            const constraintNames = this.parseConstraintsFile(toolchain, constraintsFile);
            const portsMissingDefinition = this.ports.filter((topPort) => !constraintNames.includes(topPort));
            if (portsMissingDefinition.length === 0) {
                ToolchainStage.logger.logToBoth('    All Ports are defined');
            } else {
                ToolchainStage.logger.logToBoth(`    Error: Port${portsMissingDefinition.length > 1 ? 's' : ''} are missing from CST file: ${portsMissingDefinition.join(', ')}`)
                return 1;
            }
        }

        ToolchainStage.logger.logToBoth('Finished CST Checking');
        return code;

    }

    protected onCommandStart(): void {
    }
    protected onCommandPrintLine(line: string): void {
        if (['|', '/', '\\'].includes(line.trim()[0])) {
			// copyright area
            ToolchainStage.logger.logToSummary('    ' + line);
			return;
		}
        const parseMatch = line.match(/Parsing Verilog input from `([^']+)' to AST/);
        if (parseMatch) {
            ToolchainStage.logger.logToSummary(`    Parsing ${path.basename(parseMatch[1])}`);
            return;
        }
        const moduleMatch = line.match(/RTLIL representation for module `\\([^']+)'/);
        if (moduleMatch) {
            ToolchainStage.logger.logToSummary(`        - Module ${moduleMatch[1]} parsed`);
            return;
        }
        const portMatch = line.match(/(input|output|inout) \[([0-9]+):([0-9]+)\] ([^\n]+)/);
        if (portMatch) {
            const portSize = Math.abs((+portMatch[2]) - (+portMatch[3])) + 1;
            if (portSize === 1) {
                this.ports.push(portMatch[4]);
            } else {
                for (let i = 0; i < portSize; i += 1) {
                    this.ports.push(`${portMatch[4]}[${i}]`);
                }
            }
        }
    }
    protected onCommandPrintErrorLine(line: string): void {
        ToolchainStage.logger.logToSummary('    Error: ' + line.trimEnd());
        if (line.includes('ERROR: syntax error, unexpected')) {
            const errorLocation = line.match(/([^/\\]+\.v):([0-9]+):/);
            if (errorLocation && +errorLocation[2] > 1) {
                ToolchainStage.logger.logToSummary(`    Check lines ${+errorLocation[2]-1}-${errorLocation[2]} of file ${errorLocation[1]} you may be missing a semicolon or left a block open`)
            }
        }
        if (line.includes('ERROR: Module') && line.includes("is not part of the design")) {
            //Error: ERROR: Module `\mds' referenced in module `\led_blink' in cell `\m' is not part of the design.
            const moduleMatches = line.match(/ERROR: Module `\\([^']+)' referenced in module `\\([^']+)' in cell `\\([^']+)'/);
            if (moduleMatches) {
                ToolchainStage.logger.logToSummary(`    Check if module instantiation \`${moduleMatches[1]} ${moduleMatches[3]}(...)\` in module ${moduleMatches[2]} is a typo or maybe the module is not included in your projectfile`)
            }
        }
    }
    protected onCommandEnd(): void {
    }   
}