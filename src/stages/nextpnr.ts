import { ToolchainStage } from "./stage";
import * as path from 'path';
import { gowinDeviceInfo, ecp5DeviceInfo, ice40DeviceInfo } from "../utils/device-info";
import * as fs from 'fs';
import { spawnSync } from "child_process";

enum NextPnREditions {
    GOWIN = 'Gowin',
    ICE40 = 'ICE40',
    ECP5 = 'ECP5'
}

function createNextPnRStage(edition: NextPnREditions) {
    class NextPnrStage extends ToolchainStage {
        private deviceUtilisation: string[] = [];
        private utilisationStarted = false;

        private getExectuable(): string {
            switch (edition) {
                case NextPnREditions.GOWIN:
                    const himbaechelPath = path.join(ToolchainStage.ossCadSuiteBinPath, 'nextpnr-himbaechel');
                    if (fs.existsSync(himbaechelPath) || fs.existsSync(himbaechelPath + '.exe')) {
                        return 'nextpnr-himbaechel';
                    }
                    return 'nextpnr-gowin';
                case NextPnREditions.ICE40:
                    return 'nextpnr-ice40';
                case NextPnREditions.ECP5:
                    return 'nextpnr-ecp5';
            }
        }

        private getCommand(inputPath: string, outputPath: string): string[] {
            const command = this.getExectuable();
            const nextPnrPath = ToolchainStage.overrides['nextpnr'] ||
            path.join(ToolchainStage.ossCadSuiteBinPath, command);

            switch (edition) {
                case NextPnREditions.GOWIN:
                    const ossRootPath = path.resolve(ToolchainStage.ossCadSuiteBinPath, '..');
                    const res = spawnSync(
                        nextPnrPath,
                        [
                            '--help'
                        ],
                        {
                        env: {
                            PATH: [
                                path.join(ossRootPath, 'bin'),
                                path.join(ossRootPath, 'lib'),
                                path.join(ossRootPath, 'py3bin'),
                                process.env.PATH
                            ].join(process.platform === 'win32' ? ';' : ':')
                        },
                        cwd: this.projectFile.basePath,
                    });

                    const isHimBaechel = (res.stdout.toString() + res.stderr.toString()).includes('vopt');
                    const {device, family, freq} = gowinDeviceInfo(this.projectFile.board);
                    const chibDbPath = path.join(ToolchainStage.ossCadSuiteBinPath, '..', 'share', 'nextpnr', 'himbaechel', 'gowin', 'chipdb-' + family + '.bin');
                    return [
                        nextPnrPath,
                        '--json',
                        inputPath,
                        '--write',
                        outputPath,
                        '--freq',
                        freq,
                        '--device',
                        device,
                        ...(isHimBaechel ?
                            ['--vopt', 'family=' + family] :
                            ['--family', family]
                        ),
                        ...(isHimBaechel ?
                            ['--vopt', 'cst=' + this.projectFile.constraintsFile] :
                            ['--cst', this.projectFile.constraintsFile]
                        ),
                        ...(isHimBaechel && !(ToolchainStage.overrides['nextpnr']) ?
                            ['--chipdb', chibDbPath] :
                            []
                        ),
                        ...this.projectFile.nextPnrGowinOptions
                    ];
                case NextPnREditions.ICE40:
                    const iceDeviceInfo = ice40DeviceInfo(this.projectFile.board);
                    return [
                        nextPnrPath,
                        '--json',
                        inputPath,
                        '--asc',
                        outputPath,
                        '--freq',
                        iceDeviceInfo.freq,
                        '--package',
                        iceDeviceInfo.package,
                        iceDeviceInfo.deviceFlag,
                        '--pcf',
                        this.projectFile.constraintsFile,
                        ...this.projectFile.nextPnrIce40Options
                    ];
                case NextPnREditions.ECP5:
                    const ecpDeviceInfo = ecp5DeviceInfo(this.projectFile.board);
                    return [
                        nextPnrPath,
                        '--json',
                        inputPath,
                        '--textcfg',
                        outputPath,
                        '--freq',
                        ecpDeviceInfo.freq,
                        ecpDeviceInfo.deviceFlag,
                        '--package',
                        ecpDeviceInfo.package,
                        '--lpf',
                        this.projectFile.constraintsFile,
                        ...this.projectFile.nextPnrEcp5Options
                    ];
            }
        }

        public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
            const inputPath = previousStage?.getFilesCreated()[0];
            if (!inputPath) {
                ToolchainStage.logger.logToBoth('    Error: no synthesised netlist file');
                return null;
            }
            const outputFileExtension = edition === NextPnREditions.GOWIN ? '.json' : edition === NextPnREditions.ICE40 ? '.asc' : '.conf';
            const outputPath = path.join(this.projectFile.basePath, this.projectFile.name + '_pnr' + outputFileExtension);

            this.filesCreated.push(outputPath);
            const pnrCommand = this.getCommand(inputPath, outputPath);

            return this.runCommand(pnrCommand);
        }

        protected onCommandStart(): void {
            ToolchainStage.logger.logToBoth("Starting PnR with NextPnR");
        }

        protected onCommandPrintLine(line: string): void {
            if (line.toLowerCase().startsWith('info: ') || line.toLowerCase().startsWith('error: ')) {
                const data = line.replace(/^(info): /i, '');
                if (
                    data.match(/^[A-Z]/)
                    && !data.trim().endsWith(":")
                    && !data.toLowerCase().includes('numpy')
                ) {
                    ToolchainStage.logger.logToSummary('    ' + data);
                }
                if (this.utilisationStarted && data) {
                    if (data.startsWith(' ') || data.startsWith('	')) {
                        this.deviceUtilisation.push(data.trim());
                    } else {
                        this.utilisationStarted = false;
                    }
                }
                if (data.includes('Device utilisation')) {
                    this.utilisationStarted = true;
                }
            } else if (line.includes('unrecognised option')) {
                ToolchainStage.logger.logToSummary('    Error: ' + line);
            }
        }

        protected onCommandPrintErrorLine(line: string): void {
            this.onCommandPrintLine(line);
        }

        protected onCommandEnd(): void {
            if (this.deviceUtilisation.length > 0) {
                ToolchainStage.logger.logToSummary('\n    Device Utilisation:');
                const rows = this.deviceUtilisation.map((row) => {
                    const parts = row.split(':');
                    return {
                        name: parts[0],
                        val: parts[1]
                    }
                });
                const maxLength = rows.reduce((max, val) => val.name.length > max ? val.name.length : max, 0);
                ToolchainStage.logger.logToSummary(rows.map((row) => '        ' + (row.name + ':').padEnd(maxLength + 5, ' ') + row.val).join('\n') + '\n');
            }
            ToolchainStage.logger.logToBoth('Finished PnR');
        }
    }
    return NextPnrStage;
}

export const NextPnrGowinStage = createNextPnRStage(NextPnREditions.GOWIN);
export const NextPnrIce40Stage = createNextPnRStage(NextPnREditions.ICE40);
export const NextPnrEcp5Stage = createNextPnRStage(NextPnREditions.ECP5);
