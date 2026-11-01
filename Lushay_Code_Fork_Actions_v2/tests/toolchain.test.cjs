const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { resolveToolchainBinPath, toolchainEnvironment } = require('../out/utils/toolchain-environment');

test('external binary directory takes priority and legacy suite roots remain usable', () => {
    assert.equal(resolveToolchainBinPath('/external/bin', '/suite'), path.resolve('/external/bin'));
    assert.equal(resolveToolchainBinPath('', '/suite'), path.resolve('/suite/bin'));
    assert.equal(resolveToolchainBinPath(undefined, '/suite/bin'), path.resolve('/suite/bin'));
    assert.equal(resolveToolchainBinPath('', ''), undefined);
});

test('Windows child processes preserve native environment and use one PATH key', () => {
    const inherited = { Path: 'C:\\Windows\\System32', SystemRoot: 'C:\\Windows', TEMP: 'C:\\Temp', GHDL_PREFIX: 'C:\\msys64\\ucrt64\\lib\\ghdl' };
    const result = toolchainEnvironment('C:\\msys64\\ucrt64\\bin', inherited, 'win32');
    assert.equal(result.SystemRoot, inherited.SystemRoot);
    assert.equal(result.TEMP, inherited.TEMP);
    assert.equal(result.GHDL_PREFIX, inherited.GHDL_PREFIX);
    assert.equal(result.Path, undefined);
    assert.match(result.PATH, /^C:\\msys64\\ucrt64\\bin;/);
    assert.ok(result.PATH.endsWith('C:\\Windows\\System32'));
    assert.equal(inherited.PATH, undefined);
});

test('POSIX child processes keep the host PATH and GHDL library settings', () => {
    const result = toolchainEnvironment('/opt/tools/bin', { PATH: '/usr/bin', GHDL_PREFIX: '/opt/ghdl/lib' }, 'linux');
    assert.equal(result.PATH, '/opt/tools/bin:/opt/tools/lib:/opt/tools/py3bin:/usr/bin');
    assert.equal(result.GHDL_PREFIX, '/opt/ghdl/lib');
});
