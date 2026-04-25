const test = require('node:test');
const assert = require('node:assert/strict');

const { mapToDesktopEvent } = require('../lib/core/desktopEventMapper');

test('mapToDesktopEvent stamps timing metadata into payload and occurredAt at segment end', () => {
    const event = mapToDesktopEvent({
        type: 'terminal',
        token: 'abc',
        time: Date.UTC(2026, 3, 14, 9, 15, 15),
        long: 15000,
        proj: 'workspace-a',
        file: 'terminal',
        lang: '',
        vcs_repo: 'owner/repo',
        vcs_branch: 'main'
    }, {
        segmentDurationSeconds: 15,
        idleThresholdSeconds: 300,
        configVersion: '2026-04-14T00:00:00.0000000Z'
    });

    assert.equal(event.durationMs, 15000);
    assert.equal(event.durationMinutes, 1);
    assert.equal(event.occurredAt, '2026-04-14T09:15:30.000Z');
    assert.equal(event.payload.segment_start_ts, Date.UTC(2026, 3, 14, 9, 15, 15));
    assert.equal(event.payload.segment_end_ts, Date.UTC(2026, 3, 14, 9, 15, 30));
    assert.equal(event.payload.trackerConfigVersion, '2026-04-14T00:00:00.0000000Z');
    assert.equal(event.payload.segmentDurationSeconds, 15);
    assert.equal(event.payload.idleThresholdSeconds, 300);
});

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
