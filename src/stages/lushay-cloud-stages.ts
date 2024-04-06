import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as URL from 'url';
import { ToolchainStage } from './stage';
import { gowinDeviceInfo } from '../utils/device-info';

const SERVER_URL = 'https://lushay-code.lushaylabs.com'

export class YosysGowinPrepareProjectStage extends ToolchainStage {
    private startedCounter: boolean = false;
    private counter: string[] = [];

    public async runProg(): Promise<number | null> {
        const yosysPath = ToolchainStage.overrides['yosys'] || path.join(ToolchainStage.ossCadSuiteBinPath, 'yosys');
        const outPath = path.join(this.projectFile.basePath, `___tempbuild_1${this.projectFile.name}.v`);
        const gowinXtraCellsPath = path.join(ToolchainStage.ossCadSuiteBinPath, '..', 'share', 'yosys', 'gowin', 'cells_xtra.v');

        const preparationCommand = [
            yosysPath,
            '-p',
            `read_verilog ${this.projectFile.includedFilePaths.join(' ')}; read_verilog -specify -lib +/gowin/cells_sim.v;${fs.existsSync(gowinXtraCellsPath) ? ' read_verilog -specify -lib +/gowin/cells_xtra.v;' : ''} hierarchy -check  -top ${this.projectFile.top || 'top'}; proc; flatten`,
            '-o',
            outPath
        ];
        this.filesCreated.push(outPath);
        if (this.projectFile.top && !this.projectFile.top.match(/^[a-zA-Z0-9_]+$/)) {
            ToolchainStage.logger.logToBoth(`    Error: Top module name ${this.projectFile.top} is not a currently supported, please use only letters, numbers and underscores`)
            return 1;
        }
        return this.runCommand(preparationCommand);
    }

    protected onCommandStart(): void {
        ToolchainStage.logger.logToBoth("Starting Yosys Preparation");
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
        ToolchainStage.logger.logToBoth("Finished Preparation");
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


function sendRequest(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = URL.parse(url);
        const req = https.request({
            host: parsedUrl.host,
            path: parsedUrl.path,
            
            method: 'POST',
            headers: {
                'x-goog-resumable': 'start',
            }
        }, (res) => {
            if (res.headers.location) {
                resolve(res.headers.location);
            } else {
                reject();
            }
            res.on('data', (data) => {});
            res.on('error', (err) => {
                console.log(err);
                reject(err);
            })
        })
        req.end();
    });
}


function uploadContent(url: string, data: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = URL.parse(url);
        const multipartBody = data;
        const req = https.request({
            host: parsedUrl.host,
            path: parsedUrl.path,    
            method: 'PUT',
            headers: {
                'x-goog-resumable': 'start',
                'Content-Type': 'multipart/form-data',
                'Content-Length': multipartBody.length
            }
        }, (res) => {
            res.on('data', (data) => {});
            res.on('error', (err) => {
                console.log(err);
                reject(err);
            })
            res.on('end', () => {
                if (res.statusCode && res.statusCode < 300) {
                    resolve('');
                } else {
                    reject()
                }
            })
        })
        req.write(multipartBody);
        req.end();
    });
}


function downloadFile(dest: string, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = https.get(url, function(response) {
            response.pipe(file);
    
            file.on("finish", () => {
                file.close();
                resolve(true);
            });
        });
        request.end();
    });
}

function makeGetRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsedUrl = URL.parse(url);
        const req = https.request({
            host: parsedUrl.host,
            path: parsedUrl.path + `?token=${ToolchainStage.apiKey.trim()}`,
            method: 'GET',
        }, (res) => {
            let dataArr: Buffer[] = []
            res.on('data', (data) => dataArr.push(data));
            res.on('end', () => {
                try {
                    const response = JSON.parse(Buffer.concat(dataArr).toString());
                    resolve(response);
                } catch(e) {
                    console.log(e);
                    reject();
                }
            })
        })
        req.on('error', (e) => {
            console.log(e);
            reject();
        });
        req.end();
    });
}

function waitForPresignedUrl(url: string): Promise<string> {
    let counter = 0;
    return new Promise((resolve, reject) => {
        const tryMakeRequest = async () => {
            try {
                const res = await makeGetRequest(url);
            
                if (res.error) {
                    if (counter < 20) {
                        setTimeout(tryMakeRequest, 1000);
                        counter += 1;
                    } else {
                        reject();
                    }
                } else {
                    resolve(res.url);
                }
            } catch(e) {
                reject();
            }
        }
        tryMakeRequest();
    });
}

async function getSignedUrl(): Promise<{url: string, number: number, uuid: string} | undefined> {
    const res = await makeGetRequest(SERVER_URL + '/joinQueue');
    const url = SERVER_URL + '/getPresigned/' + res.number + '/' + res.uuid;
    return {
        ...res,
        url: await waitForPresignedUrl(url)
    }
}

function waitForBuildToFinish(queueInfo: {number: number, uuid: string}, log: (msg: string) => void): Promise<{url: string, success: boolean}> {
    let counter = 0;
    return new Promise((resolve, reject) => {
        const tryMakeRequest = async () => {
            try {
                log('.');
                const res = await makeGetRequest(SERVER_URL + '/getRes/' + queueInfo.number + '/' + queueInfo.uuid);
                if (res.error) {
                    if (counter < 240) {
                        setTimeout(tryMakeRequest, 2000);
                        counter += 1;
                    } else {
                        reject();
                    }
                } else {
                    resolve(res);
                }
            } catch(e) {
                console.log(e);
                reject();
            }
        }
        tryMakeRequest();
    });
}

export class SendToServerStage extends ToolchainStage {
    public async runProg(previousStage: ToolchainStage | undefined): Promise<number | null> {
        ToolchainStage.logger.logToBoth("Starting Cloud Build");
        if (!ToolchainStage.apiKey) {
            ToolchainStage.logger.logToBoth('    Error: No API Key setup');
        }
        const fileName = path.join(this.projectFile.basePath, `___tempbuild_1${this.projectFile.name}.v`);
        const verilog = fs.readFileSync(fileName).toString();
        fs.unlinkSync(fileName);
        const contraintFile = fs.readFileSync(this.projectFile.constraintsFile).toString();
        
        try {
            const signedUrl = await getSignedUrl();
            if (!signedUrl) {
                ToolchainStage.logger.logToBoth('    Error: Could not connect to cloud');
                return 1;
            }
            ToolchainStage.logger.writeToBoth('    Uploading project to cloud -');
            const location = await sendRequest(signedUrl.url);
            const {device, family} = gowinDeviceInfo(this.projectFile.board);
            const deviceToSend = device === 'GW1NSR-LV4CQN48PC7/I6' ? 'GW1NSR-LV4CQN48PC6/I5' : device;
            const projectContent = {
                verilog,
                contraintFile,
                top: this.projectFile.top || 'top',
                device: deviceToSend,
                family
            }
            await uploadContent(location, Buffer.from(JSON.stringify(projectContent)));
            const destFileName = path.join(this.projectFile.basePath, `___tempbuild_1${this.projectFile.name}.json`);
            const fsFileName = path.join(this.projectFile.basePath, `${this.projectFile.name}.fs`);
            await makeGetRequest(SERVER_URL + '/startBuild/' + signedUrl.number + '/' + signedUrl.uuid);
            ToolchainStage.logger.logToBoth(' Done');
            ToolchainStage.logger.writeToBoth('    Waiting for build to complete ');;
            const res = await waitForBuildToFinish(signedUrl, ToolchainStage.logger.writeToBoth);
            ToolchainStage.logger.logToBoth(' Done')
            ToolchainStage.logger.logToBoth('    Downloading results');
            await downloadFile(destFileName, res.url);
            ToolchainStage.logger.logToBoth('    Downloaded Results');
            const downloadedData = JSON.parse(fs.readFileSync(destFileName).toString());
            ToolchainStage.logger.logToBoth('    Logs from Build');
            ToolchainStage.logger.logToBoth(downloadedData.logs.trim().split('\n').map((l: string) => '        ' + l).join('\n'));
            ToolchainStage.logger.logToBoth('');
            let err = false;
            if (downloadedData.bitStream) {
                fs.writeFileSync(fsFileName, downloadedData.bitStream);
                ToolchainStage.logger.logToBoth('    Successfully Generated Bitstream');
            } else {
                ToolchainStage.logger.logToBoth('    Error: There was an error creating the bitstream');
                err = true;
            }
            fs.unlinkSync(destFileName);
            await makeGetRequest(SERVER_URL + '/remove/' + signedUrl.number + '/' + signedUrl.uuid);
            if (err) {
                return 1;
            }
        } catch(e) {
            console.log(e);
            ToolchainStage.logger.logToBoth('    Error: Could not upload project to cloud');
            return 1;
        }
        ToolchainStage.logger.logToBoth('Finished Cloud Build');
        return 0;
    }
    protected onCommandEnd(): void {
        
    }
    protected onCommandPrintErrorLine(line: string): void {
        
    }
    protected onCommandPrintLine(line: string): void {
        
    }
    protected onCommandStart(): void {
        
    }
}



