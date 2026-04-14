const test = require('node:test');
const assert = require('node:assert/strict');

const {
    DEFAULT_SEGMENT_DURATION_SECONDS,
    DEFAULT_IDLE_THRESHOLD_SECONDS,
    createDefaultTrackingConfig,
    sanitizeTrackingConfig,
    shouldRefreshTrackingConfig
} = require('../lib/core/hostTiming');

test('createDefaultTrackingConfig returns shared startup fallback values', () => {
    const config = createDefaultTrackingConfig();

    assert.equal(config.segmentDurationSeconds, DEFAULT_SEGMENT_DURATION_SECONDS);
    assert.equal(config.idleThresholdSeconds, DEFAULT_IDLE_THRESHOLD_SECONDS);
    assert.equal(config.configVersion, 'startup-default');
    assert.equal(config.source, 'default');
});

test('sanitizeTrackingConfig keeps valid host values and metadata', () => {
    const config = sanitizeTrackingConfig({
        segmentDurationSeconds: 30,
        idleThresholdSeconds: 600,
        configVersion: '2026-04-14T00:00:00.0000000Z',
        updatedAt: '2026-04-14T00:00:00.0000000Z'
    });

    assert.equal(config.segmentDurationSeconds, 30);
    assert.equal(config.idleThresholdSeconds, 600);
    assert.equal(config.configVersion, '2026-04-14T00:00:00.0000000Z');
    assert.equal(config.updatedAt, '2026-04-14T00:00:00.0000000Z');
    assert.equal(config.source, 'host');
});

test('sanitizeTrackingConfig falls back to shared defaults when host payload is invalid', () => {
    const config = sanitizeTrackingConfig({
        segmentDurationSeconds: 0,
        idleThresholdSeconds: -1
    });

    assert.equal(config.segmentDurationSeconds, DEFAULT_SEGMENT_DURATION_SECONDS);
    assert.equal(config.idleThresholdSeconds, DEFAULT_IDLE_THRESHOLD_SECONDS);
    assert.equal(config.source, 'host');
});

test('shouldRefreshTrackingConfig uses five minute refresh cadence', () => {
    const now = Date.UTC(2026, 3, 14, 10, 5, 0);

    assert.equal(shouldRefreshTrackingConfig(0, now), true);
    assert.equal(shouldRefreshTrackingConfig(now - (5 * 60 * 1000) + 1, now), false);
    assert.equal(shouldRefreshTrackingConfig(now - (5 * 60 * 1000), now), true);
});
