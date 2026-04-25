# SlashCoded Settings Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pre-release `codingTracker.*` public surface with a first-public-release `slashCoded.*` settings and command surface, remove cloud-era behavior, remove `pcid`, and bump the extension version.

**Architecture:** Update the public contribution manifest first, then update active runtime reads and command registrations to match it. Keep `storageMode` as the single switch between automatic Desktop ingestion and standalone local dashboard behavior. Remove cloud/token/computer ID concepts from active runtime paths and prove the new surface with focused Node tests.

**Tech Stack:** VS Code extension manifest (`package.json`), CommonJS runtime modules, Node built-in test runner, esbuild/vsce packaging.

---

## File Map

- `package.json`: public settings, command IDs, extension version.
- `package-lock.json`: root package version.
- `package.nls.json`, `package.nls.es.json`, `package.nls.ru.json`, `package.nls.zh-cn.json`, `package.nls.zh-tw.json`: remove stale setting descriptions or replace them with `slashCoded.*` descriptions if still referenced.
- `lib/core/configuration.js`: read `slashCoded` settings, remove cloud/manual token/computer ID configuration, map `storageMode`.
- `lib/localReport/storageMode.js`: replace `connectionMode`/`forceLocalFallback` with `storageMode` and desktop discovery.
- `lib/Uploader.js`: remove cloud mode branches, manual upload token setting dependency, function key/origin config reads, and `pcid` assumptions.
- `lib/UploadObject.js`: stop exposing `pcid` through the base upload object if no active code needs it.
- `lib/core/desktopEventMapper.js`: remove `pcid` fallback for `project`.
- `lib/LocalServer.js`: switch command registration and config reads to `slashCoded`; remove legacy `uploadToken`/`serverURL`/`localServerMode` startup assumptions where active runtime uses the built-in dashboard.
- `lib/StatusBarManager.js`: update status bar command from old `codingTracker.*` ID to `slashCoded.*`.
- `lib/extensionMain.js`: update active command registrations and any command references.
- `README.md`: document only `slashCoded.*` settings and the two supported modes.
- `CHANGELOG.md`: document the first-public settings and command surface.
- `test/commandSurface.test.js`: public settings, command namespace, removed settings, docs, package version checks.
- `test/localStorageMode.test.js`: `storageMode` queue decisions.
- `test/desktopEventMapper.test.js`: `pcid` removal from mapped Desktop payloads.

## Task 1: Lock Public Settings And Command Namespace Tests

**Files:**
- Modify: `test/commandSurface.test.js`

- [x] **Step 1: Add failing manifest tests**

Add this test near the existing command surface tests:

```js
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
```

- [x] **Step 2: Update removed-command expectations**

Change the existing `expected` command list from `codingTracker.*` to `slashCoded.*`. Change the `removedCommands` array to include the old public command IDs:

```js
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
```

- [x] **Step 3: Add deprecated settings text checks**

Add this test:

```js
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
```

- [x] **Step 4: Run test to verify red**

Run: `node --test test/commandSurface.test.js`

Expected: FAIL because `package.json` still contributes `codingTracker.*` settings and commands.

- [x] **Step 5: Commit the failing tests**

```bash
git add test/commandSurface.test.js
git commit -m "test: lock slashcoded public extension surface"
```

## Task 2: Update Package Contributions To slashCoded

**Files:**
- Modify: `package.json`
- Modify: `package.nls.json`
- Modify: `package.nls.es.json`
- Modify: `package.nls.ru.json`
- Modify: `package.nls.zh-cn.json`
- Modify: `package.nls.zh-tw.json`

- [x] **Step 1: Replace contributed settings**

In `package.json`, replace `contributes.configuration.title` with:

```json
"title": "SlashCoded"
```

Replace `contributes.configuration.properties` with:

```json
{
    "slashCoded.showStatus": {
        "type": "boolean",
        "default": true,
        "description": "Show the SlashCoded status bar item."
    },
    "slashCoded.shouldTrackTerminal": {
        "type": "boolean",
        "default": true,
        "description": "Include terminal activity events."
    },
    "slashCoded.shouldTrackAIChat": {
        "type": "boolean",
        "default": true,
        "description": "Include AI chat activity events."
    },
    "slashCoded.afkEnabled": {
        "type": "boolean",
        "default": true,
        "description": "Pause or classify tracking when VS Code is idle."
    },
    "slashCoded.uploadTimeoutMs": {
        "type": "number",
        "default": 15000,
        "minimum": 1000,
        "description": "Timeout in milliseconds for local SlashCoded Desktop upload requests."
    },
    "slashCoded.desktopDiscoveryTimeoutMs": {
        "type": "number",
        "default": 500,
        "minimum": 100,
        "description": "Timeout in milliseconds for SlashCoded Desktop discovery handshakes."
    },
    "slashCoded.storageMode": {
        "type": "string",
        "enum": [
            "auto",
            "standalone"
        ],
        "default": "auto",
        "description": "Storage mode: 'auto' uses SlashCoded Desktop when detected and local history otherwise; 'standalone' always uses the built-in local dashboard."
    }
}
```

- [x] **Step 2: Replace contributed command IDs**

In `package.json`, replace the command IDs with:

```json
[
    {
        "command": "slashCoded.showLocalReport",
        "title": "SlashCoded: Show Local Report",
        "category": "SlashCoded"
    },
    {
        "command": "slashCoded.showSyncStatus",
        "title": "SlashCoded: Show Sync Status",
        "category": "SlashCoded"
    },
    {
        "command": "slashCoded.queueLocalHistoryForDesktop",
        "title": "SlashCoded: Import Local History into Desktop",
        "category": "SlashCoded"
    },
    {
        "command": "slashCoded.showOutput",
        "title": "SlashCoded: Show Output Channel",
        "category": "SlashCoded"
    }
]
```

- [x] **Step 3: Remove stale nls keys**

In every `package.nls*.json` file, remove stale `cfg.*` entries for removed contributed settings. Keep the file as valid JSON. If no keys remain that are referenced by `package.json`, leave an empty object:

```json
{}
```

- [x] **Step 4: Run manifest tests**

Run: `node --test test/commandSurface.test.js`

Expected: still FAIL because runtime command registrations and README still use old IDs/settings.

- [x] **Step 5: Commit manifest changes**

```bash
git add package.json package.nls.json package.nls.es.json package.nls.ru.json package.nls.zh-cn.json package.nls.zh-tw.json
git commit -m "feat: expose slashcoded settings and commands"
```

## Task 3: Update Runtime Command IDs

**Files:**
- Modify: `lib/LocalServer.js`
- Modify: `lib/extensionMain.js`
- Modify: `lib/StatusBarManager.js`
- Modify: `test/commandSurface.test.js`

- [x] **Step 1: Update command registrations**

Replace these command IDs in active modules:

```text
codingTracker.showLocalReport -> slashCoded.showLocalReport
codingTracker.showSyncStatus -> slashCoded.showSyncStatus
codingTracker.queueLocalHistoryForDesktop -> slashCoded.queueLocalHistoryForDesktop
codingTracker.showOutput -> slashCoded.showOutput
```

In `lib/StatusBarManager.js`, the clickable status item currently points to a removed command. Set it to the sync status command:

```js
statusBarItem.command = 'slashCoded.showSyncStatus';
```

- [x] **Step 2: Update tests for active command IDs**

In `test/commandSurface.test.js`, update assertions that read active runtime source:

```js
assert.match(extensionMain, /slashCoded\.showSyncStatus/);
assert.match(extensionMain, /slashCoded\.queueLocalHistoryForDesktop/);
assert.match(extensionMain, /slashCoded\.showOutput/);
```

Add this assertion to ensure the old active namespace is gone from active command registrations:

```js
assert.doesNotMatch(
    [
        readText('lib/LocalServer.js'),
        readText('lib/extensionMain.js'),
        readText('lib/StatusBarManager.js')
    ].join('\n'),
    /registerCommand\('codingTracker\.|command = 'codingTracker\./
);
```

- [x] **Step 3: Run command surface tests**

Run: `node --test test/commandSurface.test.js`

Expected: command ID tests PASS; settings/runtime config tests may still FAIL until later tasks.

- [x] **Step 4: Commit command ID runtime change**

```bash
git add lib/LocalServer.js lib/extensionMain.js lib/StatusBarManager.js test/commandSurface.test.js
git commit -m "feat: rename extension commands to slashcoded"
```

## Task 4: Replace Storage Mode Behavior

**Files:**
- Modify: `test/localStorageMode.test.js`
- Modify: `lib/localReport/storageMode.js`
- Modify: `lib/Uploader.js`

- [x] **Step 1: Replace storage mode tests**

Replace `test/localStorageMode.test.js` with:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldQueueLiveEvents } = require('../lib/localReport/storageMode');

test('shouldQueueLiveEvents returns false in auto mode without desktop discovery', () => {
    assert.equal(shouldQueueLiveEvents({ storageMode: 'auto', discovery: null }), false);
});

test('shouldQueueLiveEvents returns false in standalone mode even with desktop discovery', () => {
    assert.equal(shouldQueueLiveEvents({
        storageMode: 'standalone',
        discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' }
    }), false);
});

test('shouldQueueLiveEvents returns true in auto mode with desktop discovery', () => {
    assert.equal(shouldQueueLiveEvents({
        storageMode: 'auto',
        discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' }
    }), true);
});

test('shouldQueueLiveEvents treats unknown storageMode as auto', () => {
    assert.equal(shouldQueueLiveEvents({
        storageMode: 'unexpected',
        discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' }
    }), true);
});
```

- [x] **Step 2: Run test to verify red**

Run: `node --test test/localStorageMode.test.js`

Expected: FAIL because `storageMode` is not implemented and cloud mode is still supported.

- [x] **Step 3: Implement storage mode helper**

Replace `lib/localReport/storageMode.js` with:

```js
//@ts-check

/**
 * @param {{ storageMode?: string, discovery?: { apiBaseUrl?: string, publicBaseUrl?: string }|null }} input
 * @returns {boolean}
 */
function shouldQueueLiveEvents(input) {
    const storageMode = input && input.storageMode === 'standalone' ? 'standalone' : 'auto';
    if (storageMode === 'standalone') return false;

    const discovery = input && input.discovery ? input.discovery : null;
    return !!(discovery && (discovery.apiBaseUrl || discovery.publicBaseUrl));
}

module.exports = {
    shouldQueueLiveEvents
};
```

- [x] **Step 4: Update uploader storage state**

In `lib/Uploader.js`, replace `forceLocalFallback` state and setter with:

```js
/** @type {'auto'|'standalone'} */
let storageMode = 'auto';
```

and:

```js
setStorageMode: function(mode) {
    storageMode = mode === 'standalone' ? 'standalone' : 'auto';
    try { log.debug(`uploader storageMode set to ${storageMode}`); } catch (_) { /* ignore */ }
},
```

Update the queue decision call to:

```js
if (!shouldQueueLiveEvents({ storageMode, discovery })) {
```

Remove `setForceLocalFallback`.

- [x] **Step 5: Run storage tests**

Run: `node --test test/localStorageMode.test.js`

Expected: PASS, 4 tests passing.

- [ ] **Step 6: Commit storage mode change**

```bash
git add test/localStorageMode.test.js lib/localReport/storageMode.js lib/Uploader.js
git commit -m "feat: replace fallback flag with storage mode"
```

## Task 5: Switch Runtime Settings To slashCoded And Remove Cloud Config

**Files:**
- Modify: `lib/core/configuration.js`
- Modify: `lib/Uploader.js`
- Modify: `lib/LocalServer.js`
- Modify: `test/commandSurface.test.js`

- [ ] **Step 1: Add failing runtime namespace test**

Add to `test/commandSurface.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify red**

Run: `node --test test/commandSurface.test.js`

Expected: FAIL because active runtime still reads `codingTracker` and cloud/manual upload fields.

- [ ] **Step 3: Update `lib/core/configuration.js`**

Use `ext.getConfig('slashCoded')`. Remove upload-token migration, `connectionMode`, `computerId`, `moreThinkingTime`, proxy, and force fallback reads.

The effective runtime values should be:

```js
const extensionCfg = ext.getConfig('slashCoded');
const storageMode = extensionCfg.get('storageMode') === 'standalone' ? 'standalone' : 'auto';
const enableStatusBar = extensionCfg.get('showStatus');
const configuredServer = `http://127.0.0.1:${process.env.SLASHCODED_DESKTOP_PORT || 5292}/`;

state.trackTerminal = extensionCfg.get('shouldTrackTerminal') !== false;
state.trackAIChat = extensionCfg.get('shouldTrackAIChat') !== false;

const afkEnabled = extensionCfg.get('afkEnabled') !== false;
```

Set the uploader with no manual token or proxy:

```js
uploader.set(configuredServer, '', undefined);
try { uploader.setStorageMode(storageMode); } catch (e) { log.debug('Failed to set storageMode on uploader', e); }
```

Do not call `uploadObject.init(computerId || ...)`; either call `uploadObject.init()` or remove the dependency if Task 6 removes `pcid`.

- [ ] **Step 4: Remove cloud config reads in `lib/Uploader.js`**

Remove reads of:

```js
cfg.get('functionKey')
cfg.get('overrideOrigin')
connectionMode === 'cloud'
CLOUD_ENDPOINT_CANDIDATES
setConnectionMode
```

Keep Desktop upload endpoint candidates only:

```js
const ENDPOINT_CANDIDATES = ['api/upload', 'api/queue/upload'];
let endpointCandidates = ENDPOINT_CANDIDATES.slice();
```

Use Desktop local API as the only active mode.

- [ ] **Step 5: Update `lib/LocalServer.js` config reads**

Replace `ext.getConfig('codingTracker')` with `ext.getConfig('slashCoded')`. Remove reliance on `uploadToken`, `serverURL`, and `localServerMode` for active built-in dashboard behavior. Keep the built-in report URL fallback:

```js
return `http://127.0.0.1:${DEFAULT_PORT}/report/`;
```

If legacy external server functions remain temporarily, do not expose settings for them and do not auto-start them from config.

- [ ] **Step 6: Run runtime namespace tests**

Run: `node --test test/commandSurface.test.js`

Expected: PASS for runtime namespace test and public manifest tests.

- [ ] **Step 7: Commit runtime settings cleanup**

```bash
git add lib/core/configuration.js lib/Uploader.js lib/LocalServer.js test/commandSurface.test.js
git commit -m "feat: read slashcoded settings at runtime"
```

## Task 6: Remove pcid From Desktop Payloads

**Files:**
- Modify: `test/desktopEventMapper.test.js`
- Modify: `lib/core/desktopEventMapper.js`
- Modify: `lib/UploadObject.js`
- Modify: `lib/core/configuration.js`

- [ ] **Step 1: Add failing mapper assertion**

In `test/desktopEventMapper.test.js`, add:

```js
test('mapToDesktopEvent ignores pcid and omits it from desktop payload', () => {
    const event = mapToDesktopEvent({
        type: 'code',
        time: Date.UTC(2026, 3, 14, 9, 0, 0),
        long: 60000,
        pcid: 'legacy-machine',
        file: 'src/app.js',
        vcs_repo: 'owner/repo',
        vcs_branch: 'main'
    }, {
        segmentDurationSeconds: 15,
        idleThresholdSeconds: 300,
        configVersion: 'test-config'
    });

    assert.equal(event.project, 'vscode-local');
    assert.equal(Object.prototype.hasOwnProperty.call(event.payload, 'pcid'), false);
});
```

- [ ] **Step 2: Run test to verify red**

Run: `node --test test/desktopEventMapper.test.js`

Expected: FAIL because `project` still falls back to `src.pcid`.

- [ ] **Step 3: Update mapper**

In `lib/core/desktopEventMapper.js`, replace:

```js
const project = (src && (src.proj || src.pcid)) || 'vscode-local';
```

with:

```js
const project = (src && src.proj) || 'vscode-local';
```

- [ ] **Step 4: Remove upload object pcid initialization**

In `lib/UploadObject.js`, remove the `computerId` parameter and the assignment to `baseUploadObject.pcid`. Keep other base fields intact.

Use this signature:

```js
function init() {
    return baseUploadObject;
}
```

Update callers in `lib/core/configuration.js` to:

```js
uploadObject.init();
```

- [ ] **Step 5: Run mapper tests**

Run: `node --test test/desktopEventMapper.test.js`

Expected: PASS.

- [ ] **Step 6: Commit payload cleanup**

```bash
git add test/desktopEventMapper.test.js lib/core/desktopEventMapper.js lib/UploadObject.js lib/core/configuration.js
git commit -m "fix: remove legacy pcid from desktop events"
```

## Task 7: Update README, Changelog, And Version

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `test/commandSurface.test.js`

- [ ] **Step 1: Add version test**

Add to `test/commandSurface.test.js`:

```js
test('package files carry the first public settings surface version', () => {
    const pkg = readJson('package.json');
    const lock = readJson('package-lock.json');

    assert.equal(pkg.version, '0.11.0');
    assert.equal(lock.version, '0.11.0');
    assert.equal(lock.packages[''].version, '0.11.0');
});
```

- [ ] **Step 2: Run test to verify red**

Run: `node --test test/commandSurface.test.js`

Expected: FAIL because package files still use `0.10.4`.

- [ ] **Step 3: Update README settings section**

Replace the `## Configuration` list with:

```md
## Configuration

Settings (Preferences -> Settings -> SlashCoded):

- `slashCoded.storageMode`: `auto` uses SlashCoded Desktop when detected and local history otherwise; `standalone` always uses the built-in local dashboard
- `slashCoded.showStatus`: show or hide the status bar item
- `slashCoded.shouldTrackTerminal`: include terminal activity
- `slashCoded.shouldTrackAIChat`: include AI chat activity
- `slashCoded.afkEnabled`: pause or classify tracking when VS Code is idle
- `slashCoded.uploadTimeoutMs`: local Desktop API upload timeout in milliseconds
- `slashCoded.desktopDiscoveryTimeoutMs`: local Desktop discovery timeout in milliseconds
```

Remove the Highlights bullet `Proxy and timeout configuration for uploads` and replace it with:

```md
- Desktop discovery, standalone local storage, and upload timeout controls
```

- [ ] **Step 4: Add changelog entry**

At the top of `CHANGELOG.md`, add:

```md
## 0.11.0

- Renamed the public settings and command IDs from `codingTracker.*` to `slashCoded.*` for the first public release.
- Removed cloud-era settings for upload tokens, server URLs, proxy overrides, Azure function keys, manual origins, computer IDs, AFK timeout minutes, and legacy thinking-time tuning.
- Added `slashCoded.storageMode` with `auto` and `standalone` modes.
- Removed legacy `pcid` from desktop event payload mapping.
```

- [ ] **Step 5: Bump version**

Change `package.json`:

```json
"version": "0.11.0"
```

Change the root entries in `package-lock.json`:

```json
"version": "0.11.0"
```

and:

```json
"packages": {
    "": {
        "version": "0.11.0"
    }
}
```

- [ ] **Step 6: Run docs/version tests**

Run: `node --test test/commandSurface.test.js`

Expected: PASS.

- [ ] **Step 7: Commit docs and version bump**

```bash
git add README.md CHANGELOG.md package.json package-lock.json test/commandSurface.test.js
git commit -m "docs: document slashcoded settings surface"
```

## Task 8: Final Verification, Bundle, And Package

**Files:**
- Generated/modify: `dist/extension.js`
- Generated/modify: `dist/package.contributes.json`
- Generated: `SlashCoded-VSCode-Extension.0.11.0.vsix`

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test test/commandSurface.test.js test/localStorageMode.test.js test/desktopEventMapper.test.js
```

Expected: PASS, all tests passing.

- [ ] **Step 2: Run full Node test suite**

Run:

```bash
npm run test:node
```

Expected: PASS, all Node tests passing.

- [ ] **Step 3: Bundle**

Run:

```bash
npm run bundle
```

Expected: exit code 0 and updated `dist/extension.js` plus `dist/package.contributes.json`.

- [ ] **Step 4: Package**

Run:

```bash
npm run package
```

Expected: exit code 0 and output:

```text
Packaged: SlashCoded-VSCode-Extension.0.11.0.vsix
```

- [ ] **Step 5: Inspect generated contribution bundle**

Run:

```bash
node -e "const p=require('./dist/package.contributes.json'); console.log(Object.keys(p.configuration.properties)); console.log(p.commands.map(c=>c.command));"
```

Expected output includes only:

```text
[
  'slashCoded.showStatus',
  'slashCoded.shouldTrackTerminal',
  'slashCoded.shouldTrackAIChat',
  'slashCoded.afkEnabled',
  'slashCoded.uploadTimeoutMs',
  'slashCoded.desktopDiscoveryTimeoutMs',
  'slashCoded.storageMode'
]
[
  'slashCoded.showLocalReport',
  'slashCoded.showSyncStatus',
  'slashCoded.queueLocalHistoryForDesktop',
  'slashCoded.showOutput'
]
```

- [ ] **Step 6: Commit generated bundle**

```bash
git add dist/extension.js dist/package.contributes.json SlashCoded-VSCode-Extension.0.11.0.vsix
git commit -m "chore: package slashcoded settings surface"
```

## Self-Review

- Spec coverage: public settings namespace, command namespace, no cloud mode, no `computerId`, no `pcid`, docs/localization cleanup, version bump, bundle/package verification are covered by Tasks 1-8.
- Placeholder scan: no task contains placeholder markers or vague implementation instructions.
- Type consistency: `storageMode` is consistently `auto | standalone`; command IDs use `slashCoded.*`; settings use `slashCoded.*`; version target is consistently `0.11.0`.
