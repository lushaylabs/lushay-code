const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');

const {
    createYosysCommand, isSynthesisFile, portsFromYosysLine
} = require('../out/utils/yosys-command');
const { ToolchainStage } = require('../out/stages/stage');
const { YosysCSTCheckStage } = require('../out/stages/yosys-cst-check');
const { getStagesForOption } = require('../out/stages');
const { CommandOption } = require('../out/utils/command-options');

function projectAt(basePath, values = {}) {
    return {
        name: 'blinky', board: 'tangnano9k', top: 'Blink_Top', basePath,
        includedFiles: ['counter_pkg.vhd', 'blink.vhdl'],
        includedFilePaths: [path.join(basePath, 'counter_pkg.vhd'), path.join(basePath, 'blink.vhdl')],
        constraintsFile: path.join(basePath, 'tangnano9k.cst'),
        programMode: 'ram', testBenches: [], testBenchPath: '',
        synthGowinOptions: [], nextPnrGowinOptions: [], skipCstChecking: false,
        ...values
    };
}

test('VHDL discovery includes both suffixes and excludes testbenches', () => {
    const files = ['design.vhd', 'design.vhdl', 'DESIGN.VHD', 'old.v', 'design_tb.vhd', 'design_tb.vhdl', 'old_tb.v', 'pins.cst'];
    assert.deepEqual(files.filter(isSynthesisFile), ['design.vhd', 'design.vhdl', 'DESIGN.VHD', 'old.v']);
});

test('pin parsing preserves non-zero and ascending indices', () => {
    assert.deepEqual(portsFromYosysLine('input [7:4] data'), ['data[4]', 'data[5]', 'data[6]', 'data[7]']);
    assert.deepEqual(portsFromYosysLine('output [1:3] result'), ['result[1]', 'result[2]', 'result[3]']);
    assert.deepEqual(portsFromYosysLine('input [0:0] clk'), ['clk']);
    assert.deepEqual(portsFromYosysLine('some unrelated log message'), []);
});

test('unsupported VHDL operations stop before cloud, simulation or mixed-language builds', () => {
    const project = projectAt('/tmp/example');
    assert.throws(() => getStagesForOption(project, CommandOption.BUILD_ONLY, 'cloud'), /local open-source/);
    assert.throws(() => getStagesForOption(project, CommandOption.RUN_TESTBENCH, 'open-source'), /iVerilog/);
    assert.throws(() => getStagesForOption({ ...project, includedFilePaths: ['a.vhd', 'b.v'] }, CommandOption.BUILD_ONLY, 'open-source'), /Mixed/);
    assert.equal(getStagesForOption(project, CommandOption.PROGRAM_ONLY, 'cloud').length, 1);
});

test('built-in and external plugin configurations are supported', () => {
    const project = projectAt('/tmp/example');
    const external = createYosysCommand(project, 'yosys', () => []);
    const builtin = createYosysCommand({ ...project, ghdlPlugin: '' }, 'yosys', () => []);
    try {
        assert.equal(external.command[1], '-m');
        assert.equal(builtin.command[1], '-c');
    } finally {
        external.dispose();
        builtin.dispose();
    }
    assert.throws(() => createYosysCommand({ ...project, ghdlOptions: 'invalid' }, 'yosys', () => []), /array/);
});

// Exercise the real parser with a small VS Code filesystem adapter; no Electron is needed.
test('project parser discovers VHDL and preserves an explicit dependency order', async () => {
    const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'lushay-project-'));
    const sourceFiles = ['counter_pkg.vhd', 'blink.vhdl', 'blink_tb.vhd', 'old_tb.v', 'tangnano9k.cst'];
    for (const file of sourceFiles) {
        fs.writeFileSync(path.join(basePath, file), '');
    }
    const projectPath = path.join(basePath, 'demo.lushay.json');
    const originalLoad = Module._load;
    const vscode = {
        workspace: {
            workspaceFolders: [{ name: 'example', uri: { fsPath: basePath } }],
            findFiles: async glob => {
                const names = glob.endsWith('*.lushay.json') ? ['demo.lushay.json'] :
                    glob.includes('{') ? sourceFiles.filter(file => /\.(v|vhd|vhdl)$/i.test(file)) :
                    glob.endsWith('*.v') ? sourceFiles.filter(file => file.endsWith('.v')) : [];
                return names.map(name => ({ fsPath: path.join(basePath, name) }));
            }
        }
    };
    Module._load = function (request, ...args) {
        return request === 'vscode' ? vscode : originalLoad.call(this, request, ...args);
    };
    let parseProjectFile;
    try {
        ({ parseProjectFile } = require('../out/projecfile'));
    } finally {
        Module._load = originalLoad;
    }
    try {
        const values = { includedFiles: 'all', constraintsFile: 'tangnano9k.cst' };
        fs.writeFileSync(projectPath, JSON.stringify(values));
        const discovered = await parseProjectFile(undefined, projectPath);
        assert.deepEqual(discovered.includedFilePaths.map(file => path.basename(file)), ['blink.vhdl', 'counter_pkg.vhd']);
        assert.deepEqual(discovered.testBenches, []);
        fs.writeFileSync(projectPath, JSON.stringify({ ...values, includedFiles: ['counter_pkg.vhd', 'blink.vhdl'] }));
        const explicit = await parseProjectFile(undefined, projectPath);
        assert.deepEqual(explicit.includedFilePaths.map(file => path.basename(file)), ['counter_pkg.vhd', 'blink.vhdl']);
    } finally {
        fs.rmSync(basePath, { recursive: true, force: true });
    }
});

const suite = process.env.LUSHAY_OSS_CAD_SUITE;
test('real GHDL/Yosys integration and Gowin bitstreams', { skip: !suite }, async t => {
    const bin = path.join(suite, 'bin');
    const yosys = path.join(bin, 'yosys');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lushay VHDL integration '));
    const messages = [];
    const logger = Object.fromEntries(['logToBoth', 'logToRaw', 'logToSummary', 'writeToBoth'].map(method => [method, message => messages.push(message)]));
    ToolchainStage.initialize(bin, logger, '', {});

    function fixture(name) {
        const basePath = path.join(root, name);
        fs.cpSync(path.join(__dirname, '../examples/vhdl-blinky'), basePath, { recursive: true });
        return projectAt(basePath);
    }
    async function build(project) {
        let previous;
        for (const Stage of getStagesForOption(project, CommandOption.BUILD_ONLY, 'open-source')) {
            const stage = new Stage(project);
            const status = await stage.runProg(previous);
            assert.equal(status, 0, messages.join('\n').slice(-7000));
            previous = stage;
        }
        assert.ok(fs.statSync(path.join(project.basePath, 'blinky.fs')).size > 0);
    }

    try {
        await t.test('VHDL package and entity in paths with spaces produce a Gowin .fs', async () => {
            await build(fixture('package and entity'));
        });
        await t.test('missing VHDL port constraint fails before synthesis', async () => {
            const project = fixture('missing pin');
            fs.writeFileSync(project.constraintsFile, 'IO_LOC "clk" 52;\n');
            assert.equal(await new YosysCSTCheckStage(project).runProg(), 1);
            assert.match(messages.join('\n'), /missing from CST file: led/);
        });
        await t.test('invalid VHDL fails with a frontend error', async () => {
            const project = fixture('bad syntax');
            fs.writeFileSync(project.includedFilePaths[1], 'entity broken is port ( invalid VHDL );');
            assert.notEqual(await new YosysCSTCheckStage(project).runProg(), 0);
            assert.equal(fs.existsSync(path.join(project.basePath, 'blinky.fs')), false);
        });
        await t.test('missing plugin produces a failed build', async () => {
            const project = { ...fixture('missing plugin'), ghdlPlugin: 'lushay_nonexistent_ghdl_plugin' };
            assert.notEqual(await new YosysCSTCheckStage(project).runProg(), 0);
        });
        await t.test('a project can select VHDL-93 explicitly', () => {
            const project = { ...fixture('VHDL 93'), ghdlOptions: ['--std=93'] };
            const invocation = createYosysCommand(project, yosys, () => ['check']);
            const command = invocation.command;
            try {
                const result = spawnSync(command[0], command.slice(1), { cwd: project.basePath, encoding: 'utf8' });
                assert.equal(result.status, 0, result.stderr);
            } finally {
                invocation.dispose();
            }
        });
        await t.test('filenames with Tcl characters are passed literally and scripts are cleaned up', () => {
            const project = fixture('literal filenames');
            const source = path.join(project.basePath, 'blink [clock] $value.vhdl');
            fs.renameSync(project.includedFilePaths[1], source);
            project.includedFilePaths[1] = source;
            project.top = 'blink_top';
            const invocation = createYosysCommand(project, yosys, top => [`portlist ${top}`]);
            const scriptPath = invocation.command[invocation.command.length - 1];
            try {
                const result = spawnSync(invocation.command[0], invocation.command.slice(1), { cwd: project.basePath, encoding: 'utf8' });
                assert.equal(result.status, 0, result.stderr);
                assert.match(result.stdout, /input \[0:0\] clk/);
                assert.match(result.stdout, /output \[0:0\] led/);
            } finally {
                invocation.dispose();
            }
            assert.equal(fs.existsSync(scriptPath), false);
        });
        await t.test('Verilog synthesis and bitstream generation still work', async () => {
            const project = fixture('Verilog regression');
            const source = path.join(project.basePath, 'blink.v');
            fs.writeFileSync(source, 'module Blink_Top(input clk, output led); reg [23:0] count = 0; always @(posedge clk) count <= count + 1; assign led = count[23]; endmodule\n');
            project.includedFilePaths = [source];
            await build(project);
        });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
