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

test('history store takeReportEvents returns records and clears the backlog file', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-tracker-history-'));
    const store = createHistoryStore({ storagePath: root });

    await store.appendMany([
        { type: 'open', time: 2000, long: 1000, file: 'src/file.ts', lang: 'typescript' }
    ]);

    const records = await store.takeReportEvents();

    assert.equal(records.length, 1);
    assert.equal(records[0].type, 'open');
    assert.equal(fs.existsSync(store.historyFilePath), false);
});
