import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appJs = fs.readFileSync('server-app/app.js', 'utf8');
const indexHtml = fs.readFileSync('server-app/index.html', 'utf8');

test('dashboard renderer defines group row limits for long breakdown lists', () => {
    assert.match(appJs, /const GROUP_LIMITS = /);
    assert.match(appJs, /'By repository': 8/);
    assert.match(appJs, /'By repository branch': 6/);
    assert.match(appJs, /'By language': 8/);
});

test('dashboard renderer includes other summary copy for hidden rows', () => {
    assert.match(appJs, /Other repositories/);
    assert.match(appJs, /Other repository branches/);
    assert.match(appJs, /Other languages/);
});

test('dashboard header includes SlashCoded brand and Desktop link', () => {
    assert.match(indexHtml, /\/assets\/slashcoded\.png/);
    assert.equal(fs.existsSync('server-app/assets/slashcoded.png'), true);
    assert.match(indexHtml, /SLASHCODED \| VSCode Built-In Dashboard/);
    assert.match(indexHtml, /https:\/\/lundholm\.io\/projects\/slashcoded\?ref=vscodeext/);
    assert.match(indexHtml, /Get SlashCoded Desktop/);
});

test('quick stats avoids claiming full-history totals are activity today', () => {
    assert.doesNotMatch(appJs, /Activity today/);
    assert.doesNotMatch(appJs, /Data range/);
    assert.match(appJs, /Tracked time/);
});

test('dashboard renders report date and new group panels', () => {
    assert.match(appJs, /Report date/);
    assert.match(appJs, /summary\.reportDateLabel/);
    assert.match(appJs, /By repository branch/);
    assert.match(appJs, /summary\.byRepoBranch/);
    assert.match(appJs, /By language/);
    assert.match(appJs, /summary\.byLanguage/);
});

test('dashboard does not render inert chart breakdown controls', () => {
    assert.doesNotMatch(appJs, /renderBreakdownToolbar/);
    assert.doesNotMatch(indexHtml, /breakdown-toolbar/);
});

test('dashboard includes persistent light and dark theme controls', () => {
    const styles = fs.readFileSync('server-app/styles.css', 'utf8');
    assert.match(indexHtml, /id="theme-toggle"/);
    assert.match(indexHtml, /aria-pressed="false"/);
    assert.match(appJs, /slashcoded\.localDashboard\.theme/);
    assert.match(appJs, /data-theme/);
    assert.match(appJs, /prefers-color-scheme/);
    assert.match(styles, /\[data-theme="dark"\]/);
    assert.match(styles, /:focus-visible/);
});

test('dashboard rounds visible durations and renders month chart in hours', () => {
    assert.match(appJs, /formatRoundedDuration/);
    assert.match(appJs, /Math\.round\(ms \/ 3600000\)/);
    assert.match(appJs, /unit: 'minutes'/);
    assert.match(appJs, /unit: 'hours'/);
    assert.match(appJs, /formatHourTick/);
    assert.match(appJs, /text: unit === 'hours' \? 'Hours' : 'Minutes'/);
});

test('dashboard tilts and renders every 24h x-axis label', () => {
    assert.match(appJs, /xTickRotation: 50/);
    assert.match(appJs, /const xTickRotation = Number\(config\.xTickRotation\) \|\| 0/);
    assert.match(appJs, /maxRotation: xTickRotation/);
    assert.match(appJs, /minRotation: xTickRotation/);
});

test('dashboard renders group summaries as horizontal bars', () => {
    const styles = fs.readFileSync('server-app/styles.css', 'utf8');
    assert.match(appJs, /group-bar-track/);
    assert.match(appJs, /group-bar-fill/);
    assert.match(appJs, /formatBarDuration/);
    assert.match(styles, /\.group-bar-fill/);
    assert.match(styles, /--bar-track/);
});

test('dashboard dark theme uses desktop-style shell tokens', () => {
    const styles = fs.readFileSync('server-app/styles.css', 'utf8');
    assert.match(styles, /--shell-bg/);
    assert.match(styles, /--panel-bg/);
    assert.match(styles, /#050b18/);
    assert.match(styles, /#07101f/);
});
