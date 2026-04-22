# SlashCoded Command Surface Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the extension’s visible command surface from `CodingTracker` to `SlashCoded`, remove non-product commands from the active command set, and align user-facing copy/docs with the reduced command palette.

**Architecture:** Keep internal command IDs as `codingTracker.*` for compatibility, but reduce the registered and contributed user-facing commands to the approved `SlashCoded:` set. Remove dead standalone command handlers that are no longer exposed, keep equivalent maintenance actions inside `Show Sync Status`, and sweep user-visible strings so the extension presents one consistent product name.

**Tech Stack:** VS Code extension CommonJS modules, `package.json` command contributions, Node test runner, esbuild bundle.

---

## File Structure

**Primary files to modify**
- `package.json`
  - Owns the contributed command palette surface and visible command labels/categories.
- `lib/LocalServer.js`
  - Registers report/server commands and contains report/local-server user-facing toasts and errors.
- `lib/extensionMain.js`
  - Registers sync/auth/upload/output commands and owns the sync status quick pick plus related user-facing messages.
- `lib/tracking/afkMonitor.js`
  - Registers AFK commands that should be removed from the live command set.
- `lib/commands/auth.js`
  - Contains legacy auth prompt/success/error copy that still says `CodingTracker`.
- `lib/Uploader.js`
  - Contains queue/token warning messages still exposed to users.
- `lib/core/configuration.js`
  - Contains secure-storage migration toast text still exposed to users.
- `README.md`
  - Documents commands and user workflows. Needs to describe only the retained `SlashCoded:` commands.
- `CHANGELOG.md`
  - Recent entries still refer to removed `CodingTracker:` command names.

**Tests / verification targets**
- `test/staticWebServer.test.js`
  - Existing UI/server test surface; extend only if needed for command-facing local report behavior.
- `test/localReportAggregator.test.js`
  - Existing report payload tests; touch only if report command naming changes affect expectations.
- New targeted command-registration test file if needed:
  - `test/commandSurface.test.js`
  - Prefer a focused unit around contributed command metadata or command registration extraction rather than broad integration.

**Do not expand scope**
- Do not rename internal command IDs like `codingTracker.showLocalReport`.
- Do not redesign the report UI or sync behavior in this plan.
- Do not remove the sync-status quick-pick internal actions unless they become unreachable.

---

### Task 1: Lock The Final Visible Command Surface

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Test: `test/commandSurface.test.js`

- [x] **Step 1: Write the failing test for the contributed command list**

Create `test/commandSurface.test.js` with a focused assertion that the contributed commands include only:

```js
const expected = [
  'codingTracker.showLocalReport',
  'codingTracker.showSyncStatus',
  'codingTracker.queueLocalHistoryForDesktop',
  'codingTracker.showOutput'
];
```

Also assert their visible labels begin with `SlashCoded:`.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/commandSurface.test.js`
Expected: FAIL because the test does not exist yet or current metadata does not fully match the final expected set.

- [x] **Step 3: Implement the minimal metadata cleanup**

Update `package.json` so the only contributed commands are:

```json
{
  "command": "codingTracker.showLocalReport",
  "title": "SlashCoded: Show Local Report",
  "category": "SlashCoded"
}
```

```json
{
  "command": "codingTracker.showSyncStatus",
  "title": "SlashCoded: Show Sync Status",
  "category": "SlashCoded"
}
```

```json
{
  "command": "codingTracker.queueLocalHistoryForDesktop",
  "title": "SlashCoded: Import Local History into Desktop",
  "category": "SlashCoded"
}
```

```json
{
  "command": "codingTracker.showOutput",
  "title": "SlashCoded: Show Output Channel",
  "category": "SlashCoded"
}
```

Update the README command overview to match this exact visible set.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/commandSurface.test.js`
Expected: PASS

- [x] **Step 5: Commit the task-specific changes**

If these files only contain task-owned changes:

```bash
git add package.json README.md test/commandSurface.test.js
git commit -m "test: lock slashcoded command surface"
```

If `README.md` already contains unrelated edits, stage only this task’s hunks:

```bash
git add package.json test/commandSurface.test.js
git add -p README.md
git commit -m "test: lock slashcoded command surface"
```

### Task 2: Remove Registrations For Dead Standalone Commands

**Files:**
- Modify: `lib/LocalServer.js`
- Modify: `lib/extensionMain.js`
- Modify: `lib/tracking/afkMonitor.js`
- Test: `test/commandSurface.test.js`

- [x] **Step 1: Extend the failing test to assert removed commands are not registered**

Add expectations that these standalone commands are no longer registered during activation logic review:

```js
[
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
]
```

Structure the test around source inspection or an extracted pure helper if needed; do not build a heavyweight VS Code integration harness.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/commandSurface.test.js`
Expected: FAIL because those commands are still registered in code.

- [x] **Step 3: Remove dead standalone registrations while keeping needed behavior**

In `lib/LocalServer.js`:
- Remove registration of:
  - `codingTracker.showReport`
  - `codingTracker.startLocalServer`
  - `codingTracker.stopLocalServer`
- Keep `codingTracker.showLocalReport`
- Keep the internal server start/stop functions if `showLocalReport` still relies on them.

In `lib/extensionMain.js`:
- Keep registrations for:
  - `codingTracker.showSyncStatus`
  - `codingTracker.queueLocalHistoryForDesktop`
  - `codingTracker.showOutput`
- Remove standalone registrations for:
  - `codingTracker.rediscoverDesktop`
  - `codingTracker.githubAuth`
  - `codingTracker.setUploadToken`
  - `codingTracker.flushUploads`
- Keep the corresponding helper logic reachable from `showSyncStatus` where still useful.

In `lib/tracking/afkMonitor.js`:
- Remove registration of the three AFK commands entirely.
- Keep AFK config application behavior, since the setting still exists.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/commandSurface.test.js`
Expected: PASS

- [x] **Step 5: Commit the task-specific changes**

```bash
git add lib/LocalServer.js lib/extensionMain.js lib/tracking/afkMonitor.js test/commandSurface.test.js
git commit -m "refactor: remove dead standalone slashcoded commands"
```

If any file contains unrelated changes:

```bash
git add test/commandSurface.test.js
git add -p lib/LocalServer.js
git add -p lib/extensionMain.js
git add -p lib/tracking/afkMonitor.js
git commit -m "refactor: remove dead standalone slashcoded commands"
```

### Task 3: Rename User-Facing Runtime Copy To SlashCoded

**Files:**
- Modify: `lib/LocalServer.js`
- Modify: `lib/extensionMain.js`
- Modify: `lib/commands/auth.js`
- Modify: `lib/Uploader.js`
- Modify: `lib/core/configuration.js`
- Modify: `lib/tracking/afkMonitor.js`
- Test: `test/commandSurface.test.js`

- [x] **Step 1: Add a failing copy-safety test**

Extend `test/commandSurface.test.js` with focused text checks for user-facing strings that must now use `SlashCoded`, for example:

```js
assert.equal(source.includes('CodingTracker:'), false);
```

Do this narrowly for the active runtime files above, not for legacy files such as `lib/extensionLegacy.js`.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/commandSurface.test.js`
Expected: FAIL because active runtime modules still contain `CodingTracker:` strings.

- [x] **Step 3: Replace visible runtime copy**

Update active user-facing prompts/toasts/errors such as:

```js
'SlashCoded: queued 3 local events for Desktop ingestion.'
```

```js
'SlashCoded: Desktop re-discovery triggered.'
```

```js
'SlashCoded: local server stopped!'
```

```js
'Paste your SlashCoded refresh token (from browser after GitHub auth)'
```

Keep internal config keys like `codingTracker.uploadToken` unchanged.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/commandSurface.test.js`
Expected: PASS

- [x] **Step 5: Commit the task-specific changes**

```bash
git add lib/LocalServer.js lib/extensionMain.js lib/commands/auth.js lib/Uploader.js lib/core/configuration.js lib/tracking/afkMonitor.js test/commandSurface.test.js
git commit -m "refactor: rename runtime copy to slashcoded"
```

If any modified file has unrelated edits:

```bash
git add test/commandSurface.test.js
git add -p lib/LocalServer.js
git add -p lib/extensionMain.js
git add -p lib/commands/auth.js
git add -p lib/Uploader.js
git add -p lib/core/configuration.js
git add -p lib/tracking/afkMonitor.js
git commit -m "refactor: rename runtime copy to slashcoded"
```

### Task 4: Simplify Sync Status Copy Around The Retained Workflows

**Files:**
- Modify: `lib/extensionMain.js`
- Modify: `README.md`
- Test: `test/commandSurface.test.js`

- [x] **Step 1: Add a failing test for sync-status option text**

Assert that the sync-status quick pick keeps only the retained user workflow language:

```js
[
  'Queue local history for Desktop ingestion',
  'Force upload queued events now',
  'Re-discover Desktop App'
]
```

and that there are no references to removed command names in the user documentation.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/commandSurface.test.js`
Expected: FAIL if README or sync-status text still references removed command labels.

- [x] **Step 3: Rewrite documentation and in-app wording around the reduced surface**

In `README.md`:
- Replace references to removed commands like:
  - `CodingTracker: Show Report`
  - `CodingTracker: Start Local Server`
  - `CodingTracker: Flush Upload Queue`
  - `CodingTracker: Set Upload Token`
  - `CodingTracker: Re-discover Desktop App`
- Document the new preferred flow:
  - `SlashCoded: Show Local Report`
  - `SlashCoded: Show Sync Status`
  - `SlashCoded: Import Local History into Desktop`
  - `SlashCoded: Show Output Channel`

In `lib/extensionMain.js`:
- Keep internal maintenance actions inside sync status.
- Ensure the quick-pick title/labels use `SlashCoded` voice where appropriate.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/commandSurface.test.js`
Expected: PASS

- [ ] **Step 5: Commit the task-specific changes**

```bash
git add lib/extensionMain.js README.md test/commandSurface.test.js
git commit -m "docs: align slashcoded sync workflows"
```

If `README.md` has unrelated edits:

```bash
git add lib/extensionMain.js test/commandSurface.test.js
git add -p README.md
git commit -m "docs: align slashcoded sync workflows"
```

### Task 5: Update Changelog And Extension Metadata

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Test: `test/commandSurface.test.js`

- [ ] **Step 1: Add a failing metadata/docs test**

Add assertions that:
- `package.json` contributed command categories use `SlashCoded`
- `CHANGELOG.md` no longer documents removed command names as current commands

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/commandSurface.test.js`
Expected: FAIL because changelog and metadata still mention old command branding.

- [ ] **Step 3: Update metadata and release notes**

In `package.json`:
- Keep the reduced command set.
- Update stale description text if it still advertises removed commands like start/stop local server or set upload token.

In `CHANGELOG.md`:
- Rewrite recent entries so they mention the current `SlashCoded:` names and reduced command surface.
- Avoid implying removed commands are still part of the supported UX.

- [ ] **Step 4: Run tests and bundle verification**

Run: `node --test test/commandSurface.test.js test/staticWebServer.test.js test/localReportAggregator.test.js`
Expected: PASS

Run: `npm run bundle`
Expected: PASS with updated `dist/extension.js`

- [ ] **Step 5: Commit the task-specific changes**

```bash
git add package.json CHANGELOG.md test/commandSurface.test.js
git commit -m "docs: finalize slashcoded command cleanup"
```

If `CHANGELOG.md` has unrelated edits:

```bash
git add package.json test/commandSurface.test.js
git add -p CHANGELOG.md
git commit -m "docs: finalize slashcoded command cleanup"
```

### Task 6: Final Verification And Cleanup Pass

**Files:**
- Review: `package.json`
- Review: `lib/LocalServer.js`
- Review: `lib/extensionMain.js`
- Review: `lib/tracking/afkMonitor.js`
- Review: `lib/commands/auth.js`
- Review: `lib/Uploader.js`
- Review: `lib/core/configuration.js`
- Review: `README.md`
- Review: `CHANGELOG.md`
- Review: `test/commandSurface.test.js`

- [ ] **Step 1: Run the focused test suite**

Run: `node --test test/commandSurface.test.js test/staticWebServer.test.js test/localReportAggregator.test.js`
Expected: PASS

- [ ] **Step 2: Run the broader node test suite**

Run: `npm run test:node`
Expected: PASS

- [ ] **Step 3: Run bundle verification**

Run: `npm run bundle`
Expected: PASS

- [ ] **Step 4: Manually inspect the final command palette expectations**

Check in the Extension Development Host that only these commands are visible:

```text
SlashCoded: Show Local Report
SlashCoded: Show Sync Status
SlashCoded: Import Local History into Desktop
SlashCoded: Show Output Channel
```

Also verify that removed commands such as `CodingTracker: AFK Toggle` and `CodingTracker: Set Upload Token` no longer appear.

- [ ] **Step 5: Commit any final verification-only doc/test tweaks**

If no further file changes were needed, skip committing.

If a final small tweak was required:

```bash
git add <exact-paths>
git commit -m "chore: verify slashcoded command surface"
```

---

## Notes For The Worker

- `lib/extensionLegacy.js` still contains old `CodingTracker` strings and dead command references, but this plan intentionally does not clean that file unless it is still used by the bundled extension path. Confirm the active entrypoint remains `lib/extensionMain.js` via the bundle script before expanding scope.
- Removing command contributions alone is not enough. The active command registrations in `lib/LocalServer.js`, `lib/extensionMain.js`, and `lib/tracking/afkMonitor.js` must also be cleaned so the runtime matches the palette.
- Keep the sync-status quick pick as the home for secondary maintenance actions like rediscovery and forced drain. The user asked to remove most commands, not necessarily the underlying maintenance capabilities.
- Because the worktree may already be dirty, do not use `git add .` or `git commit -a`. Stage only the files or hunks owned by each task.
