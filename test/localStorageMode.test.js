const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldQueueLiveEvents } = require('../lib/localReport/storageMode');

test('shouldQueueLiveEvents returns false in auto mode without desktop discovery', () => {
    assert.equal(shouldQueueLiveEvents({ storageMode: 'auto', discovery: null }), false);
});

test('shouldQueueLiveEvents returns false in standalone mode even with desktop discovery', () => {
    assert.equal(shouldQueueLiveEvents({
        storageMode: 'standalone',
        discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' }
    }), false);
});

test('shouldQueueLiveEvents returns true in auto mode with desktop discovery', () => {
    assert.equal(shouldQueueLiveEvents({
        storageMode: 'auto',
        discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' }
    }), true);
});

test('shouldQueueLiveEvents treats unknown storageMode as auto', () => {
    assert.equal(shouldQueueLiveEvents({
        storageMode: 'unexpected',
        discovery: { apiBaseUrl: 'http://127.0.0.1:5292/' }
    }), true);
});
