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

test('active runtime user-facing copy uses SlashCoded branding', () => {
    const files = [
        'lib/LocalServer.js',
        'lib/extensionMain.js',
        'lib/commands/auth.js',
        'lib/Uploader.js',
        'lib/core/configuration.js',
        'lib/tracking/afkMonitor.js'
    ];

    for (const relativePath of files) {
        const source = readText(relativePath);
        assert.equal(
            source.includes('CodingTracker:'),
            false,
            `expected ${relativePath} to avoid CodingTracker-prefixed user-facing copy`
        );
    }
});

test('sync status workflow and README avoid removed command labels', () => {
    const extensionMain = readText('lib/extensionMain.js');
    const readme = readText('README.md');

    assert.match(extensionMain, /Queue local history for Desktop ingestion/);
    assert.match(extensionMain, /Force upload queued events now/);
    assert.match(extensionMain, /Re-discover Desktop App/);
    assert.match(extensionMain, /placeHolder: 'SlashCoded sync status'/);

    const removedLabels = [
        'CodingTracker: Show Report',
        'CodingTracker: Start Local Server',
        'CodingTracker: Flush Upload Queue',
        'CodingTracker: Set Upload Token',
        'CodingTracker: Re-discover Desktop App'
    ];

    for (const label of removedLabels) {
        assert.equal(
            readme.includes(label),
            false,
            `expected README to stop documenting removed command ${label}`
        );
    }
});
