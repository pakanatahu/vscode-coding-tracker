import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { getVsixFilename } from './vsixFilename.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const vsixFilename = getVsixFilename(pkg.version);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

run(npmCommand, ['run', 'bundle']);
run(npxCommand, ['@vscode/vsce', 'package', '--out', vsixFilename]);

function run(command, args) {
    const result = process.platform === 'win32'
        ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command, ...args], { stdio: 'inherit' })
        : spawnSync(command, args, { stdio: 'inherit' });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}
