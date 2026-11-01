"""Inspect the distributable rather than assuming packaging included runtime files."""
from pathlib import Path
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
import zipfile

archive_path = Path(sys.argv[1])
target = sys.argv[2]
native_files = {
    'linux-x64': 'prebuilds/linux-x64/node.napi.glibc.node',
    'win32-x64': 'prebuilds/win32-x64/node.napi.node',
}
with zipfile.ZipFile(archive_path) as archive:
    if archive.testzip():
        raise RuntimeError('Corrupt VSIX archive')
    names = set(archive.namelist())
    required = {
        'extension/package.json',
        'extension/out/extension.js',
        'extension/out/utils/yosys-command.js',
        'extension/out/utils/toolchain-environment.js',
        'extension/lushay.schema.json',
        'extension/node_modules/serialport/dist/index.js',
        'extension/node_modules/@serialport/bindings-cpp/' + native_files[target],
    }
    missing = required - names
    if missing:
        raise RuntimeError(f'Missing runtime files: {sorted(missing)}')
    manifest = json.loads(archive.read('extension/package.json'))
    metadata = ET.fromstring(archive.read('extension.vsixmanifest'))
    identity = metadata.find('.//{*}Identity')
    if identity is None or identity.attrib.get('TargetPlatform') != target:
        raise RuntimeError(f'Incorrect target platform: expected {target}')
    if manifest['publisher'] == 'lushay-labs':
        raise RuntimeError('Fork packages must have their own publisher metadata')
digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
checksum = archive_path.with_suffix(archive_path.suffix + '.sha256')
checksum.write_text(f'{digest}  {archive_path.name}\n', encoding='utf-8')
print(f'PASS: {manifest["publisher"]}.{manifest["name"]} {manifest["version"]}; target={target}; native runtime included')
print(f'SHA256: {digest}')
