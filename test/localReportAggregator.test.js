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

test('buildReportSummary produces a 24h chart for reading writing and terminal', () => {
    const now = new Date();
    const currentHour = now.getHours();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, 0, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'open', time: base, long: 30 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'code', time: base, long: 20 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'terminal', time: base, long: 10 * 60 * 1000, file: '', vcs_repo: 'repo', vcs_branch: 'main' }
    ]);

    assert.equal(summary.chart24h.labels.length, 24);
    assert.equal(summary.chart24h.series.length, 3);
    assert.equal(summary.chart24h.series[0].label, 'Reading');
    assert.equal(summary.chart24h.series[1].label, 'Writing');
    assert.equal(summary.chart24h.series[2].label, 'Terminal');
    assert.equal(summary.chart24h.series[0].values[currentHour], 30 * 60 * 1000);
    assert.equal(summary.chart24h.series[1].values[currentHour], 20 * 60 * 1000);
    assert.equal(summary.chart24h.series[2].values[currentHour], 10 * 60 * 1000);
    assert.equal(summary.chart24h.maxHours, 1);
});

test('buildReportSummary keeps a small but visible 24h scale for short local sessions', () => {
    const now = new Date();
    const currentHour = now.getHours();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, 0, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'open', time: base, long: 39 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'code', time: base, long: 20 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'terminal', time: base, long: 9 * 1000, file: '', vcs_repo: 'repo', vcs_branch: 'main' }
    ]);

    assert.equal(summary.chart24h.maxHours, 0.25);
});

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
