const test = require('node:test');
const assert = require('node:assert/strict');

const runtime = require('../lib/core/runtime');
const { createOpenCodeTracker } = require('../lib/tracking/OpenCodeTracker');

function createDocument(path = 'C:\\repo\\file.ts', languageId = 'typescript') {
    return {
        uri: {
            scheme: 'file',
            fsPath: path
        },
        languageId
    };
}

function flushMicrotasks() {
    return new Promise(resolve => setImmediate(resolve));
}

test('open code tracking finalizes the active editor slice when the window loses focus', async () => {
    const state = runtime.createInitialState();
    const uploads = [];
    const generatedOpen = [];
    const modeUpdates = [];
    const doc = createDocument();

    const tracker = createOpenCodeTracker({
        vscode: {},
        ext: {},
        log: { debug() {} },
        isDebugMode: false,
        state,
        uploader: { upload: (payload) => uploads.push(payload) },
        uploadObject: {
            generateOpen: async (_doc, start, duration) => {
                generatedOpen.push({ start, duration });
                return { kind: 'open', start, duration };
            },
            generateCode: async () => {
                throw new Error('generateCode should not run in this test');
            }
        },
        mode: {
            updateModeBasedOnState: () => modeUpdates.push(state.windowFocused),
            refreshStatusBarMode: () => {}
        },
        recordUserActivity: () => {}
    });

    state.activeDocument = doc;
    state.trackData.openTime = 10_000;
    state.trackData.lastIntentlyTime = 20_000;

    tracker.onDidChangeWindowState({ focused: false }, 25_000);
    await flushMicrotasks();

    assert.equal(state.windowFocused, false);
    assert.deepEqual(generatedOpen, [{ start: 10_000, duration: 15_000 }]);
    assert.deepEqual(uploads, [{ kind: 'open', start: 10_000, duration: 15_000 }]);
    assert.equal(state.trackData.openTime, 0);
    assert.equal(state.trackData.lastIntentlyTime, 0);
    assert.deepEqual(modeUpdates, [false]);
});

test('open code tracking starts a fresh slice when focus returns', () => {
    const state = runtime.createInitialState();
    const doc = createDocument();

    const tracker = createOpenCodeTracker({
        vscode: {},
        ext: {},
        log: { debug() {} },
        isDebugMode: false,
        state,
        uploader: { upload() {} },
        uploadObject: {
            generateOpen: async () => null,
            generateCode: async () => null
        },
        mode: {
            updateModeBasedOnState: () => {},
            refreshStatusBarMode: () => {}
        },
        recordUserActivity: () => {}
    });

    state.activeDocument = doc;
    state.windowFocused = false;

    tracker.onDidChangeWindowState({ focused: true }, 40_000);

    assert.equal(state.windowFocused, true);
    assert.equal(state.trackData.openTime, 40_000);
    assert.equal(state.trackData.lastIntentlyTime, 40_000);
    assert.equal(state.trackData.firstCodingTime, 0);
    assert.equal(state.trackData.codingLong, 0);
});

test('open code tick does not emit background segments while the window is unfocused', async () => {
    const state = runtime.createInitialState();
    const uploads = [];
    const doc = createDocument();

    const tracker = createOpenCodeTracker({
        vscode: {},
        ext: {},
        log: { debug() {} },
        isDebugMode: false,
        state,
        uploader: { upload: (payload) => uploads.push(payload) },
        uploadObject: {
            generateOpen: async (_doc, start, duration) => ({ kind: 'open', start, duration }),
            generateCode: async (_doc, start, duration) => ({ kind: 'code', start, duration })
        },
        mode: {
            updateModeBasedOnState: () => {},
            refreshStatusBarMode: () => {}
        },
        recordUserActivity: () => {}
    });

    state.activeDocument = doc;
    state.windowFocused = false;
    state.trackData.openTime = 10_000;
    state.trackData.lastIntentlyTime = 10_000;
    state.trackData.firstCodingTime = 10_000;
    state.trackData.codingLong = 15_000;

    tracker.tick(25_000);
    await flushMicrotasks();

    assert.deepEqual(uploads, []);
    assert.equal(state.trackData.openTime, 10_000);
    assert.equal(state.trackData.firstCodingTime, 10_000);
    assert.equal(state.trackData.codingLong, 15_000);
});
