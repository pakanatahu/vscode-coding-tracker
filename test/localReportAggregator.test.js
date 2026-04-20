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
