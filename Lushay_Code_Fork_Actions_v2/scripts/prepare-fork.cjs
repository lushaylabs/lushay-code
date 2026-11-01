'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const repository = process.env.GITHUB_REPOSITORY || process.argv[2];
if (!repository || !/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) {
    throw new Error('Set GITHUB_REPOSITORY or pass owner/repository as the argument.');
}
const manifestPath = path.join(root, 'package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (process.env.GITHUB_REF?.startsWith('refs/tags/')) {
    const expected = `refs/tags/v${manifest.version}`;
    if (process.env.GITHUB_REF !== expected) {
        throw new Error(`Release tag must match package.json: expected ${expected}`);
    }
}

manifest.name = 'lushay-code-vhdl';
manifest.displayName = 'Lushay Code VHDL (Fork)';
manifest.publisher = repository.split('/')[0].toLowerCase();
manifest.repository = { type: 'git', url: `https://github.com/${repository}.git` };
manifest.homepage = `https://github.com/${repository}#readme`;
manifest.bugs = { url: `https://github.com/${repository}/issues` };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Packaging ${manifest.publisher}.${manifest.name} ${manifest.version} from ${repository}`);
