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

test('active runtime modules do not register removed standalone commands', () => {
    const sources = [
        readText('lib/LocalServer.js'),
        readText('lib/extensionMain.js'),
        readText('lib/tracking/afkMonitor.js')
    ].join('\n');

    const removedCommands = [
        'codingTracker.showReport',
        'codingTracker.startLocalServer',
        'codingTracker.stopLocalServer',
        'codingTracker.githubAuth',
        'codingTracker.flushUploads',
        'codingTracker.rediscoverDesktop',
        'codingTracker.setUploadToken',
        'codingTracker.afkEnable',
        'codingTracker.afkDisable',
        'codingTracker.afkToggle'
    ];

    for (const commandId of removedCommands) {
        assert.doesNotMatch(
            sources,
            new RegExp(`registerCommand\\('${commandId.replaceAll('.', '\\.')}`),
            `expected removed command ${commandId} to stay unregistered`
        );
    }
});
