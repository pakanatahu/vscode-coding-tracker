"use strict";

const runtime = require('../core/runtime');

function queueUploadPromise(promise, uploader, log, isDebugMode, hint) {
    Promise.resolve(promise).then(obj => {
        if (!obj) return;
        uploader.upload(obj);
    }).catch(err => {
        if (isDebugMode) log && log.debug && log.debug('[afk-upload] ' + (hint || 'terminal') + ' failed', err);
    });
}

/**
 * AFK monitor: tracks global activity and pauses/resumes slices.
 *
 * @param {object} deps
 * @param {import('vscode')} deps.vscode
 * @param {any} deps.log
 * @param {boolean} deps.isDebugMode
 * @param {any} deps.statusBar
 * @param {ReturnType<runtime.createInitialState>} deps.state
 * @param {any} deps.uploadObject
 * @param {any} deps.uploader
 * @param {{ uploadOpenTrackData: Function, uploadCodingTrackData: Function, resumeOpenAndCode: Function }} deps.openCode
 * @param {{ updateModeBasedOnState: Function }} deps.mode
 */
function createAfkMonitor(deps) {
    const { log, isDebugMode, statusBar, state, uploadObject, uploader, openCode, mode } = deps;

    function recordUserActivity() {
        const now = Date.now();
        state.lastUserActivity = now;

        if (state.isAFK) {
            state.isAFK = false;
            try { if (statusBar && typeof statusBar.setAFKOff === 'function') statusBar.setAFKOff(); } catch (e) { if (isDebugMode) log.debug('[AFK] Error updating status bar:', e); }
            if (isDebugMode) log.debug('[AFK] User returned from AFK');

            if (!state.exclusiveMode && state.activeDocument) {
                openCode.resumeOpenAndCode(now);
            }
            mode.updateModeBasedOnState();
            try { if (state.windowFocused) state.chat.resumeAll(now); } catch (_) { /* ignore */ }
        }
    }

    function checkAFKStatus() {
        try {
            if (!state.lastUserActivity) return;

            const now = Date.now();
            const timeSinceActivity = now - state.lastUserActivity;

            if (!state.isAFK && timeSinceActivity > state.afkTimeoutMs && state.exclusiveMode === 'chat' && state.windowFocused) {
                state.lastUserActivity = now;
                return;
            }

            if (!state.isAFK && timeSinceActivity > state.afkTimeoutMs) {
                state.isAFK = true;
                try { if (statusBar && typeof statusBar.setAFKOn === 'function') statusBar.setAFKOn(); } catch (e) { if (isDebugMode) log.debug('[AFK] Error updating status bar:', e); }
                if (isDebugMode) log.debug('[AFK] User went AFK, finalizing active slices');

                if (state.trackData.openTime && state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
                    openCode.uploadOpenTrackData(now);
                }
                if (state.trackData.codingLong) {
                    openCode.uploadCodingTrackData();
                }

                if (state.activeTerminal && state.terminalOpenTime) {
                    const duration = now - state.terminalOpenTime;
                    if (duration > 0) {
                        queueUploadPromise(uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, duration), uploader, log, isDebugMode, 'afk');
                    }
                    state.terminalOpenTime = 0;
                }

                try { state.chat.pauseAll(now); } catch (_) { /* ignore */ }
            }
        } catch (e) {
            if (isDebugMode) log.debug('[AFK] Error in checkAFKStatus:', e);
        }
    }

    function start() {
        try {
            if (!state.trackAFK) { if (isDebugMode) log.debug('[AFK] tracking disabled'); return; }
            if (state.afkCheckTimer) return;

            state.lastUserActivity = Date.now();
            state.afkCheckTimer = setInterval(checkAFKStatus, 30 * runtime.SECOND);
            if (isDebugMode) log.debug('[AFK] Started AFK monitoring');
        } catch (e) {
            if (isDebugMode) log.debug('[AFK] Error starting AFK monitoring:', e);
        }
    }

    function stop() {
        try {
            if (state.afkCheckTimer) {
                clearInterval(state.afkCheckTimer);
                state.afkCheckTimer = null;
            }
            if (isDebugMode) log.debug('[AFK] Stopped AFK monitoring');
        } catch (e) {
            if (isDebugMode) log.debug('[AFK] Error stopping AFK monitoring:', e);
        }
    }

    /** @param {boolean} enabled @param {number} timeoutMs */
    function applyConfig(enabled, timeoutMs) {
        state.trackAFK = !!enabled;
        state.afkTimeoutMs = timeoutMs;
        stop();
        if (state.trackAFK) start();
        else {
            state.isAFK = false;
            try { if (statusBar && typeof statusBar.setAFKOff === 'function') statusBar.setAFKOff(); } catch (_) { /* ignore */ }
        }
        mode.updateModeBasedOnState();
    }

    /** @param {import('vscode').Disposable[]} subscriptions */
    function registerCommands(subscriptions) {
        void subscriptions;
    }

    return {
        recordUserActivity,
        checkAFKStatus,
        start,
        stop,
        applyConfig,
        registerCommands
    };
}

module.exports = { createAfkMonitor };
