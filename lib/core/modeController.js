"use strict";

const runtime = require('./runtime');
const outLog = require('../OutputChannelLog');

/**
 * Computes and applies status bar mode based on the shared state.
 * This intentionally mirrors the existing behavior from extension.js.
 *
 * @param {object} deps
 * @param {ReturnType<require('../StatusBarManager')>} deps.statusBar
 * @param {ReturnType<runtime.createInitialState>} deps.state
 */
function determineModeInfo(state, now) {
    if (state.isAFK) return { mode: 'afk', reason: 'isAFK' };
    if (state.heuristicChatActive) return { mode: 'chat', reason: 'heuristic chat active' };
    try { state.chat.stopHeuristicSession('coding-activity'); } catch (_) { /* ignore */ }
    if (state.exclusiveMode === 'chat' || (state.chatCommandFocusUntil > now && state.exclusiveMode !== 'terminal')) {
        return { mode: 'chat', reason: 'exclusive chat' };
    }
    if (state.exclusiveMode === 'terminal' || state.terminalExclusiveActive) {
        return { mode: 'terminal', reason: 'exclusive terminal' };
    }
    if (state.trackData.firstCodingTime && state.trackData.lastCodingTime && (now - state.trackData.lastCodingTime) <= (runtime.MAX_CODING_WAIT_TIME + 2000)) {
        return { mode: 'coding', reason: 'coding activity' };
    }
    if (!state.windowFocused) return { mode: null, reason: 'window unfocused' };
    if (state.activeDocument) return { mode: 'watching', reason: 'active document' };
    return { mode: null, reason: 'idle' };
}

function logModeTransition(state, modeInfo, now) {
    if (!state.logModeTransitions) return;
    if (state.lastReportedMode === modeInfo.mode && state.lastReportedReason === modeInfo.reason) return;
    state.lastReportedMode = modeInfo.mode;
    state.lastReportedReason = modeInfo.reason;
    const chatFocusMs = modeInfo.mode === 'chat' ? Math.max(0, state.chatCommandFocusUntil - now) : 0;
    const docName = state.activeDocument ? (state.activeDocument.fileName || (state.activeDocument.uri && state.activeDocument.uri.path) || '<doc>') : 'none';
    const details = [
        `mode=${modeInfo.mode || 'none'}`,
        `reason=${modeInfo.reason}`,
        `exclusive=${state.exclusiveMode || 'none'}`,
        `terminalExclusive=${!!state.terminalExclusiveActive}`,
        `heuristicChat=${!!state.heuristicChatActive}`,
        `chatFocusHold=${chatFocusMs}ms`,
        `windowFocused=${!!state.windowFocused}`,
        `terminalActive=${!!state.activeTerminal}`,
        `document=${docName}`
    ].join(' ');
    outLog.debug(`[mode] ${details}`);
}

function updateModeBasedOnState(deps) {
    const { statusBar, state } = deps;
    if (!statusBar || typeof statusBar.setMode !== 'function') return;

    const now = Date.now();
    const modeInfo = determineModeInfo(state, now);
    statusBar.setMode(modeInfo.mode);
    logModeTransition(state, modeInfo, now);
}

function refreshStatusBarMode(deps) {
    try { updateModeBasedOnState(deps); } catch (_) { /* ignore */ }
}

module.exports = {
    updateModeBasedOnState,
    refreshStatusBarMode
};
