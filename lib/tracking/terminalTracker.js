"use strict";

const runtime = require('../core/runtime');

/**
 * Terminal tracking: open/close/active focus + polling.
 *
 * @param {object} deps
 * @param {import('vscode')} deps.vscode
 * @param {any} deps.log
 * @param {boolean} deps.isDebugMode
 * @param {ReturnType<runtime.createInitialState>} deps.state
 * @param {any} deps.uploadObject
 * @param {any} deps.uploader
 * @param {{ suspendOpenAndCode: Function, resumeOpenAndCode: Function }} deps.openCode
 * @param {{ updateModeBasedOnState: Function, refreshStatusBarMode: Function }} deps.mode
 * @param {() => void} deps.recordUserActivity
 * @param {(tab:any)=>boolean} deps.isChatLikeTab
 */
function createTerminalTracker(deps) {
    const { vscode, log, isDebugMode, state, uploadObject, uploader, openCode, mode, isChatLikeTab } = deps;
    const cooldownMs = Math.max(0, runtime.TERMINAL_REENTRY_COOLDOWN_MS || 0);
    const getSegmentDurationMs = () => Math.max(1000, state.segmentDurationMs || (15 * runtime.SECOND));
    const suppressTerminalReentry = (now) => { state.terminalReentrySuppressedUntil = now + cooldownMs; };
    const resetTerminalReentrySuppression = () => { state.terminalReentrySuppressedUntil = 0; };
    const isTerminalReentrySuppressed = (now) => now < (state.terminalReentrySuppressedUntil || 0);
    const isTerminalPanelFocused = () => !!vscode.window.activeTerminal && !vscode.window.activeTextEditor;

    /** @param {number} now */
    function finalizeActiveTerminal(now) {
        if (state.activeTerminal && state.terminalOpenTime) {
            const duration = now - state.terminalOpenTime;
            if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, 'finalize');
        }
        state.activeTerminal = null;
        state.terminalOpenTime = 0;
        suppressTerminalReentry(now);
    }

    function queueTerminalUpload(promise, hint) {
        Promise.resolve(promise).then(obj => {
            if (!obj) return;
            uploader.upload(obj);
        }).catch(err => {
            if (isDebugMode) log.debug('[terminal-upload] failed', hint || 'slice', err);
        });
    }

    function queueTerminalSlice(name, start, duration, hint) {
        if (!name || duration <= 0) return;
        queueTerminalUpload(uploadObject.generateTerminal(name, start, duration), hint);
    }

    /** @param {number} now @param {string} hint */
    function rollTerminalSegments(now, hint) {
        if (!state.activeTerminal || !state.terminalOpenTime) return;
        const segmentDurationMs = getSegmentDurationMs();
        while ((now - state.terminalOpenTime) >= segmentDurationMs) {
            queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, segmentDurationMs, hint);
            state.terminalOpenTime += segmentDurationMs;
        }
    }

    /** @param {import('vscode').Terminal} terminal */
    function onDidOpenTerminal(terminal) {
        deps.recordUserActivity();
        try { state.chat.stopHeuristicSession('terminal-open', true); } catch (_) { /* ignore */ }

        if (isDebugMode) log.debug(`Terminal opened: ${terminal.name}`);

        if (!state.isAFK && state.windowFocused && terminal === vscode.window.activeTerminal && isTerminalPanelFocused()) {
            state.exclusiveMode = 'terminal';
            state.terminalExclusiveActive = true;
            openCode.suspendOpenAndCode(Date.now());
            mode.refreshStatusBarMode();
            state.activeTerminal = terminal;
            state.terminalOpenTime = Date.now();
            resetTerminalReentrySuppression();
        }
        state.chatCommandFocusUntil = 0;
    }

    /** @param {import('vscode').Terminal} terminal */
    function onDidCloseTerminal(terminal) {
        if (isDebugMode) log.debug(`Terminal closed: ${terminal.name}`);
        const allTerms = vscode.window.terminals || [];
        const isSame = state.activeTerminal && state.activeTerminal === terminal;
        if (isSame || (state.activeTerminal && !allTerms.includes(state.activeTerminal))) {
            const now = Date.now();
            finalizeActiveTerminal(now);
            if (state.exclusiveMode === 'terminal') {
                state.exclusiveMode = null;
                state.terminalExclusiveActive = false;
                openCode.resumeOpenAndCode(now);
                mode.updateModeBasedOnState();
            }
        }
    }

    /** @param {import('vscode').Terminal | undefined} terminal */
    function onDidChangeActiveTerminal(terminal) {
        deps.recordUserActivity();
        if (isDebugMode) log.debug(`Active terminal changed: ${terminal ? terminal.name : 'None'}`);

        if (state.activeTerminal && state.activeTerminal !== (terminal || null)) {
            const duration = Date.now() - state.terminalOpenTime;
            if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, 'active-change');
        }

        if (terminal) {
            if (state.windowFocused && !state.isAFK && isTerminalPanelFocused()) {
                try { state.chat.stopHeuristicSession('terminal-focus', true); } catch (_) { /* ignore */ }
                state.exclusiveMode = 'terminal';
                state.terminalExclusiveActive = true;
                openCode.suspendOpenAndCode(Date.now());
                mode.refreshStatusBarMode();
                state.chatCommandFocusUntil = 0;
                state.activeTerminal = terminal;
                state.terminalOpenTime = Date.now();
                resetTerminalReentrySuppression();
            } else if (state.activeTerminal === terminal) {
                state.terminalOpenTime = 0;
            }
        } else {
            const now = Date.now();
            state.activeTerminal = null;
            state.terminalOpenTime = 0;
            if (state.exclusiveMode === 'terminal') {
                state.exclusiveMode = null;
                state.terminalExclusiveActive = false;
                openCode.resumeOpenAndCode(now);
                mode.updateModeBasedOnState();
            }
            suppressTerminalReentry(now);
        }
    }

    /** @param {import('vscode').WindowState} winState */
    function onDidChangeWindowState(winState) {
        if (!winState.focused) {
            state.windowFocused = false;
            try { state.chat.pauseAll(Date.now()); } catch (e) { void e; }
            try { mode.updateModeBasedOnState(); } catch (_) { /* ignore */ }
                if (state.activeTerminal && state.terminalOpenTime) {
                    const duration = Date.now() - state.terminalOpenTime;
                    if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, 'window-unfocus');
                    state.terminalOpenTime = 0;
                }
        } else {
            if (!state.windowFocused) {
                state.windowFocused = true;
                try { if (!state.isAFK) state.chat.resumeAll(Date.now()); } catch (e) { void e; }
                if (state.activeTerminal && state.activeTerminal === vscode.window.activeTerminal && isTerminalPanelFocused()) {
                    state.terminalOpenTime = Date.now();
                }
                mode.updateModeBasedOnState();
            }
        }
    }

    /** @param {import('vscode').Disposable[]} subscriptions */
    function register(subscriptions) {
        if (!state.trackTerminal) return;

        subscriptions.push(vscode.window.onDidOpenTerminal(onDidOpenTerminal));
        subscriptions.push(vscode.window.onDidCloseTerminal(onDidCloseTerminal));
        subscriptions.push(vscode.window.onDidChangeActiveTerminal((t) => onDidChangeActiveTerminal(t)));
        subscriptions.push(vscode.window.onDidChangeWindowState(onDidChangeWindowState));

        try {
            const t = vscode.window.activeTerminal;
            if (t) onDidChangeActiveTerminal(t);
        } catch (_) { /* ignore */ }

        try {
            if (!state.terminalPollHandle) {
                const POLL_MS = 1500;
                if (isDebugMode) log.debug('[terminal-poll] starting poll @', POLL_MS, 'ms');
                state.terminalPollHandle = setInterval(() => {
                    try {
                        const current = vscode.window.activeTerminal || null;
                        let chatUIFocused = false;
                        try {
                            const anyWindow = /** @type {any} */ (vscode.window);
                            const groups = anyWindow.tabGroups && anyWindow.tabGroups.all ? anyWindow.tabGroups.all : [];
                            for (const g of groups) {
                                if (!g || !g.activeTab) continue;
                                if (isChatLikeTab(g.activeTab)) { chatUIFocused = true; break; }
                            }
                        } catch (_) { /* ignore */ }

                        if (chatUIFocused && state.activeTerminal) {
                            const now = Date.now();
                            const duration = now - state.terminalOpenTime;
                            if (duration > 0) {
                                queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, 'poll-chat-focus');
                                if (isDebugMode) log.debug('[terminal-poll] terminal slice ended (chat focus)');
                            }
                            state.activeTerminal = null;
                            state.terminalOpenTime = 0;
                            suppressTerminalReentry(now);
                            if (state.exclusiveMode === 'terminal') {
                                state.exclusiveMode = null;
                                state.terminalExclusiveActive = false;
                                mode.updateModeBasedOnState();
                            }
                        } else if (!chatUIFocused) {
                            if (current && state.activeTerminal && state.activeTerminal === current && state.windowFocused && !state.isAFK) {
                                rollTerminalSegments(Date.now(), 'poll-segment');
                            }
                            if (!current && state.activeTerminal) {
                                const now = Date.now();
                                const duration = now - state.terminalOpenTime;
                                if (duration > 0) {
                                    queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, 'poll-focus-lost');
                                    if (isDebugMode) log.debug('[terminal-poll] synthesized terminal slice (focus lost)');
                                }
                                state.activeTerminal = null;
                                state.terminalOpenTime = 0;
                                suppressTerminalReentry(now);
                                if (state.exclusiveMode === 'terminal') {
                                    state.exclusiveMode = null;
                                    state.terminalExclusiveActive = false;
                                    mode.updateModeBasedOnState();
                                }
                            }

                            const activeEditor = vscode.window.activeTextEditor;
                            const terminalPanelFocused = !activeEditor;
                            if (terminalPanelFocused && current && (!state.activeTerminal || state.activeTerminal.name !== current.name)) {
                                const now = Date.now();
                                if (isTerminalReentrySuppressed(now)) {
                                    if (isDebugMode) log.debug('[terminal-poll] reentry delayed until', state.terminalReentrySuppressedUntil, 'now', now);
                                } else if (!state.isAFK && state.windowFocused) {
                                    try { state.chat.stopHeuristicSession('terminal-poll', true); } catch (_) { /* ignore */ }
                                    state.exclusiveMode = 'terminal';
                                    state.terminalExclusiveActive = true;
                                    openCode.suspendOpenAndCode(now);
                                    mode.refreshStatusBarMode();
                                    resetTerminalReentrySuppression();
                                    state.chatCommandFocusUntil = 0;
                                    state.activeTerminal = current;
                                    state.terminalOpenTime = now;
                                }
                            }
                        }
                    } catch (_) { /* ignore */ }
                }, POLL_MS);
                subscriptions.push({ dispose: () => { if (state.terminalPollHandle) { clearInterval(state.terminalPollHandle); state.terminalPollHandle = null; } } });
            }
        } catch (e) {
            if (isDebugMode) log.debug('terminal poll init failed', e);
        }

        // Additionally reflect terminal state interaction flags (if available)
        try {
            if (typeof vscode.window.onDidChangeTerminalState === 'function') {
                subscriptions.push(vscode.window.onDidChangeTerminalState((term) => {
                    try {
                        deps.recordUserActivity();
                        if (term === vscode.window.activeTerminal && term && term.state && term.state.isInteractedWith) {
                            const now = Date.now();
                            if (!state.isAFK && state.windowFocused) {
                                try { state.chat.stopHeuristicSession('terminal-state', true); } catch (_) { /* ignore */ }
                                state.exclusiveMode = 'terminal';
                                state.terminalExclusiveActive = true;
                                openCode.suspendOpenAndCode(now);
                                mode.refreshStatusBarMode();
                                if (!state.activeTerminal || state.activeTerminal.name !== term.name) {
                                    finalizeActiveTerminal(now);
                                    state.activeTerminal = term;
                                    state.terminalOpenTime = now;
                                } else if (state.activeTerminal && !state.terminalOpenTime) {
                                    state.terminalOpenTime = now;
                                }
                            }
                        }
                    } catch (_) { /* ignore */ }
                }));
            }
        } catch (_) { /* ignore */ }
    }

    function dispose() {
        if (state.activeTerminal) {
            const duration = Date.now() - state.terminalOpenTime;
            if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, 'dispose');
            state.activeTerminal = null;
            state.terminalOpenTime = 0;
            suppressTerminalReentry(Date.now());
        }
        if (state.terminalPollHandle) {
            clearInterval(state.terminalPollHandle);
            state.terminalPollHandle = null;
        }
    }

    return {
        register,
        dispose,
        finalizeActiveTerminal
    };
}

module.exports = { createTerminalTracker };
