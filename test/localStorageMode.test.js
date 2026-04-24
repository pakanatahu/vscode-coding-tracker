const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldQueueLiveEvents } = require('../lib/localReport/storageMode');

test('shouldQueueLiveEvents returns false when desktop mode has no discovery', () => {
    assert.equal(shouldQueueLiveEvents({ connectionMode: 'desktop', discovery: null }), false);
});

test('shouldQueueLiveEvents returns false when forceLocalFallback is enabled', () => {
    assert.equal(shouldQueueLiveEvents({
        connectionMode: 'desktop',
        discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' },
        forceLocalFallback: true
    }), false);
});

test('shouldQueueLiveEvents returns true when desktop mode has discovery', () => {
    assert.equal(shouldQueueLiveEvents({ connectionMode: 'desktop', discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' } }), true);
});

test('shouldQueueLiveEvents returns true when cloud mode is active', () => {
    assert.equal(shouldQueueLiveEvents({ connectionMode: 'cloud', discovery: null }), true);
});
