import { ToolchainStage } from "./stage";
import * as path from 'path';

enum YosysEditions {
    GOWIN = 'Gowin',
    ICE40 = 'ICE40',
    ECP5 = 'ECP5'
}

function createYosysSynthStage(edition: YosysEditions) {
    class YosysSynthStage extends ToolchainStage {
        private startedCounter: boolean = false;
        private counter: string[] = [];

        private getOptions(): string {
            switch (edition) {
                case YosysEditions.GOWIN:
                    return this.projectFile.synthGowinOptions.join(' ');
                case YosysEditions.ICE40:
                    return this.projectFile.synthIce40Options.join(' ');
                case YosysEditions.ECP5:
                    return this.projectFile.synthEcp5Options.join(' ');
            }
        }

        private getSynthCommand(): string {
            switch (edition) {
                case YosysEditions.GOWIN:
                    return 'synth_gowin';
                case YosysEditions.ICE40:
                    return 'synth_ice40';
                case YosysEditions.ECP5:
                    return 'synth_ecp5';
            }
        }
    
        public async runProg(): Promise<number | null> {
            const yosysPath = ToolchainStage.overrides['yosys'] || path.join(ToolchainStage.ossCadSuiteBinPath, 'yosys');
            const outPath = path.join(this.projectFile.basePath, this.projectFile.name + '.json');
            const options = this.getOptions();
            const synthCommand = this.getSynthCommand();
            const synthesisCommand = [
                yosysPath,
                '-p',
                `read_verilog ${this.projectFile.includedFilePaths.join(' ')}; ${synthCommand} -top ${this.projectFile.top || 'top'} -json ${outPath} ${options}`
            ];
            this.filesCreated.push(outPath);
            return this.runCommand(synthesisCommand);
        }
    
        protected onCommandStart(): void {
            ToolchainStage.logger.logToBoth(`Starting Synthesys with Yosys (${edition})`);
        }
    
        protected onCommandEnd(): void {
            if (this.counter.length > 0) {
                ToolchainStage.logger.logToSummary("\n    Summary");
                const rows = this.counter.map((c) => {
                    const lineType = c.includes(':') ? 'topLevel' : 'subLevel';
                    if (lineType === 'topLevel') {
                        const parts = c.split(':').map((p) => p.trim());
                        return {
                            name: parts[0] + ':',
                            val: parts[1]
                        }
                    } else {
                        const parts = c.trim().split(' ');
                        return {
                            name: '    ' + parts[0],
                            val: parts[parts.length-1]
                        }
                    }
                });
                const longestName = rows.reduce((longest, row) => row.name.length > longest ? row.name.length : longest, 0);
                const longestVal = rows.reduce((longest, row) => row.val.length > longest ? row.val.length : longest, 0);
                rows.forEach((row) => {
                    ToolchainStage.logger.logToSummary('        ' + row.name.padEnd(longestName + 6, ' ') + row.val.padStart(longestVal, ' '));
                });
                ToolchainStage.logger.logToSummary('');
            }
            ToolchainStage.logger.logToBoth("Finished Synthesys");
        }
    
        protected onCommandPrintLine(line: string): void {
            if (['|', '/', '\\'].includes(line.trim()[0])) {
                // skipping copyright area here as printed in CST check stage
                return;
            }
            const titleRegexp = /^([0-9.]+)\. (.+)$/;
            const titleMatch = titleRegexp.exec(line);
            if (titleMatch) {
                this.startedCounter = false;
                const titleLength = titleMatch[1].split('.').length-1;
                if (titleLength > 1) {return}
                let spacing = ''.padEnd(titleLength * 4, ' ');
                ToolchainStage.logger.logToSummary(spacing + "    Step " + (titleMatch[1] + ':').padEnd(6, ' ') + ' ' + titleMatch[2])
            }
            if (line && this.startedCounter) {
                this.counter.push(line);
            }
    
            if (line.match(/=== .* ===/)) {
                this.startedCounter = true;
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
    }
    return YosysSynthStage;
}

export const YosysGowinStage = createYosysSynthStage(YosysEditions.GOWIN);
export const YosysECP5Stage = createYosysSynthStage(YosysEditions.ECP5);
export const YosysICE40Stage = createYosysSynthStage(YosysEditions.ICE40);