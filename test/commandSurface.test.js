const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('package contributes only the approved SlashCoded commands', () => {
    const pkg = readJson('package.json');
    const commands = (pkg.contributes && pkg.contributes.commands) || [];
    const expected = [
        'codingTracker.showLocalReport',
        'codingTracker.showSyncStatus',
        'codingTracker.queueLocalHistoryForDesktop',
        'codingTracker.showOutput'
    ];

    assert.deepEqual(commands.map(command => command.command), expected);

    for (const command of commands) {
        assert.match(command.title, /^SlashCoded:/);
        assert.equal(command.category, 'SlashCoded');
    }
});

test('README command overview lists only the approved SlashCoded commands', () => {
    const readme = readText('README.md');

    assert.match(readme, /SlashCoded: Show Local Report/);
    assert.match(readme, /SlashCoded: Show Sync Status/);
    assert.match(readme, /SlashCoded: Import Local History into Desktop/);
    assert.match(readme, /SlashCoded: Show Output Channel/);
});
