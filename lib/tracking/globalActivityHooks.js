"use strict";

const runtime = require('../core/runtime');

function queueUploadPromise(promise, uploader, log, isDebugMode, hint) {
    Promise.resolve(promise).then(obj => {
        if (!obj) return;
        uploader.upload(obj);
    }).catch(err => {
        if (isDebugMode) log && log.debug && log.debug('[global-activity-upload] ' + (hint || 'slice') + ' failed', err);
    });
}

function suppressTerminalReentry(state, now) {
    const cooldown = Math.max(0, runtime.TERMINAL_REENTRY_COOLDOWN_MS || 0);
    state.terminalReentrySuppressedUntil = now + cooldown;
}

/**
 * Global lightweight activity hooks.
 * Mirrors the legacy behavior from extension.js: mark activity on UI interactions
 * and detect command-driven transitions between editor/terminal/chat.
 */

/**
 * @param {object} deps
 * @param {import('vscode')} deps.vscode
 * @param {any} deps.log
 * @param {boolean} deps.isDebugMode
 * @param {any} deps.uploadObject
 * @param {any} deps.uploader
 * @param {any} deps.state
 * @param {{ suspendOpenAndCode: Function, resumeOpenAndCode: Function }} deps.openCode
 * @param {{ updateModeBasedOnState: Function, refreshStatusBarMode: Function }} deps.mode
 * @param {() => void} deps.recordUserActivity
 */
function registerGlobalActivityHooks(deps) {
    const { vscode, log, isDebugMode, state, openCode, mode, uploadObject, uploader } = deps;
    const isTerminalPanelFocused = () => !!vscode.window.activeTerminal && !vscode.window.activeTextEditor;

    /** @param {import('vscode').Disposable[]} subscriptions */
    return function register(subscriptions) {
        // Mark activity on any executed command (keyboard shortcuts, palette, etc.)
        try {
            const anyCommands = /** @type {any} */ (vscode.commands);
            if (anyCommands && typeof anyCommands.onDidExecuteCommand === 'function') {
                subscriptions.push(anyCommands.onDidExecuteCommand((/** @type {any} */ e) => {
                    try { deps.recordUserActivity(); } catch (_) { /* ignore */ }
                    try {
                        const id = e && typeof e.command === 'string' ? e.command : '';
                        try { if (isDebugMode) log.debug('[cmd]', id); } catch (_) { /* ignore */ }
                        const now = Date.now();

                        if (/terminal/i.test(id) && /(focus|toggle|new|show|open)/i.test(id)) {
                            if (!state.isAFK && state.windowFocused && isTerminalPanelFocused()) {
                                try { state.chat.stopHeuristicSession('terminal-command', true); } catch (_) { /* ignore */ }
                                state.exclusiveMode = 'terminal';
                                state.terminalExclusiveActive = true;
                                openCode.suspendOpenAndCode(now);
                                mode.refreshStatusBarMode();
                                const currentTerminal = vscode.window.activeTerminal;
                                if (currentTerminal && (!state.activeTerminal || state.activeTerminal.name !== currentTerminal.name)) {
                                    state.activeTerminal = currentTerminal;
                                    state.terminalOpenTime = now;
                                } else if (state.activeTerminal && !state.terminalOpenTime) {
                                    state.terminalOpenTime = now;
                                } else if (!state.activeTerminal && vscode.window.activeTerminal) {
                                    state.activeTerminal = vscode.window.activeTerminal;
                                    state.terminalOpenTime = now;
                                }
                                state.terminalReentrySuppressedUntil = 0;
                            }
                        }
                        else if (/(copilot|chat|assistant|gpt|codeium)/i.test(id) || /workbench\..*chat/i.test(id) || /github\.copilot\./i.test(id)) {
                            if (!state.isAFK && state.windowFocused) {
                                state.exclusiveMode = 'chat';
                                openCode.suspendOpenAndCode(now);
                                mode.refreshStatusBarMode();
                                state.chatCommandFocusUntil = now + 30000;
                            }
                        }
                        else if (/workbench\.action\.focus.*Editor/i.test(id)) {
                            if (state.exclusiveMode === 'terminal') {
                                if (state.activeTerminal && state.terminalOpenTime) {
                                    const dur = now - state.terminalOpenTime;
                                    if (dur > 0) queueUploadPromise(uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, dur), uploader, log, isDebugMode, 'global-activity-focus');
                                }
                                state.activeTerminal = null;
                                state.terminalOpenTime = 0;
                                state.exclusiveMode = null;
                                state.chatCommandFocusUntil = 0;
                                suppressTerminalReentry(state, now);
                                openCode.resumeOpenAndCode(now);
                                mode.updateModeBasedOnState();
                            } else if (state.exclusiveMode === 'chat') {
                                try { state.chat.pauseAll(now); } catch (_) { /* ignore */ }
                                state.exclusiveMode = null;
                                state.chatCommandFocusUntil = 0;
                                openCode.resumeOpenAndCode(now);
                                mode.updateModeBasedOnState();
                            }
                        }
                    } catch (_) { /* ignore */ }
                }));
            }
        } catch (_) { /* ignore */ }

        // Changing visible editors implies user interaction
        try {
            subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => deps.recordUserActivity()));
        } catch (_) { /* ignore */ }

        // Tab switches imply interaction
        try {
            const anyWindow = /** @type {any} */ (vscode.window);
            if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === 'function') {
                subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => deps.recordUserActivity()));
            }
        } catch (_) { /* ignore */ }

        // Record refocus as activity so AFK exits quickly
        try {
            subscriptions.push(vscode.window.onDidChangeWindowState((ws) => { if (ws.focused) deps.recordUserActivity(); }));
        } catch (_) { /* ignore */ }
    };
}

module.exports = { registerGlobalActivityHooks };
