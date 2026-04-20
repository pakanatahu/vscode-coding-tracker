# Local Fallback Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep tracking and storing VS Code activity locally when Slashcoded Desktop is not installed, and expose a minimal local report UI grouped by activity, repo, branch, and file extension with a clear Desktop download CTA.

**Architecture:** Reuse the extension's existing event generation pipeline, but persist a separate append-only local activity history alongside the upload queue so report data survives queue drains and reconnects. Serve a small browser-based fallback report from the existing built-in `/report` server, backed by a server-side aggregator that reads raw locally stored events and returns grouped summaries instead of introducing a heavy client framework or a second derived storage format.

**Tech Stack:** VS Code extension host (CommonJS/Node), existing local HTTP server utilities, plain HTML/CSS/vanilla JS for the report UI, Node's built-in test runner (`node --test`).

---

### Task 1: Add a durable local activity history store

**Files:**
- Create: `lib/localReport/historyStore.js`
- Modify: `lib/Uploader.js`
- Test: `test/localHistoryStore.test.js`

- [x] **Step 1: Write the failing history store tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHistoryStore } = require('../lib/localReport/historyStore');

test('history store appends normalized events as jsonl records', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-tracker-history-'));
  const store = createHistoryStore({ storagePath: root });

  await store.appendMany([
    { type: 'code', time: 1000, long: 15000, file: 'src/app.ts', lang: 'typescript', vcs_repo: 'repo', vcs_branch: 'main' }
  ]);

  const records = await store.readAll();
  assert.equal(records.length, 1);
  assert.equal(records[0].type, 'code');
  assert.equal(records[0].long, 15000);
});

test('history store tolerates missing file and malformed lines', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-tracker-history-'));
  const historyDir = path.join(root, 'history');
  fs.mkdirSync(historyDir, { recursive: true });
  fs.writeFileSync(path.join(historyDir, 'activity.jsonl'), '{"type":"open"}\nnot-json\n', 'utf8');

  const store = createHistoryStore({ storagePath: root });
  const records = await store.readAll();

  assert.equal(records.length, 1);
  assert.equal(records[0].type, 'open');
});
```

- [x] **Step 2: Run the history store tests to verify they fail**

Run: `node --test test/localHistoryStore.test.js`
Expected: FAIL with `Cannot find module '../lib/localReport/historyStore'`

- [x] **Step 3: Implement the minimal append/read store**

```js
function createHistoryStore({ storagePath }) {
  const historyDir = path.join(storagePath, 'history');
  const historyFilePath = path.join(historyDir, 'activity.jsonl');

  async function appendMany(events) {
    fs.mkdirSync(historyDir, { recursive: true });
    const lines = events.map(event => JSON.stringify(event)).join('\n') + '\n';
    await fs.promises.appendFile(historyFilePath, lines, 'utf8');
  }

  async function readAll() {
    if (!fs.existsSync(historyFilePath)) return [];
    return fs.readFileSync(historyFilePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap(line => {
        try { return [JSON.parse(line)]; } catch { return []; }
      });
  }

  return { appendMany, readAll, historyFilePath };
}
```

- [x] **Step 4: Wire the uploader to persist every queued raw event into history**

```js
historyStore = createHistoryStore({ storagePath: ctx.globalStorageUri.fsPath });

for (const queuedPayload of queuePayloads) {
  await historyStore.appendMany([normalizePayload(queuedPayload)]);
  Q.push({ payload: queuedPayload, createdAt: Date.now(), retryCount: 0, trackingConfig: trackingSnapshot });
}
```

Implementation notes:
- Store history independently from `queue.json`; do not reuse the transport queue as the report source.
- Persist the chunked payloads produced by `expandPayloadsForQueue(...)` so report totals line up with actual upload slices.
- Keep the persisted record close to the existing raw payload shape (`type`, `time`, `long`, `lang`, `file`, `proj`, `vcs_repo`, `vcs_branch`, `date`, optional `command`/`cwd`).
- Log read/write failures to the existing debug log, but do not block tracking if history persistence fails.

- [x] **Step 5: Run the history store tests to verify they pass**

Run: `node --test test/localHistoryStore.test.js`
Expected: PASS

- [ ] **Step 6: Commit the task-specific changes**

If the task only changed files owned by this task:

```bash
git add lib/localReport/historyStore.js lib/Uploader.js test/localHistoryStore.test.js
git commit -m "feat: persist local activity history"
```

If `lib/Uploader.js` also contains unrelated pre-existing edits, stage only this task's hunks:

```bash
git add lib/localReport/historyStore.js test/localHistoryStore.test.js
git add -p lib/Uploader.js
git commit -m "feat: persist local activity history"
```

### Task 2: Build server-side report aggregation from raw history

**Files:**
- Create: `lib/localReport/reportAggregator.js`
- Modify: `lib/localReport/historyStore.js`
- Test: `test/localReportAggregator.test.js`

- [ ] **Step 1: Write the failing aggregation tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReportSummary } = require('../lib/localReport/reportAggregator');

test('buildReportSummary groups totals by activity, repo, branch, and extension', () => {
  const summary = buildReportSummary([
    { type: 'code', long: 1000, file: 'src/app.ts', vcs_repo: 'repo-a', vcs_branch: 'main' },
    { type: 'open', long: 2000, file: 'src/app.ts', vcs_repo: 'repo-a', vcs_branch: 'main' },
    { type: 'terminal', long: 3000, file: '', vcs_repo: 'repo-a', vcs_branch: 'feature/x' },
    { type: 'chat', long: 4000, file: '', vcs_repo: 'repo-b', vcs_branch: 'main' }
  ]);

  assert.deepEqual(summary.byActivity.map(x => [x.key, x.totalMs]), [
    ['chat', 4000],
    ['terminal', 3000],
    ['open', 2000],
    ['code', 1000]
  ]);
  assert.equal(summary.byRepo[0].key, 'repo-a');
  assert.equal(summary.byBranch[0].key, 'main');
  assert.deepEqual(summary.byExtension, [{ key: '.ts', totalMs: 3000 }]);
});

test('buildReportSummary normalizes missing repo, branch, and extension labels', () => {
  const summary = buildReportSummary([
    { type: 'code', long: 500, file: 'README', vcs_repo: '', vcs_branch: '' }
  ]);

  assert.equal(summary.byRepo[0].key, 'No repository');
  assert.equal(summary.byBranch[0].key, 'No branch');
  assert.equal(summary.byExtension[0].key, 'No extension');
});
```

- [ ] **Step 2: Run the aggregation tests to verify they fail**

Run: `node --test test/localReportAggregator.test.js`
Expected: FAIL with `Cannot find module '../lib/localReport/reportAggregator'`

- [ ] **Step 3: Implement the minimal raw-event aggregator**

```js
function buildReportSummary(events) {
  return {
    totals: {
      totalMs: sum(events, event => event.long),
      eventCount: events.length
    },
    byActivity: toGroups(events, event => normalizeActivity(event.type)),
    byRepo: toGroups(events, event => normalizeRepo(event.vcs_repo)),
    byBranch: toGroups(events, event => normalizeBranch(event.vcs_branch)),
    byExtension: toGroups(events.filter(event => includeExtension(event)), event => extractExtension(event.file))
  };
}
```

Implementation notes:
- The file-extension totals should sum durations across all event types that have a file path, not only `code`.
- Treat extensionless files and non-file activities explicitly (`No extension`, `No repository`, `No branch`) so totals are stable and the UI does not need null handling.
- Sort each group descending by `totalMs`, then ascending by `key` for deterministic tests and a stable UI.
- Expose a second helper for date-window filtering if needed by the server, but do not precompute or cache snapshots yet.

- [ ] **Step 4: Add a history-store helper to return already-parsed report events**

```js
async function readReportEvents() {
  const records = await readAll();
  return records.filter(record => Number(record.long) > 0 && Number(record.time) > 0);
}
```

- [ ] **Step 5: Run the aggregation tests to verify they pass**

Run: `node --test test/localReportAggregator.test.js`
Expected: PASS

- [ ] **Step 6: Commit the task-specific changes**

If the task only changed files owned by this task:

```bash
git add lib/localReport/historyStore.js lib/localReport/reportAggregator.js test/localReportAggregator.test.js
git commit -m "feat: add local report aggregation"
```

If `lib/localReport/historyStore.js` contains unrelated pre-existing edits, stage only this task's hunks:

```bash
git add lib/localReport/reportAggregator.js test/localReportAggregator.test.js
git add -p lib/localReport/historyStore.js
git commit -m "feat: add local report aggregation"
```

### Task 3: Expose the fallback report data through the built-in local server

**Files:**
- Modify: `lib/StaticWebServer.js`
- Modify: `lib/LocalServer.js`
- Modify: `lib/core/configuration.js`
- Test: `test/staticWebServer.test.js`

- [ ] **Step 1: Write the failing server tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { start } = require('../lib/StaticWebServer');

test('static server returns local report summary json', async () => {
  const server = start({
    staticDir,
    port: 19456,
    debugLog: () => {},
    getReportSummary: async () => ({ totals: { totalMs: 1234 }, byActivity: [] })
  });

  const body = await httpGetJson('http://127.0.0.1:19456/api/report/summary');
  assert.equal(body.totals.totalMs, 1234);

  server.close();
});
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/staticWebServer.test.js`
Expected: FAIL because `start(...)` does not accept a report-summary provider

- [ ] **Step 3: Extend the static server with report API endpoints**

```js
function start({ staticDir, port, debugLog, getReportSummary }) {
  // ...
  if (p === '/api/report/summary') {
    const summary = await getReportSummary();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(summary));
    return;
  }
}
```

Implementation notes:
- Keep `/`, `/report/`, and `/ajax/kill` behavior intact.
- Add at least one JSON endpoint for the UI: `GET /api/report/summary`.
- Return a compact shape the plain JS UI can render directly:

```json
{
  "totals": { "totalMs": 123456, "eventCount": 42, "rangeStart": 1710000000000, "rangeEnd": 1710009999999 },
  "byActivity": [{ "key": "code", "totalMs": 50000 }],
  "byRepo": [{ "key": "owner/repo", "totalMs": 40000 }],
  "byBranch": [{ "key": "main", "totalMs": 35000 }],
  "byExtension": [{ "key": ".ts", "totalMs": 30000 }],
  "desktop": { "detected": false, "downloadUrl": "https://lundholm.io/project/slashcoded" }
}
```

- [ ] **Step 4: Make `showReport` and the built-in server choose the fallback path when Desktop is unavailable**

```js
async function showReport() {
  const status = uploader.getStatusSnapshot ? uploader.getStatusSnapshot() : null;
  const desktopDetected = !!(status && status.discovery && status.discovery.apiBaseUrl);

  if (desktopDetected) return openExternal(desktopReportUrl);

  ensureBuiltinReportServer();
  return openExternal(`${builtinServer.url}/report/`);
}
```

Implementation notes:
- Stop relying on the stale `codingTracker.serverURL` configuration for the fallback report path; the active runtime already knows whether Desktop has been discovered.
- Prefer the Desktop-hosted report when Desktop is online.
- If Desktop is absent, lazily start the built-in report server and open its `/report/` page.
- Keep the existing `codingTracker.startLocalServer` / `stopLocalServer` commands usable for the fallback report server.

- [ ] **Step 5: Run the server tests to verify they pass**

Run: `node --test test/staticWebServer.test.js`
Expected: PASS

- [ ] **Step 6: Commit the task-specific changes**

If the task only changed files owned by this task:

```bash
git add lib/StaticWebServer.js lib/LocalServer.js lib/core/configuration.js test/staticWebServer.test.js
git commit -m "feat: serve fallback local report api"
```

If `lib/LocalServer.js` or `lib/core/configuration.js` contain unrelated pre-existing edits, stage only this task's hunks:

```bash
git add lib/StaticWebServer.js test/staticWebServer.test.js
git add -p lib/LocalServer.js
git add -p lib/core/configuration.js
git commit -m "feat: serve fallback local report api"
```

### Task 4: Add the minimal browser-based local report UI

**Files:**
- Create: `server-app/index.html`
- Create: `server-app/styles.css`
- Create: `server-app/app.js`
- Modify: `lib/LocalServer.js`
- Test: `test/staticWebServer.test.js`

- [ ] **Step 1: Write the failing UI-serving assertion**

```js
test('report route serves the fallback app shell', async () => {
  const html = await httpGetText('http://127.0.0.1:19456/report/');
  assert.match(html, /Want more advanced analytics\\?/);
  assert.match(html, /by activity/i);
});
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/staticWebServer.test.js`
Expected: FAIL because `server-app/index.html` does not exist yet

- [ ] **Step 3: Implement the minimal report shell**

```html
<main class="report-shell">
  <header class="hero">
    <h1>Local Activity Summary</h1>
    <p>Minimal stats generated from your locally stored VS Code tracking data.</p>
  </header>

  <section id="totals"></section>
  <section id="activity-groups"></section>
  <section id="repo-groups"></section>
  <section id="branch-groups"></section>
  <section id="extension-groups"></section>

  <aside class="desktop-cta">
    <p>Want more advanced analytics? Download Slashcoded Desktop.</p>
    <a href="https://lundholm.io/project/slashcoded" target="_blank" rel="noreferrer">Get Slashcoded Desktop</a>
  </aside>
</main>
```

- [ ] **Step 4: Implement the plain JS renderer**

```js
async function loadSummary() {
  const response = await fetch('/api/report/summary');
  const summary = await response.json();
  renderTotals(summary.totals);
  renderGroup('By activity', summary.byActivity, document.querySelector('#activity-groups'));
  renderGroup('By repository', summary.byRepo, document.querySelector('#repo-groups'));
  renderGroup('By branch', summary.byBranch, document.querySelector('#branch-groups'));
  renderGroup('By file extension', summary.byExtension, document.querySelector('#extension-groups'));
}
```

Implementation notes:
- Keep the UI framework-free and static so it can be served directly from `StaticWebServer`.
- Use one-column stacked sections with simple tables or list rows; do not add filters, charts, routing, or client-side state management.
- Format durations into human-friendly strings (`1h 12m`, `34m`, `12s`) on the client.
- Show an empty state (`No local activity recorded yet.`) when the history file exists but has no valid records.
- The CTA copy should closely match the spec: `Want more advanced analytics? Download Slashcoded Desktop.`

- [ ] **Step 5: Run the updated server tests to verify they pass**

Run: `node --test test/staticWebServer.test.js`
Expected: PASS

- [ ] **Step 6: Commit the task-specific changes**

If the task only changed files owned by this task:

```bash
git add server-app/index.html server-app/styles.css server-app/app.js lib/LocalServer.js test/staticWebServer.test.js
git commit -m "feat: add fallback local report ui"
```

If `lib/LocalServer.js` contains unrelated pre-existing edits, stage only this task's hunks:

```bash
git add server-app/index.html server-app/styles.css server-app/app.js test/staticWebServer.test.js
git add -p lib/LocalServer.js
git commit -m "feat: add fallback local report ui"
```

### Task 5: Document and polish the fallback behavior

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: `package.nls.json`
- Modify: `CHANGELOG.md`
- Test: `test/localHistoryStore.test.js`
- Test: `test/localReportAggregator.test.js`
- Test: `test/staticWebServer.test.js`

- [ ] **Step 1: Write the failing documentation checklist in the plan branch**

Add these doc requirements to the task checklist before editing:

```md
- README explains that tracking still works without Desktop and where the fallback report comes from.
- Command descriptions mention that `Show Report` opens Slashcoded Desktop when available, otherwise the built-in local summary.
- Changelog records the new fallback local analytics/report behavior.
```

- [ ] **Step 2: Update user-facing text and docs**

Required edits:
- `README.md`
  - Update Quick Start and View your report sections.
  - Add one paragraph that local history is stored on the machine even when Desktop is missing.
  - Mention that the fallback report is intentionally minimal and Desktop provides richer analytics.
- `package.json` and `package.nls.json`
  - Adjust the `codingTracker.showReport` title/description text only if needed to reflect the fallback behavior.
  - Do not add new commands unless implementation truly requires them.
- `CHANGELOG.md`
  - Add a release note for local fallback tracking/reporting.

- [ ] **Step 3: Run the focused test suite**

Run: `node --test test/localHistoryStore.test.js test/localReportAggregator.test.js test/staticWebServer.test.js`
Expected: PASS

- [ ] **Step 4: Run the repo test entrypoint**

Run: `npm run test:node`
Expected: PASS with the new tests included alongside the existing suite

- [ ] **Step 5: Commit the task-specific changes**

If the task only changed files owned by this task:

```bash
git add README.md package.json package.nls.json CHANGELOG.md test/localHistoryStore.test.js test/localReportAggregator.test.js test/staticWebServer.test.js
git commit -m "docs: describe fallback local reporting"
```

If one of those files also contains unrelated pre-existing edits, stage only this task's hunks:

```bash
git add README.md package.json package.nls.json CHANGELOG.md
git add -p test/localHistoryStore.test.js
git add -p test/localReportAggregator.test.js
git add -p test/staticWebServer.test.js
git commit -m "docs: describe fallback local reporting"
```

### Task 6: Final verification and packaging confidence

**Files:**
- Verify only: `lib/Uploader.js`
- Verify only: `lib/LocalServer.js`
- Verify only: `lib/StaticWebServer.js`
- Verify only: `server-app/index.html`
- Verify only: `server-app/app.js`

- [ ] **Step 1: Run the full node test suite again**

Run: `npm run test:node`
Expected: PASS

- [ ] **Step 2: Build the extension bundle**

Run: `npm run bundle`
Expected: PASS and regenerated `dist/extension.js` without bundling errors

- [ ] **Step 3: Perform a manual fallback smoke test in VS Code**

Manual verification:
1. Launch the extension without Slashcoded Desktop running.
2. Open/edit files in a repo and in a non-repo folder.
3. Trigger `CodingTracker: Show Report`.
4. Confirm the browser opens the built-in `/report/` UI.
5. Confirm the UI shows sections for activity, repository, branch, and file extension.
6. Confirm the CTA link points to `https://lundholm.io/project/slashcoded`.
7. Start Slashcoded Desktop (if available), trigger `CodingTracker: Show Report` again, and confirm the Desktop-hosted report still wins.

- [ ] **Step 4: Commit the final verification-only follow-up if the build changed generated artifacts**

If bundling regenerated tracked artifacts owned by this work:

```bash
git add dist/extension.js dist/package.contributes.json
git commit -m "build: refresh bundle for fallback local reporting"
```

If generated files contain unrelated pre-existing edits, stage only the task-specific hunks:

```bash
git add -p dist/extension.js
git add -p dist/package.contributes.json
git commit -m "build: refresh bundle for fallback local reporting"
```

## Notes for the Implementer

- Do not introduce a second analytics model or database. The report must be computed from the raw locally stored event records.
- Do not use the upload queue as the report database. Queue semantics are transport-focused and will delete history on successful upload.
- Keep the fallback UI intentionally minimal. The scope is summary tables, not charts, drill-downs, search, or date-range pickers.
- Preserve the current Desktop-first behavior when Desktop is installed and online.
- Prefer small focused helpers in `lib/localReport/` over growing `lib/LocalServer.js` or `lib/Uploader.js` further.

## Review Notes

- `docs/superpowers/plans/` did not exist in this repo, so this plan creates the directory path.
- The writing-plans skill asks for a separate plan-reviewer subagent loop, but this session did not include explicit permission to spawn subagents. Perform a manual review of this plan before execution, or explicitly request subagent-driven review in the next turn.
