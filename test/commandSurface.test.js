const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

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
        'slashCoded.showLocalReport',
        'slashCoded.showSyncStatus',
        'slashCoded.queueLocalHistoryForDesktop',
        'slashCoded.showOutput'
    ];

    assert.deepEqual(commands.map(command => command.command), expected);

    for (const command of commands) {
        assert.match(command.command, /^slashCoded\./);
        assert.match(command.title, /^SlashCoded:/);
        assert.equal(command.category, 'SlashCoded');
    }
});

test('package contributes only the approved slashCoded settings', () => {
    const pkg = readJson('package.json');
    const properties = pkg.contributes.configuration.properties;
    const settingKeys = Object.keys(properties);
    const expected = [
        'slashCoded.showStatus',
        'slashCoded.shouldTrackTerminal',
        'slashCoded.shouldTrackAIChat',
        'slashCoded.afkEnabled',
        'slashCoded.uploadTimeoutMs',
        'slashCoded.desktopDiscoveryTimeoutMs',
        'slashCoded.storageMode'
    ];

    assert.deepEqual(settingKeys, expected);

    for (const key of settingKeys) {
        assert.match(key, /^slashCoded\./);
    }

    assert.deepEqual(properties['slashCoded.storageMode'].enum, ['auto', 'standalone']);
    assert.equal(properties['slashCoded.storageMode'].default, 'auto');
});

test('package contributes only slashCoded command IDs', () => {
    const pkg = readJson('package.json');
    const commands = pkg.contributes.commands;
    const expected = [
        'slashCoded.showLocalReport',
        'slashCoded.showSyncStatus',
        'slashCoded.queueLocalHistoryForDesktop',
        'slashCoded.showOutput'
    ];

    assert.deepEqual(commands.map(command => command.command), expected);

    for (const command of commands) {
        assert.match(command.command, /^slashCoded\./);
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
        'codingTracker.showLocalReport',
        'codingTracker.showSyncStatus',
        'codingTracker.queueLocalHistoryForDesktop',
        'codingTracker.showOutput',
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

test('docs and manifest do not expose deprecated codingTracker settings', () => {
    const pkg = readJson('package.json');
    const readme = readText('README.md');
    const manifestText = JSON.stringify(pkg);
    const deprecated = [
        'codingTracker.connectionMode',
        'codingTracker.uploadToken',
        'codingTracker.computerId',
        'codingTracker.localServerMode',
        'codingTracker.moreThinkingTime',
        'codingTracker.proxy',
        'codingTracker.functionKey',
        'codingTracker.overrideOrigin',
        'codingTracker.afkTimeoutMinutes',
        'codingTracker.forceLocalFallback'
    ];

    for (const key of deprecated) {
        assert.equal(manifestText.includes(key), false, `manifest still exposes ${key}`);
        assert.equal(readme.includes(key), false, `README still documents ${key}`);
    }
});

test('active runtime reads slashCoded configuration only', () => {
    const activeSources = [
        readText('lib/core/configuration.js'),
        readText('lib/LocalServer.js'),
        readText('lib/Uploader.js')
    ].join('\n');

    assert.match(activeSources, /getConfig\('slashCoded'\)|getConfiguration\('slashCoded'\)/);
    assert.doesNotMatch(activeSources, /getConfig\('codingTracker'\)|getConfiguration\('codingTracker'\)/);
    assert.doesNotMatch(activeSources, /connectionMode|functionKey|overrideOrigin|uploadTokenRaw|computerId|forceLocalFallback/);
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
    assert.match(extensionMain, /slashCoded\.showSyncStatus/);
    assert.match(extensionMain, /slashCoded\.queueLocalHistoryForDesktop/);
    assert.match(extensionMain, /slashCoded\.showOutput/);
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

    assert.doesNotMatch(
        [
            readText('lib/LocalServer.js'),
            readText('lib/extensionMain.js'),
            readText('lib/StatusBarManager.js')
        ].join('\n'),
        /registerCommand\('codingTracker\.|command = 'codingTracker\./
    );
});

test('package metadata and changelog reflect the reduced SlashCoded command surface', () => {
    const pkg = readJson('package.json');
    const changelog = readText('CHANGELOG.md');

    assert.equal(pkg.description.includes('start/stop local server'), false);
    assert.equal(pkg.description.includes('flush uploads'), false);
    assert.equal(pkg.description.includes('set the upload token'), false);

    assert.match(changelog, /SlashCoded: Show Local Report/);
    assert.match(changelog, /SlashCoded: Import Local History into Desktop/);
    assert.equal(changelog.includes('CodingTracker: Show Report'), false);
    assert.equal(changelog.includes('CodingTracker: Queue Local History for Desktop Ingestion'), false);
});

test('package script writes the SlashCoded VSIX filename', async () => {
    const pkg = readJson('package.json');
    const filenameModule = await import(pathToFileURL(path.join(repoRoot, 'scripts/vsixFilename.mjs')));
    const packageScript = readText('scripts/package-vsix.mjs');

    assert.equal(pkg.scripts.package, 'node ./scripts/package-vsix.mjs');
    assert.equal(
        filenameModule.getVsixFilename(pkg.version),
        `SlashCoded-VSCode-Extension.${pkg.version}.vsix`
    );
    assert.match(packageScript, /process\.env\.ComSpec \|\| 'cmd\.exe'/);
    assert.doesNotMatch(packageScript, /shell: process\.platform === 'win32'/);
});
