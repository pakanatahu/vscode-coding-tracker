import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
    convertDesktopExportToLocalHistory,
    importDesktopExportToLocalHistory
} from '../scripts/import-test-local-history.mjs';

const janFirst = Date.parse('2026-01-01T10:15:00.000Z');
const janSecond = Date.parse('2026-01-02T12:00:00.000Z');

test('convertDesktopExportToLocalHistory converts Desktop exports into local history events', () => {
    const result = convertDesktopExportToLocalHistory([
        {
            source: 'vscode',
            timeMs: janFirst,
            durationMs: 60000,
            project: 'c:\\github\\slashcoded',
            category: 'reading',
            payload: JSON.stringify({
                lang: 'typescript',
                file: 'src/app.ts',
                vcs_repo: 'slashcoded',
                vcs_branch: 'main',
                type: 'open'
            })
        }
    ], { preserveTime: true });

    assert.deepEqual(result.events, [{
        version: '1.0.0',
        token: '',
        type: 'open',
        time: janFirst,
        long: 60000,
        lang: 'typescript',
        file: 'src/app.ts',
        proj: 'c:\\github\\slashcoded',
        vcs_repo: 'slashcoded',
        vcs_branch: 'main',
        date: '2026-01-01'
    }]);
    assert.equal(result.skipped, 0);
    assert.equal(result.deduped, 0);
});

test('convertDesktopExportToLocalHistory dedupes duplicate Desktop export rows', () => {
    const row = {
        source: 'vscode',
        timeMs: janFirst,
        durationMs: 60000,
        project: 'c:\\github\\slashcoded',
        category: 'terminal',
        payload: JSON.stringify({
            file: '',
            lang: '',
            vcs_repo: 'slashcoded',
            vcs_branch: 'main',
            type: 'terminal'
        })
    };

    const result = convertDesktopExportToLocalHistory([row, { ...row, id: 123 }], { preserveTime: true });

    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].type, 'terminal');
    assert.equal(result.deduped, 1);
});

test('convertDesktopExportToLocalHistory does not cap inflated rows unless screenshot cleanup is enabled', () => {
    const base = Date.parse('2026-01-31T12:00:00.000Z');
    const rows = [
        {
            source: 'vscode',
            timeMs: base,
            durationMs: 60 * 60 * 1000,
            project: 'c:\\github\\slashcoded',
            category: 'terminal',
            payload: JSON.stringify({ type: 'terminal', file: '', lang: '', vcs_repo: 'slashcoded', vcs_branch: 'main' })
        },
        {
            source: 'vscode',
            timeMs: base + 60 * 1000,
            durationMs: 45 * 60 * 1000,
            project: 'c:\\github\\slashcoded',
            category: 'terminal',
            payload: JSON.stringify({ type: 'terminal', file: '', lang: '', vcs_repo: 'slashcoded', vcs_branch: 'main' })
        }
    ];

    const result = convertDesktopExportToLocalHistory(rows, { preserveTime: true });

    assert.equal(result.events.length, 2);
    assert.equal(result.events.reduce((total, event) => total + event.long, 0), 105 * 60 * 1000);
    assert.equal(result.capped, 0);
    assert.equal(result.droppedByCleanup, 0);
});

test('convertDesktopExportToLocalHistory caps screenshot cleanup per activity hour', () => {
    const base = Date.parse('2026-01-31T12:00:00.000Z');
    const rows = [
        {
            source: 'vscode',
            timeMs: base,
            durationMs: 60 * 60 * 1000,
            project: 'c:\\github\\slashcoded',
            category: 'terminal',
            payload: JSON.stringify({ type: 'terminal', file: '', lang: '', vcs_repo: 'slashcoded', vcs_branch: 'main' })
        },
        {
            source: 'vscode',
            timeMs: base + 60 * 1000,
            durationMs: 45 * 60 * 1000,
            project: 'c:\\github\\slashcoded',
            category: 'terminal',
            payload: JSON.stringify({ type: 'terminal', file: '', lang: '', vcs_repo: 'slashcoded', vcs_branch: 'main' })
        }
    ];

    const result = convertDesktopExportToLocalHistory(rows, {
        preserveTime: true,
        screenshotCleanup: true
    });

    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].long, 60 * 60 * 1000);
    assert.equal(result.capped, 0);
    assert.equal(result.droppedByCleanup, 1);
});

test('convertDesktopExportToLocalHistory shifts historical export data into the requested month', () => {
    const result = convertDesktopExportToLocalHistory([
        {
            source: 'vscode',
            timeMs: janFirst,
            durationMs: 60000,
            category: 'open',
            payload: JSON.stringify({ type: 'open' })
        },
        {
            source: 'vscode',
            timeMs: janSecond,
            durationMs: 60000,
            category: 'code',
            payload: JSON.stringify({ type: 'code' })
        }
    ], {
        now: new Date('2026-04-25T09:00:00.000Z')
    });

    assert.equal(new Date(result.events[0].time).getUTCFullYear(), 2026);
    assert.equal(new Date(result.events[0].time).getUTCMonth(), 3);
    assert.equal(new Date(result.events[0].time).getUTCDate(), 24);
    assert.equal(new Date(result.events[1].time).getUTCDate(), 25);
    assert.equal(result.events[0].date, '2026-04-24');
    assert.equal(result.events[1].date, '2026-04-25');
});

test('importDesktopExportToLocalHistory writes only the local history jsonl file', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slashcoded-import-local-history-'));
    const inputFile = path.join(root, 'export.json');
    const outputStorage = path.join(root, 'globalStorage');
    fs.writeFileSync(inputFile, JSON.stringify([
        {
            source: 'vscode',
            timeMs: janFirst,
            durationMs: 60000,
            project: 'c:\\github\\slashcoded',
            category: 'chat',
            payload: JSON.stringify({ type: 'chat', file: '', lang: '', vcs_repo: 'slashcoded', vcs_branch: 'main' })
        }
    ]), 'utf8');

    const result = await importDesktopExportToLocalHistory(inputFile, outputStorage, { preserveTime: true });

    assert.equal(result.imported, 1);
    assert.match(result.historyFilePath, /history[\\/]activity\.jsonl$/);
    assert.equal(fs.existsSync(path.join(outputStorage, 'queue.json')), false);
    assert.equal(fs.existsSync(path.join(outputStorage, 'dead-letter.jsonl')), false);

    const lines = fs.readFileSync(result.historyFilePath, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).type, 'chat');
});
