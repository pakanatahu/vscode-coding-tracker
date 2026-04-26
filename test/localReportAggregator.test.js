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
        ['AI chat', 4000],
        ['Terminal', 3000],
        ['Reading', 2000],
        ['Coding', 1000]
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

test('buildReportSummary exposes report date metadata from injected now', () => {
    const now = new Date(2026, 0, 31, 23, 0, 0, 0);
    const summary = buildReportSummary([], { now });

    assert.equal(summary.reportDateLabel, 'January 31, 2026');
    assert.equal(summary.reportDate, new Date(2026, 0, 31, 23, 0, 0, 0).getTime());
});

test('buildReportSummary uses display labels for activity groups', () => {
    const summary = buildReportSummary([
        { type: 'open', long: 1000 },
        { type: 'code', long: 2000 },
        { type: 'chat', long: 3000 },
        { type: 'terminal', long: 4000 }
    ]);

    assert.deepEqual(summary.byActivity.map(item => item.key), ['Terminal', 'AI chat', 'Coding', 'Reading']);
});

test('buildReportSummary groups branches with their parent repository', () => {
    const summary = buildReportSummary([
        { type: 'code', long: 1000, vcs_repo: 'repo-a', vcs_branch: 'main' },
        { type: 'code', long: 2000, vcs_repo: 'repo-b', vcs_branch: 'main' },
        { type: 'code', long: 3000, vcs_repo: '', vcs_branch: '' }
    ]);

    assert.deepEqual(summary.byRepoBranch.map(item => [item.key, item.totalMs]), [
        ['No repository / No branch', 3000],
        ['repo-b / main', 2000],
        ['repo-a / main', 1000]
    ]);
});

test('buildReportSummary groups file activity by language and excludes non-language rows', () => {
    const summary = buildReportSummary([
        { type: 'code', long: 1000, lang: 'typescript', file: 'src/app.ts' },
        { type: 'open', long: 2000, lang: '', file: 'README.md' },
        { type: 'chat', long: 3000, lang: '', file: 'session.chat' },
        { type: 'terminal', long: 4000, lang: '', file: '' },
        { type: 'code', long: 5000, lang: '', file: 'server.cs' },
        { type: 'code', long: 6000, lang: '', file: 'src/app.py' },
        { type: 'code', long: 7000, lang: 'plaintext', file: 'debug.log' },
        { type: 'code', long: 8000, lang: '', file: 'package-lock.json' }
    ]);

    assert.deepEqual(summary.byLanguage.map(item => [item.key, item.totalMs]), [
        ['Python', 6000],
        ['C#', 5000],
        ['Markdown', 2000],
        ['TypeScript', 1000]
    ]);
});

test('buildReportSummary produces a 24h chart for VS Code activity groups', () => {
    const now = new Date();
    const currentHour = now.getHours();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, 0, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'open', time: base, long: 30 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'code', time: base, long: 20 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'chat', time: base, long: 15 * 60 * 1000, file: '', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'terminal', time: base, long: 10 * 60 * 1000, file: '', vcs_repo: 'repo', vcs_branch: 'main' }
    ]);

    assert.equal(summary.chart24h.labels.length, 24);
    assert.deepEqual(summary.chart24h.series.map(item => item.label), ['Reading', 'Coding', 'AI chat', 'Terminal']);
    assert.equal(summary.chart24h.series[0].values[currentHour], 30 * 60 * 1000);
    assert.equal(summary.chart24h.series[1].values[currentHour], 20 * 60 * 1000);
    assert.equal(summary.chart24h.series[2].values[currentHour], 15 * 60 * 1000);
    assert.equal(summary.chart24h.series[3].values[currentHour], 10 * 60 * 1000);
    assert.equal(summary.chart24h.maxHours, 1);
});

test('buildReportSummary keeps the 24h chart on the overview minute scale', () => {
    const now = new Date();
    const currentHour = now.getHours();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, 0, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'open', time: base, long: 39 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'code', time: base, long: 20 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'terminal', time: base, long: 9 * 1000, file: '', vcs_repo: 'repo', vcs_branch: 'main' }
    ]);

    assert.equal(summary.chart24h.maxHours, 1);
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

test('buildReportSummary produces a padded current-month chart for VS Code activity groups', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1, 10, 0, 0, 0).getTime();
    const secondDay = new Date(year, month, 2, 11, 0, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'open', time: firstDay, long: 20 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'code', time: firstDay, long: 15 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'chat', time: secondDay, long: 10 * 60 * 1000, file: '', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'terminal', time: secondDay, long: 5 * 60 * 1000, file: '', vcs_repo: 'repo', vcs_branch: 'main' }
    ]);

    assert.equal(summary.chartMonth.title, now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
    assert.equal(summary.chartMonth.labels.length, daysInMonth);
    assert.equal(summary.chartMonth.labels[0], '01');
    assert.equal(summary.chartMonth.labels[daysInMonth - 1], String(daysInMonth).padStart(2, '0'));
    assert.deepEqual(summary.chartMonth.series.map(item => item.label), ['Reading', 'Coding', 'AI chat', 'Terminal']);
    assert.equal(summary.chartMonth.series[0].values[0], 20 * 60 * 1000);
    assert.equal(summary.chartMonth.series[1].values[0], 15 * 60 * 1000);
    assert.equal(summary.chartMonth.series[2].values[1], 10 * 60 * 1000);
    assert.equal(summary.chartMonth.series[3].values[1], 5 * 60 * 1000);
});

test('buildReportSummary splits monthly events across day buckets', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1, 23, 30, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'code', time: start, long: 60 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' }
    ]);

    assert.equal(summary.chartMonth.series[1].label, 'Coding');
    assert.equal(summary.chartMonth.series[1].values[0], 30 * 60 * 1000);
    assert.equal(summary.chartMonth.series[1].values[1], 30 * 60 * 1000);
});

test('buildReportSummary can render screenshot charts as January 31 at 23:00', () => {
    const reportNow = new Date(2026, 0, 31, 23, 0, 0, 0);
    const janFirst = new Date(2026, 0, 1, 10, 0, 0, 0).getTime();
    const janThirtyFirst = new Date(2026, 0, 31, 22, 0, 0, 0).getTime();
    const summary = buildReportSummary([
        { type: 'open', time: janFirst, long: 30 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' },
        { type: 'code', time: janThirtyFirst, long: 45 * 60 * 1000, file: 'a.ts', vcs_repo: 'repo', vcs_branch: 'main' }
    ], { now: reportNow });

    assert.equal(summary.chart24h.currentTimeLabel, '23:00');
    assert.equal(summary.chart24h.rangeStart, new Date(2026, 0, 31, 0, 0, 0, 0).getTime());
    assert.equal(summary.chartMonth.title, 'January 2026');
    assert.equal(summary.chartMonth.labels.length, 31);
    assert.equal(summary.chartMonth.labels[0], '01');
    assert.equal(summary.chartMonth.labels[30], '31');
    assert.equal(summary.chart24h.series[1].values[22], 45 * 60 * 1000);
    assert.equal(summary.chartMonth.series[0].values[0], 30 * 60 * 1000);
    assert.equal(summary.chartMonth.series[1].values[30], 45 * 60 * 1000);
});
