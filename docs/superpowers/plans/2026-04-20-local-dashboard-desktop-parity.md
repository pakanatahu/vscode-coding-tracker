# Local Dashboard Desktop Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the built-in VS Code fallback report so its desktop-only dashboard and 24h chart feel intentionally aligned with the Slashcoded desktop dashboard, especially the `Last 24 hours` card and its surrounding visual hierarchy.

**Architecture:** Keep the fallback report as a simple static page served by the extension, but stop treating it as a standalone dark “hero report.” Recompose it as a compact desktop analytics surface whose layout, chart framing, controls, and card rhythm borrow directly from Slashcoded’s overview dashboard while remaining powered by the extension’s local JSON summary API.

**Tech Stack:** VS Code extension CommonJS, Node HTTP static server, plain HTML/CSS/JS in `server-app`, Chart.js, Playwright for browser verification, Node test runner.

---

## Reference Surfaces

Use these Slashcoded source files as the primary parity references during implementation:

- `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\area-chart.component.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\chart-theme.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-activity-panels.component.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-header-strip.component.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-project-swimlanes.component.ts`

Use these live surfaces for verification:

- Slashcoded desktop web dashboard: `http://localhost:4200/dashboard`
- Extension fallback report: `http://127.0.0.1:10345/report/`

## File Structure

### Files to modify

- `server-app/index.html`
  - Replace the current stacked “report page” shell with a desktop dashboard shell closer to Slashcoded’s overview card composition.
- `server-app/styles.css`
  - Rebuild the page-level theme, card hierarchy, spacing, chart card treatment, toolbar chips, and CTA styling around Slashcoded desktop conventions.
- `server-app/app.js`
  - Recompose the rendering flow so the 24h chart card, quick stats strip, grouped breakdown panels, and CTA are structured like a small dashboard instead of a generic report.
- `lib/localReport/reportAggregator.js`
  - Rename/reshape the summary payload to support the new desktop-oriented card copy and chart framing without introducing fake data.
- `lib/StaticWebServer.js`
  - Keep serving static assets and vendor Chart.js; touch only if additional static assets or paths are needed.
- `test/localReportAggregator.test.js`
  - Extend summary tests for the renamed chart card metadata and any new summary helpers.
- `test/staticWebServer.test.js`
  - Verify the updated dashboard shell still serves correctly and contains the expected desktop-parity affordances.

### Files to create only if needed

- `server-app/chart24h.js`
  - Create only if `server-app/app.js` becomes too large to reason about cleanly. This file should own the Chart.js options/plugins copied from Slashcoded’s area chart.
- `server-app/dashboardLayout.js`
  - Create only if rendering the dashboard shell in one file becomes too noisy. This file should own DOM template assembly for cards/sections, not chart logic.

### Files to consult but not modify

- `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\area-chart.component.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\chart-theme.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-activity-panels.component.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-header-strip.component.ts`
- `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-project-swimlanes.component.ts`

## Implementation Notes

- This is a desktop-first extension report. Do not spend time optimizing for narrow mobile widths beyond “does not catastrophically break.”
- Parity target is the Slashcoded desktop dashboard’s visual grammar, not exact Angular component reuse.
- Keep the fallback report honest about its data. Do not invent heatmap or week panels if the extension does not have meaningful local inputs for them.
- Use the Slashcoded area chart’s structure and theme logic as the source of truth for:
  - chart padding
  - grid/tick tone
  - stacked area rendering
  - toolbar placement
  - legend/control semantics
- Replace leftover Slashcoded product-specific language where it does not belong in the extension.
- Preserve the local CTA to Slashcoded Desktop, but integrate it as a restrained upsell rather than a bolted-on footer ad.

---

### Task 1: Lock the Desktop-Parity Acceptance Criteria

**Files:**
- Modify: `docs/superpowers/plans/2026-04-20-local-dashboard-desktop-parity.md`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-activity-panels.component.ts`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\area-chart.component.ts`

- Desktop layout uses a compact dashboard shell instead of a single oversized hero report.
- The 24h card title, chart spacing, axis tone, and breakdown toolbar are visibly patterned after Slashcoded's `Last 24 hours` card.
- Top legend pills are removed; the breakdown control lives in the chart footer like Slashcoded.
- Chart chrome is reduced: no floating `H` badge, no oversized hero subtitle treatment, no gratuitous ornament.
- Quick stats are compact and aligned with the chart instead of rendered as oversized tiles.
- Repository/branch/extension sections are visually secondary to the chart and summary strip.
- CTA remains present but reads like a subtle upgrade path, not a banner ad.

- [x] **Step 1: Write the acceptance checklist into the plan before implementation starts**

Add this checklist under this task in the plan document:

```md
- Desktop layout uses a compact dashboard shell instead of a single oversized hero report.
- The 24h card title, chart spacing, axis tone, and breakdown toolbar are visibly patterned after Slashcoded's `Last 24 hours` card.
- Top legend pills are removed; the breakdown control lives in the chart footer like Slashcoded.
- Chart chrome is reduced: no floating `H` badge, no oversized hero subtitle treatment, no gratuitous ornament.
- Quick stats are compact and aligned with the chart instead of rendered as oversized tiles.
- Repository/branch/extension sections are visually secondary to the chart and summary strip.
- CTA remains present but reads like a subtle upgrade path, not a banner ad.
```

- [x] **Step 2: Verify the plan now contains explicit desktop acceptance criteria**

Run: `rg -n "Desktop layout uses a compact dashboard shell|Top legend pills are removed" docs/superpowers/plans/2026-04-20-local-dashboard-desktop-parity.md`

Expected: two matches in this plan file

- [x] **Step 3: Commit the task-specific changes**

```bash
git add docs/superpowers/plans/2026-04-20-local-dashboard-desktop-parity.md
git commit -m "docs: lock desktop parity acceptance criteria"
```

### Task 2: Add Failing Summary Tests for the New Card Metadata

**Files:**
- Modify: `lib/localReport/reportAggregator.js`
- Test: `test/localReportAggregator.test.js`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-activity-panels.component.ts`

- [x] **Step 1: Write the failing summary test for the new desktop-parity chart metadata**

Add a focused test like this to `test/localReportAggregator.test.js`:

```js
test('buildReportSummary exposes desktop-style last 24 hours chart metadata', () => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'open', time: base, long: 30 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'code', time: base, long: 20 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' }
    ]);

    assert.equal(summary.chart24h.title, 'Last 24 hours');
    assert.deepEqual(summary.chart24h.breakdownOptions, ['Activities']);
    assert.equal(summary.chart24h.axisUnit, 'Minutes');
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/localReportAggregator.test.js`

Expected: FAIL because `title`, `breakdownOptions`, or `axisUnit` do not match the new expectations yet

- [x] **Step 3: Implement the minimal summary payload changes**

Update `lib/localReport/reportAggregator.js` so `chart24h` returns desktop-oriented metadata:

```js
return {
    title: 'Last 24 hours',
    breakdownLabel: 'Break down by',
    breakdownOptions: ['Activities'],
    activeBreakdown: 'Activities',
    axisUnit: 'Minutes',
    labels,
    currentTimeLabel,
    maxHours,
    series
};
```

- [x] **Step 4: Run the focused test to verify it passes**

Run: `node --test test/localReportAggregator.test.js`

Expected: PASS

- [x] **Step 5: Commit the task-specific changes**

```bash
git add lib/localReport/reportAggregator.js test/localReportAggregator.test.js
git commit -m "test: lock desktop chart summary metadata"
```

### Task 3: Rebuild the Dashboard Shell Around a Desktop Card Layout

**Files:**
- Modify: `server-app/index.html`
- Modify: `server-app/app.js`
- Modify: `server-app/styles.css`
- Test: `test/staticWebServer.test.js`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-header-strip.component.ts`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-activity-panels.component.ts`

- [x] **Step 1: Write the failing shell test for the desktop dashboard composition**

Add a test like this to `test/staticWebServer.test.js`:

```js
test('report route serves the desktop-style fallback dashboard shell', async () => {
    const staticDir = path.join(__dirname, '..', 'server-app');
    const server = start({ staticDir, port: 0, debugLog: () => {}, getReportSummary: async () => ({ totals: {}, chart24h: {}, byActivity: [] }) });

    try {
        await waitForServer(server);
        const html = await httpGetText(`${server.url}/report/`);
        assert.match(html, /dashboard-shell/);
        assert.match(html, /quick-stats/);
        assert.match(html, /chart24h-card/);
    } finally {
        server.close();
    }
});
```

- [x] **Step 2: Run the focused static server test to verify it fails**

Run: `node --test test/staticWebServer.test.js`

Expected: FAIL because the new shell hooks are not in the HTML yet

- [x] **Step 3: Replace the page shell markup with a dashboard layout**

Change `server-app/index.html` to use sections like:

```html
<main class="dashboard-shell">
  <header class="dashboard-header">...</header>
  <section id="quick-stats" class="panel quick-stats"></section>
  <section id="chart24h" class="panel chart24h-card"></section>
  <section id="secondary-breakdowns" class="secondary-grid">
    <section id="activity-groups" class="panel"></section>
    <section id="repo-groups" class="panel"></section>
    <section id="branch-groups" class="panel"></section>
    <section id="extension-groups" class="panel"></section>
  </section>
  <aside id="desktop-cta" class="panel upgrade-panel"></aside>
</main>
```

- [x] **Step 4: Rewire `server-app/app.js` so it renders the new shell targets**

Update the render flow so:

```js
renderQuickStats(summary.totals || {}, document.querySelector('#quick-stats'));
render24HourChart(summary.chart24h || {});
renderGroup(...document.querySelector('#activity-groups'));
```

and remove the old `#totals`-first report mindset.

- [x] **Step 5: Rebuild `server-app/styles.css` around Slashcoded-like desktop card rules**

Implement tokens and layout rules patterned after Slashcoded:

```css
.dashboard-shell { max-width: 1220px; margin: 0 auto; }
.panel { border-radius: 20px; border: 1px solid hsl(var(--border) / .82); background: hsl(var(--card) / .975); }
.secondary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.quick-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
```

- [x] **Step 6: Run the focused static server test to verify it passes**

Run: `node --test test/staticWebServer.test.js`

Expected: PASS

- [x] **Step 7: Commit the task-specific changes**

```bash
git add server-app/index.html server-app/app.js server-app/styles.css test/staticWebServer.test.js
git commit -m "feat: rebuild fallback dashboard shell for desktop parity"
```

### Task 4: Replace Top Legend Pills With a Slashcoded-Style Breakdown Toolbar

**Files:**
- Modify: `server-app/app.js`
- Modify: `server-app/styles.css`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-activity-panels.component.ts`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\area-chart.component.ts`

- [x] **Step 1: Write the failing UI shell test for the breakdown toolbar**

Add or update a test in `test/staticWebServer.test.js` with:

```js
assert.match(html, /Break down by/);
assert.match(html, /toolbar-chip/);
```

- [x] **Step 2: Run the focused static server test to verify it fails**

Run: `node --test test/staticWebServer.test.js`

Expected: FAIL because the chart footer toolbar is not rendered yet

- [x] **Step 3: Remove the top legend pills from the chart renderer**

Delete the `renderLegendPill()`-driven block from `render24HourChart()` and stop rendering:

```html
<div class="legend-pills">...</div>
```

- [x] **Step 4: Add a footer toolbar that mirrors Slashcoded’s chart controls**

Render this structure at the bottom of the chart card:

```js
<div class="breakdown-toolbar" role="group" aria-label="Break down by">
  <span class="muted small">${escapeHtml(chart.breakdownLabel || 'Break down by')}</span>
  <button type="button" class="toolbar-chip active">Activities</button>
</div>
```

- [x] **Step 5: Style the toolbar chips to match Slashcoded’s desktop treatment**

Add styles like:

```css
.breakdown-toolbar { display:flex; align-items:center; gap:.45rem; justify-content:flex-end; padding-top:.6rem; border-top:1px solid hsl(var(--border) / .28); }
.toolbar-chip { height:30px; padding:0 .72rem; border-radius:999px; border:1px solid hsl(var(--border) / .8); }
.toolbar-chip.active { background:hsl(var(--foreground)); color:hsl(var(--card)); border-color:hsl(var(--foreground)); }
```

- [x] **Step 6: Run the focused static server test to verify it passes**

Run: `node --test test/staticWebServer.test.js`

Expected: PASS

- [x] **Step 7: Commit the task-specific changes**

```bash
git add server-app/app.js server-app/styles.css test/staticWebServer.test.js
git commit -m "feat: add slashcoded-style breakdown toolbar"
```

### Task 5: Tune the Chart Card to Match Slashcoded’s 24h Module

**Files:**
- Modify: `server-app/app.js`
- Modify: `server-app/styles.css`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\area-chart.component.ts`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\shared\charts\chart-theme.ts`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-activity-panels.component.ts`

- [x] **Step 1: Adjust the chart-focused checkpoint to runtime verification**

Static shell assertions are not sufficient for runtime Chart.js chrome. Use a browser verification step instead:

```md
- verify the chart no longer renders top legend pills
- verify the chart no longer renders the floating now badge
- verify the chart no longer renders the corner `H` badge
- verify the x-axis is calmer than the previous rotated-every-hour version
```

- [x] **Step 2: Confirm the old chart chrome was still present before the cleanup**

Run: browser check of `http://127.0.0.1:10345/report/`

Expected: old runtime chart still shows the copied fallback chrome before cleanup

- [x] **Step 3: Remove leftover chart ornament that does not exist in Slashcoded**

Delete these fallback-specific elements from `render24HourChart()` and CSS:

```html
<div class="chart-now-badge">...</div>
<div class="chart-y-axis-title">Hours</div>
<div class="chart-corner-badge">H</div>
```

- [x] **Step 4: Port the Slashcoded area-chart options more faithfully**

Update the Chart.js options in `server-app/app.js` to mirror the referenced shared component:

```js
layout: { padding: { left: 0, right: 0, top: 16, bottom: 12 } },
scales: {
  x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } },
  y: { position: 'right', title: { display: true, text: 'Minutes' } }
}
```

and keep only the plugin behaviors that improve parity:

- stacked contour / top outline
- restrained vertical hover guide
- no decorative “now” badge if Slashcoded does not show it in this surface

- [x] **Step 5: Tone down the chart card’s visual weight**

Adjust `server-app/styles.css` so the chart card behaves like a normal dashboard module:

```css
.chart24h-card { padding: 1rem 1.05rem; border-radius: 20px; }
.chart-header h2 { font-size: 1.5rem; font-weight: 500; }
.chart-canvas-wrap { height: 320px; }
```

- [x] **Step 6: Run the focused checks to verify it passes**

Run:

- `node --test test/staticWebServer.test.js`
- `npm run bundle`
- browser refresh of `http://127.0.0.1:10345/report/`

Expected: tests pass and the chart card renders with reduced chrome

- [x] **Step 7: Commit the task-specific changes**

```bash
git add server-app/app.js server-app/styles.css test/staticWebServer.test.js
git commit -m "feat: tune 24h chart card for slashcoded parity"
```

### Task 6: Compress Quick Stats and Secondary Panels for Desktop Readability

**Files:**
- Modify: `server-app/app.js`
- Modify: `server-app/styles.css`
- Consult: `C:\github\Coding-Tracker-Server\frontend\src\app\features\dashboard\overview\overview-header-strip.component.ts`

- [x] **Step 1: Adjust the quick-stats checkpoint to runtime verification**

Static shell assertions are not enough because the compact quick-stats cards are rendered at runtime. Use browser verification plus the focused static-server test:

```md
- verify the quick-stats strip is denser than the original overview tiles
- verify repository labels are shortened to readable desktop-friendly text
- verify the secondary panels no longer feel oversized relative to their content
```

- [x] **Step 2: Confirm the pre-compression desktop layout was still too loose**

Run: desktop browser check of `http://127.0.0.1:10345/report/`

Expected: quick stats and secondary cards still read too tall and too padded before compression

- [x] **Step 3: Replace the current overview block with a compact quick-stats strip**

Render a structure like:

```js
<div class="panel-head">
  <h3>Quick stats</h3>
</div>
<div class="quick-stats-grid">
  ${renderQuickStat('Activity today', formatDuration(...))}
  ${renderQuickStat('Tracked records', String(...))}
  ${renderQuickStat('Recorded range', shortRangeLabel)}
</div>
```

- [x] **Step 4: Restyle grouped breakdown panels as secondary dashboard modules**

Update the group panels so they use lighter section headings and denser rows:

```css
.panel-head h3 { font-size: 1.1rem; font-weight: 500; }
.group-row { padding: .75rem .85rem; border-radius: 12px; }
.panel-copy { font-size: .82rem; color: hsl(var(--muted-foreground)); }
```

- [x] **Step 5: Run the focused checks to verify it passes**

Run:

- `node --test test/staticWebServer.test.js`
- desktop browser refresh of `http://127.0.0.1:10345/report/`

Expected: tests pass and the desktop layout reads denser and calmer

- [x] **Step 6: Commit the task-specific changes**

```bash
git add server-app/app.js server-app/styles.css test/staticWebServer.test.js
git commit -m "feat: compress quick stats and secondary panels"
```

### Task 7: Integrate the Desktop CTA Without Breaking Dashboard Rhythm

**Files:**
- Modify: `server-app/index.html`
- Modify: `server-app/app.js`
- Modify: `server-app/styles.css`
- Test: `test/staticWebServer.test.js`

- [x] **Step 1: Write the failing shell test for the restrained upgrade panel**

Add assertions like:

```js
assert.match(html, /Want more advanced analytics\?/);
assert.match(html, /upgrade-panel/);
```

- [x] **Step 2: Run the focused static server test to verify it fails**

Run: `node --test test/staticWebServer.test.js`

Expected: FAIL if the CTA still only exists as the old footer block

- [x] **Step 3: Render the CTA as a compact dashboard panel**

Use markup like:

```html
<aside id="desktop-cta" class="panel upgrade-panel">
  <div>
    <div class="eyebrow">Upgrade</div>
    <h3>Want more advanced analytics?</h3>
    <p>Open richer history and deeper breakdowns in Slashcoded Desktop.</p>
  </div>
  <a class="toolbar-chip active upgrade-link" href="https://lundholm.io/project/slashcoded" ...>Get Slashcoded Desktop</a>
</aside>
```

- [x] **Step 4: Restyle the CTA to sit within the same dashboard grammar**

Add styles like:

```css
.upgrade-panel { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
.upgrade-link { text-decoration:none; }
```

- [x] **Step 5: Run the focused static server test to verify it passes**

Run: `node --test test/staticWebServer.test.js`

Expected: PASS

- [x] **Step 6: Commit the task-specific changes**

```bash
git add server-app/index.html server-app/app.js server-app/styles.css test/staticWebServer.test.js
git commit -m "feat: integrate desktop upgrade panel into dashboard"
```

### Task 8: Verify Desktop Parity in Browser and Lock It In

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Verify: `server-app/index.html`
- Verify: `server-app/styles.css`
- Verify: `server-app/app.js`

- [x] **Step 1: Run the Node test suite**

Run: `npm run test:node`

Expected: PASS

- [x] **Step 2: Rebuild the extension bundle**

Run: `npm run bundle`

Expected: PASS with `dist/extension.js` emitted

- [x] **Step 3: Verify the fallback dashboard in a real browser against Slashcoded**

Use Playwright or an equivalent real browser workflow to compare:

- `http://localhost:4200/dashboard`
- `http://127.0.0.1:10345/report/`

Verify all of the following:

- the fallback chart card reads like Slashcoded’s `Last 24 hours` module
- the footer breakdown control visually matches Slashcoded’s toolbar chips
- the chart no longer uses the old top legend pills or decorative `H` badge
- quick stats and group panels read as secondary modules, not hero tiles

- [x] **Step 4: Update docs to describe the desktop-style fallback dashboard**

Add concise notes to `README.md` and `CHANGELOG.md`:

```md
- The built-in local fallback report now uses a desktop-style dashboard layout inspired by Slashcoded's overview surface.
- The 24h chart uses the same Chart.js visual grammar as the shared Slashcoded area chart.
```

- [ ] **Step 5: Commit the verification and docs changes**

If docs are the only files changed by this task:

```bash
git add README.md CHANGELOG.md
git commit -m "docs: describe desktop parity fallback dashboard"
```

If docs plus other task-owned verification follow-ups are needed, stage only those paths or hunks:

```bash
git add README.md CHANGELOG.md
git add -p server-app/app.js
git add -p server-app/styles.css
git commit -m "docs: describe desktop parity fallback dashboard"
```

---

## Testing Checklist

- `node --test test/localReportAggregator.test.js`
- `node --test test/staticWebServer.test.js`
- `npm run test:node`
- `npm run bundle`
- Browser compare:
  - `http://localhost:4200/dashboard`
  - `http://127.0.0.1:10345/report/`

## Risks to Watch

- Over-copying Slashcoded concepts that depend on backend-only data the extension does not have.
- Preserving too much of the current dark “hero report” styling and ending up with a hybrid that still feels off.
- Keeping chart-specific chrome that fights the Slashcoded module structure.
- Turning the CTA back into a banner ad instead of a restrained upgrade panel.
- Letting `server-app/app.js` grow into an unreviewable blob instead of splitting it if needed.

## Execution Notes

- Prefer desktop screenshots for review. Mobile is explicitly low priority for this feature.
- If the worktree is dirty, stage only the task-owned files or hunks with `git add <path>` or `git add -p <path>`.
- Do not use `git add .`.
- Keep commits frequent; every task above ends with a required commit.
