"use strict";

const runtime = require('../core/runtime');

function queueUploadPromise(promise, uploader, log, isDebugMode, hint) {
    Promise.resolve(promise).then(obj => {
        if (!obj) return;
        uploader.upload(obj);
    }).catch(err => {
        if (isDebugMode) log && log.debug && log.debug('[open-code-upload] ' + (hint || 'slice') + ' failed', err);
    });
}

function isIgnoreDocument(doc) {
    return !doc || doc.uri.scheme === 'inmemory';
}

function suppressTerminalReentry(state, now) {
    const cooldown = Math.max(0, runtime.TERMINAL_REENTRY_COOLDOWN_MS || 0);
    state.terminalReentrySuppressedUntil = now + cooldown;
}

/** @param {ReturnType<runtime.createInitialState>} state @param {number} now */
function resetTrackOpenAndIntentlyTime(state, now) {
    state.trackData.openTime = now;
    state.trackData.lastIntentlyTime = now;
}

/**
 * Uploading open track data
 * @param {object} deps
 * @param {ReturnType<runtime.createInitialState>} deps.state
 * @param {any} deps.uploader
 * @param {any} deps.uploadObject
 * @param {number} now
 */
function uploadOpenTrackData(deps, now) {
    const { state, uploader, uploadObject, log, isDebugMode } = deps;
    const doc = state.activeDocument;

    if (!doc || isIgnoreDocument(doc)) { resetTrackOpenAndIntentlyTime(state, now); return; }
    if (!state.trackData.openTime || state.trackData.openTime <= 0) { resetTrackOpenAndIntentlyTime(state, now); return; }

    const longest = state.trackData.lastIntentlyTime + runtime.MAX_ALLOW_NOT_INTENTLY_MS + state.moreThinkingTimeMs;
    const duration = Math.min(now, longest) - state.trackData.openTime;
    queueUploadPromise(uploadObject.generateOpen(doc, state.trackData.openTime, duration), uploader, log, isDebugMode, 'open');
    resetTrackOpenAndIntentlyTime(state, now);
}

/**
 * Uploading coding track data and reset coding tracking.
 * @param {object} deps
 * @param {ReturnType<runtime.createInitialState>} deps.state
 * @param {any} deps.uploader
 * @param {any} deps.uploadObject
 */
function uploadCodingTrackData(deps) {
    const { state, uploader, uploadObject, log, isDebugMode } = deps;
    if (state.activeDocument && !isIgnoreDocument(state.activeDocument)) {
        queueUploadPromise(uploadObject.generateCode(state.activeDocument, state.trackData.firstCodingTime, state.trackData.codingLong), uploader, log, isDebugMode, 'code');
    }
    state.trackData.codingLong = 0;
    state.trackData.lastCodingTime = 0;
    state.trackData.firstCodingTime = 0;
}

/** Suspend open/code tracking when entering an exclusive mode (chat/terminal) */
function suspendOpenAndCode(deps, now) {
    const { state } = deps;
    if (state.trackData.openTime && now && state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
        uploadOpenTrackData(deps, now);
    }
    if (state.trackData.codingLong) {
        uploadCodingTrackData(deps);
    }
    state.trackData.openTime = 0;
    state.trackData.lastIntentlyTime = 0;
    state.trackData.firstCodingTime = 0;
    state.trackData.lastCodingTime = 0;
    state.trackData.codingLong = 0;
}

/** Resume open/code tracking after leaving exclusive mode */
function resumeOpenAndCode(state, now) {
    if (!state.activeDocument) return;
    state.trackData.openTime = now;
    state.trackData.lastIntentlyTime = now;
    state.trackData.firstCodingTime = 0;
    state.trackData.codingLong = 0;
    state.trackData.lastCodingTime = 0;
}

/** Pause only the open(watching) tracking by finalizing the current open slice up to now */
function pauseOpenTracking(deps, now) {
    const { state } = deps;
    if (state.trackData.openTime && state.activeDocument) {
        if (state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
            uploadOpenTrackData(deps, now);
        }
        state.trackData.openTime = 0;
        state.trackData.lastIntentlyTime = 0;
    }
}

/**
 * Create editor-related event handlers.
 * This mirrors the legacy EventHandler logic but lives in a dedicated module.
 *
 * @param {object} deps
 * @param {import('vscode')} deps.vscode
 * @param {any} deps.ext
 * @param {any} deps.log
 * @param {boolean} deps.isDebugMode
 * @param {ReturnType<runtime.createInitialState>} deps.state
 * @param {any} deps.uploader
 * @param {any} deps.uploadObject
 * @param {{ updateModeBasedOnState: Function, refreshStatusBarMode: Function }} deps.mode
 * @param {() => void} deps.recordUserActivity
 */
function createOpenCodeTracker(deps) {
    const { vscode, ext, log, isDebugMode, state, mode } = deps;
    const getSegmentDurationMs = () => Math.max(1000, state.segmentDurationMs || (15 * runtime.SECOND));

    /** @param {number} now */
    const flushOpenSegments = (now) => {
        const doc = state.activeDocument;
        if (!doc || isIgnoreDocument(doc) || !state.trackData.openTime) return;
        const segmentDurationMs = getSegmentDurationMs();
        while ((now - state.trackData.openTime) >= segmentDurationMs) {
            queueUploadPromise(deps.uploadObject.generateOpen(doc, state.trackData.openTime, segmentDurationMs), deps.uploader, log, isDebugMode, 'open-segment');
            state.trackData.openTime += segmentDurationMs;
            state.trackData.lastIntentlyTime = Math.max(state.trackData.lastIntentlyTime || 0, state.trackData.openTime);
        }
    };

    const flushCodingSegments = () => {
        const doc = state.activeDocument;
        if (!doc || isIgnoreDocument(doc) || !state.trackData.firstCodingTime || !state.trackData.codingLong) return;
        const segmentDurationMs = getSegmentDurationMs();
        while (state.trackData.codingLong >= segmentDurationMs) {
            queueUploadPromise(deps.uploadObject.generateCode(doc, state.trackData.firstCodingTime, segmentDurationMs), deps.uploader, log, isDebugMode, 'code-segment');
            state.trackData.firstCodingTime += segmentDurationMs;
            state.trackData.codingLong -= segmentDurationMs;
        }
        if (state.trackData.codingLong === 0) {
            state.trackData.firstCodingTime = 0;
        }
    };

    /** @param {vscode.TextEditor} textEditor */
    const onIntentlyWatchingCodes = (textEditor) => {
        deps.recordUserActivity();

        const now = Date.now();
        if (!state.isAFK && state.exclusiveMode === 'terminal') {
            try {
                if (state.activeTerminal && state.terminalOpenTime) {
                    const duration = now - state.terminalOpenTime;
                    if (duration > 0) queueUploadPromise(deps.uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, duration), deps.uploader, log, isDebugMode, 'terminal-intent');
                }
            } catch (_) { /* ignore */ }
            state.activeTerminal = null;
            state.terminalOpenTime = 0;
            state.exclusiveMode = null;
            state.terminalExclusiveActive = false;
            resumeOpenAndCode(state, now);
            mode.updateModeBasedOnState();
            suppressTerminalReentry(state, now);
        } else if (!state.isAFK && state.exclusiveMode === 'chat') {
            try { state.chat.pauseAll(now); } catch (_) { /* ignore */ }
            state.exclusiveMode = null;
            state.chatCommandFocusUntil = 0;
            resumeOpenAndCode(state, now);
            mode.updateModeBasedOnState();
        }

        if (state.isAFK) return;
        if (!textEditor || !textEditor.document) return;

        if (now > state.trackData.lastIntentlyTime + runtime.MAX_ALLOW_NOT_INTENTLY_MS + state.moreThinkingTimeMs) {
            uploadOpenTrackData(deps, now);
        } else {
            state.trackData.lastIntentlyTime = now;
        }
    };

    /** @param {vscode.TextDocument|null} doc */
    const onActiveFileChange = (doc) => {
        deps.recordUserActivity();
        const now = Date.now();

        // If we were in an exclusive mode and switched to a real editor (doc present), finalize that exclusive slice.
		if (doc) {
			if (state.exclusiveMode === 'terminal') {
				try {
					if (state.activeTerminal && state.terminalOpenTime) {
						const duration = now - state.terminalOpenTime;
						if (duration > 0) queueUploadPromise(deps.uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, duration), deps.uploader, log, isDebugMode, 'terminal-active');
					}
				} catch (_) { /* ignore */ }
				state.activeTerminal = null;
				state.terminalOpenTime = 0;
				state.exclusiveMode = null;
 				state.terminalExclusiveActive = false;
				mode.updateModeBasedOnState();
				suppressTerminalReentry(state, now);
			} else if (state.exclusiveMode === 'chat') {
                try { state.chat.pauseAll(now); } catch (_) { /* ignore */ }
                state.exclusiveMode = null;
                state.chatCommandFocusUntil = 0;
                mode.updateModeBasedOnState();
            }
        }

        if (state.isAFK) return;

        if (state.activeDocument) {
            if (state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
                uploadOpenTrackData(deps, now);
            }
            if (state.trackData.codingLong) {
                uploadCodingTrackData(deps);
            }
        }

        state.activeDocument = doc ? doc : null;
        resetTrackOpenAndIntentlyTime(state, now);
        state.trackData.codingLong = 0;
        state.trackData.lastCodingTime = 0;
        state.trackData.firstCodingTime = 0;
    };

    /** @param {vscode.TextDocument} doc */
    const onFileCoding = (doc) => {
        deps.recordUserActivity();
        if (state.isAFK || state.exclusiveMode || !state.windowFocused) return;

        if (!doc) return;
        const scheme = doc.uri ? doc.uri.scheme : '';
        if (runtime.INVALID_CODING_DOCUMENT_SCHEMES.includes(scheme)) return;

        if (isDebugMode) {
            try {
                if (scheme !== 'git' && scheme !== 'git-index' && scheme !== 'output' && scheme !== 'input' && scheme !== 'private' && scheme !== 'markdown' && scheme !== 'debug' && scheme !== 'vscode' && scheme !== 'walkThroughSnippet') {
                    log.debug(ext.dumpDocument(doc));
                }
            } catch (_) { /* ignore */ }
        }

        const now = Date.now();
        if (now - runtime.CODING_SHORTEST_UNIT_MS < state.trackData.lastCodingTime) return;

        if (!state.trackData.firstCodingTime) {
            pauseOpenTracking(deps, now);
            state.trackData.firstCodingTime = now;
        } else if (state.trackData.lastCodingTime < now - runtime.MAX_CODING_WAIT_TIME - state.moreThinkingTimeMs) {
            uploadCodingTrackData(deps);
            state.trackData.firstCodingTime = now;
        }

        state.trackData.codingLong += runtime.CODING_SHORTEST_UNIT_MS;
        state.trackData.lastCodingTime = now;

        mode.updateModeBasedOnState();
    };

    /**
     * Finalize editor/open-code tracking when the IDE window loses focus and
     * start a fresh slice when focus returns.
     *
     * @param {{ focused: boolean }} winState
     * @param {number} [nowOverride]
     */
    const onDidChangeWindowState = (winState, nowOverride) => {
        const now = typeof nowOverride === 'number' ? nowOverride : Date.now();

        if (!winState || !winState.focused) {
            state.windowFocused = false;
            if (!state.exclusiveMode) {
                pauseOpenTracking(deps, now);
                if (state.trackData.codingLong) {
                    uploadCodingTrackData(deps);
                }
            }
            mode.updateModeBasedOnState();
            return;
        }

        if (!state.windowFocused) {
            state.windowFocused = true;
            if (!state.isAFK && !state.exclusiveMode && state.activeDocument) {
                resumeOpenAndCode(state, now);
            }
            mode.updateModeBasedOnState();
        }
    };

    const dispose = () => {
        // No-op for now; retained for parity with legacy EventHandler.
    };

    /** @param {number} now */
    const tick = (now) => {
        if (state.isAFK || state.exclusiveMode || !state.windowFocused) return;
        flushOpenSegments(now);
        flushCodingSegments();
    };

    return {
        uploadOpenTrackData: (now) => uploadOpenTrackData(deps, now),
        uploadCodingTrackData: () => uploadCodingTrackData(deps),
        suspendOpenAndCode: (now) => suspendOpenAndCode(deps, now),
        resumeOpenAndCode: (now) => resumeOpenAndCode(state, now),
        pauseOpenTracking: (now) => pauseOpenTracking(deps, now),
        onIntentlyWatchingCodes,
        onActiveFileChange,
        onFileCoding,
        onDidChangeWindowState,
        tick,
        dispose
    };
}

module.exports = {
    createOpenCodeTracker,
    isIgnoreDocument,
    uploadOpenTrackData,
    uploadCodingTrackData,
    suspendOpenAndCode,
    resumeOpenAndCode,
    pauseOpenTracking,
    resetTrackOpenAndIntentlyTime
};
