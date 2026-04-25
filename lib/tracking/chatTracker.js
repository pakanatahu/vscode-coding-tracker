"use strict";

const runtime = require('../core/runtime');

const chatTabRegex = /copilot|chatgpt|ai\s*chat|codeium.*chat|chat panel|github\.copilot\.chat|^chat$|assistant|ai assistant|codex/i;
const chatTabSchemes = ['vscode-chat', 'vscode-chat-session', 'vscode-chat-editor'];
const chatSchemeRegex = /(chat|assistant)/i;

/**
 * Detect whether a VS Code tab corresponds to a chat/assistant surface.
 * @param {any} tab
 */
function isChatLikeTab(tab) {
    if (!tab || typeof tab !== 'object') return false;
    const label = typeof tab.label === 'string' ? tab.label : '';
    const viewType = typeof tab.viewType === 'string' ? tab.viewType : '';
    if (chatTabRegex.test(label) || chatTabRegex.test(viewType)) return true;

    const seenSchemes = new Set();
    /** @param {unknown} uriCandidate */
    const addScheme = (uriCandidate) => {
        try {
            if (!uriCandidate) return;
            if (typeof uriCandidate === 'string') { seenSchemes.add(uriCandidate.toLowerCase()); return; }
            const maybeUri = /** @type {{ scheme?: string }} */ (uriCandidate);
            if (maybeUri && typeof maybeUri.scheme === 'string') seenSchemes.add(maybeUri.scheme.toLowerCase());
        } catch { /* ignore */ }
    };
    /** @param {unknown} maybe */
    const inspectString = (maybe) => typeof maybe === 'string' && chatTabRegex.test(maybe);

    const input = /** @type {any} */ (tab.input);
    if (input && typeof input === 'object') {
        if (inspectString(input.viewType) || inspectString(input.providerId) || inspectString(input.notebookType)) return true;
        addScheme(input.uri);
        addScheme(input.resource);
        addScheme(input.webviewUri);
        addScheme(input.primaryUri);
        addScheme(input.secondaryUri);
        if (Array.isArray(input.resources)) {
            for (const res of input.resources) addScheme(res);
        }
    }
    if (Array.isArray(tab.additionalResources)) {
        for (const res of tab.additionalResources) addScheme(res);
    }

    for (const scheme of seenSchemes) {
        if (!scheme) continue;
        if (chatTabSchemes.includes(scheme) || chatSchemeRegex.test(scheme)) return true;
    }

    return false;
}

/**
 * Chat tracking (native if available, otherwise heuristic fallback).
 * Also provides pause/resume hooks used by AFK/window focus.
 *
 * @param {object} deps
 * @param {import('vscode')} deps.vscode
 * @param {any} deps.log
 * @param {boolean} deps.isDebugMode
 * @param {ReturnType<runtime.createInitialState>} deps.state
 * @param {any} deps.uploadObject
 * @param {any} deps.uploader
 * @param {{ suspendOpenAndCode: Function, resumeOpenAndCode: Function, uploadOpenTrackData: Function, uploadCodingTrackData: Function }} deps.openCode
 * @param {{ updateModeBasedOnState: Function, refreshStatusBarMode: Function }} deps.mode
 * @param {() => void} deps.recordUserActivity
 */
function createChatTracker(deps) {
    const { vscode, log, isDebugMode, state, uploadObject, uploader, openCode, mode } = deps;
    const getSegmentDurationMs = () => Math.max(1000, state.segmentDurationMs || (15 * runtime.SECOND));
    const getIdleThresholdMs = () => Math.max(runtime.SECOND, state.afkTimeoutMs || (5 * 60 * runtime.SECOND));

    const chatContextKeys = [
        'workbench.panel.chat.active',
        'workbench.view.chat.active',
        'chatViewVisible',
        'chatViewFocus',
        'chatViewInputFocus',
        'quickChatVisible',
        'inQuickChat', 'inChat', 'chatActive',
        'inlineChatVisible', 'inlineChatInputVisible', 'interactiveSessionFocus',
        'github.copilot.chatViewVisible', 'github.copilot.chatViewFocus'
    ];
    const CHAT_CONTEXT_CACHE_MS = 1000;
    let lastChatContextCheck = 0;
    let lastChatContextValue = false;

    async function hasChatContextActive() {
        const now = Date.now();
        if (now - lastChatContextCheck < CHAT_CONTEXT_CACHE_MS) return lastChatContextValue;
        lastChatContextCheck = now;
        for (const key of chatContextKeys) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const hit = await vscode.commands.executeCommand('vscode.getContextKeyValue', key).then(Boolean, () => false);
                if (hit) {
                    lastChatContextValue = true;
                    return true;
                }
            } catch (_) { /* ignore */ }
        }
        lastChatContextValue = false;
        return false;
    }

    /** @type {Array<(now:number)=>void>} */
    const pauseHandlers = [];
    /** @type {Array<(now:number)=>void>} */
    const resumeHandlers = [];

    const pauseAll = (now) => { for (const h of pauseHandlers) { try { h(now); } catch (e) { void e; } } };
    const resumeAll = (now) => { for (const h of resumeHandlers) { try { h(now); } catch (e) { void e; } } };

    // expose via shared state so other modules don't need to import this module
    state.chat.pauseAll = pauseAll;
    state.chat.resumeAll = resumeAll;

    /** @type {(reason?: string, preserveExclusive?: boolean) => void} */
    let stopHeuristicChatSession = (reason, preserveExclusive) => { void reason; void preserveExclusive; };

    state.chat.stopHeuristicSession = (reason, preserveExclusive) => stopHeuristicChatSession(reason, preserveExclusive);

    /** @param {import('vscode').Disposable[]} subscriptions */
    function register(subscriptions) {
        if (!state.trackAIChat) return;

        const maybeChat = /** @type {any} */ (vscode).chat;
        const hasNative = !!(maybeChat && typeof maybeChat.onDidOpenChatSession === 'function' && typeof maybeChat.onDidDisposeChatSession === 'function');
        try {
            if (isDebugMode) log.debug('[chat-native] vscode.chat available =', !!maybeChat, 'handlers =', hasNative ? 'ok' : 'missing');
        } catch (_) { /* ignore */ }

        let nativeChatActiveCount = 0;
        const enableHeuristics = true;
        const heuristicLossGraceMs = 4000;
        const heuristicSchemes = ['vscode-chat', 'vscode-chat-session', 'vscode-chat-editor'];
        const heuristicLangs = ['copilot-chat', 'chat'];
        const heuristicFilePatterns = [/copilot.*chat/i, /chatgpt/i, /ai[- ]?chat/i];

        /**
         * @param {string} provider
         * @param {string} sessionId
         * @param {number} start
         * @param {number} now
         * @param {boolean} heuristic
         * @param {number} seq
         * @param {boolean} isFinal
         */
        const emitChatSlice = (provider, sessionId, start, end, heuristic, seq, isFinal) => {
            if (typeof uploadObject.generateChat !== 'function') return;
            const duration = end - start;
            if (duration <= 0) return;
            const promise = uploadObject.generateChat(provider, sessionId, start, duration, 0, 0);
            Promise.resolve(promise).then(obj => {
                if (!obj) return;
                const markers = [];
                if (heuristic) markers.push('heuristic');
                if (typeof seq === 'number') markers.push('seq=' + seq);
                if (isFinal) markers.push('final');
                const markerStr = markers.join(';');
                obj.r2 = obj.r2 ? (obj.r2 + (markerStr ? (';' + markerStr) : '')) : markerStr;
                uploader.upload(obj);
            }).catch(err => {
                if (isDebugMode) log.debug('[chat-upload] emitChatSlice failed', err);
            });
        };

        /**
         * @param {{ provider:string, segmentStart:number, seq:number, paused?:boolean }} rec
         * @param {string} sessionId
         * @param {number} now
         * @param {boolean} heuristic
         * @param {boolean} isFinal
         */
        const flushChatSegments = (rec, sessionId, now, heuristic, isFinal) => {
            const segmentDurationMs = getSegmentDurationMs();
            while ((now - rec.segmentStart) >= segmentDurationMs) {
                const segmentEnd = rec.segmentStart + segmentDurationMs;
                rec.seq += 1;
                emitChatSlice(rec.provider, sessionId, rec.segmentStart, segmentEnd, heuristic, rec.seq, false);
                rec.segmentStart = segmentEnd;
            }
            if (isFinal && now > rec.segmentStart) {
                rec.seq += 1;
                emitChatSlice(rec.provider, sessionId, rec.segmentStart, now, heuristic, rec.seq, true);
                rec.segmentStart = now;
            }
        };

        if (hasNative) {
            const chatSessions = new Map();

            /** @param {any} session */
            const onDidOpenChatSession = (session) => {
                try { deps.recordUserActivity(); } catch (_) { /* ignore */ }
                const start = Date.now();
                let providerId = 'unknown';
                try {
                    if (session && session.provider) providerId = session.provider.id || session.provider.label || 'unknown';
                    else if (session && session.providerId) providerId = session.providerId;
                } catch (_) { /* ignore */ }
                try { if (isDebugMode) log.debug('[chat-native] onDidOpenChatSession', 'id=', session && session.id, 'provider=', providerId); } catch (_) { /* ignore */ }

                state.exclusiveMode = 'chat';
                openCode.suspendOpenAndCode(start);
                mode.refreshStatusBarMode();

                nativeChatActiveCount++;
                chatSessions.set(session.id, { provider: providerId, segmentStart: start, seq: 0 });
            };

            subscriptions.push(maybeChat.onDidOpenChatSession(onDidOpenChatSession));

            const intervalHandle = setInterval(() => {
                const now = Date.now();
                for (const [id, rec] of chatSessions.entries()) {
                    if (!state.windowFocused || state.isAFK || rec.paused) continue;
                    flushChatSegments(rec, id, now, false, false);
                }
            }, 1000);
            subscriptions.push({ dispose: () => clearInterval(intervalHandle) });

            subscriptions.push(maybeChat.onDidDisposeChatSession(/** @type {(session:any)=>void} */(session => {
                try { if (isDebugMode) log.debug('[chat-native] onDidDisposeChatSession', 'id=', session && session.id); } catch (_) { /* ignore */ }
                const rec = chatSessions.get(session.id);
                if (rec) {
                    const now = Date.now();
                    flushChatSegments(rec, session.id, now, false, true);
                    chatSessions.delete(session.id);
                    nativeChatActiveCount = Math.max(0, nativeChatActiveCount - 1);

                    if (chatSessions.size === 0 && state.exclusiveMode === 'chat') {
                        state.exclusiveMode = null;
                        state.chatCommandFocusUntil = 0;
                        openCode.resumeOpenAndCode(now);
                        mode.updateModeBasedOnState();
                    }
                }
            })));

            pauseHandlers.push((now) => {
                for (const [id, rec] of chatSessions.entries()) {
                    if (rec.paused) continue;
                    rec.paused = true;
                    flushChatSegments(rec, id, now, false, true);
                }
            });
            resumeHandlers.push((now) => {
                for (const rec of chatSessions.values()) {
                    if (!rec.paused) continue;
                    rec.paused = false;
                    rec.segmentStart = now;
                }
            });
        } else {
            try { if (isDebugMode) log.debug('[chat-native] vscode.chat not available; relying on heuristics only'); } catch (_) { /* ignore */ }
        }

        if (enableHeuristics) {
            /** @type {{id:string,segmentStart:number,lastSeen:number,provider:string,seq:number}|null} */
            let heuristicSession = null;
            /** @type {ReturnType<typeof setInterval>|null} */
            let heuristicTimer = null;
            const providerName = 'heuristic.chat';
            const genSessionId = () => 'heuristic-' + Date.now().toString(36);
            let heuristicLossSince = 0;

            stopHeuristicChatSession = (reason = 'manual', preserveExclusive = false) => {
                if (!heuristicSession) return;
                const now = Date.now();
                if (nativeChatActiveCount === 0) {
                    flushChatSegments(heuristicSession, heuristicSession.id, heuristicSession.lastSeen || now, true, true);
                }
                if (isDebugMode) log.debug('[chat-heuristic] session end', heuristicSession.id, reason);
                heuristicSession = null;
                heuristicLossSince = 0;
                state.heuristicChatActive = false;
                mode.refreshStatusBarMode();
                if (!preserveExclusive && state.exclusiveMode === 'chat') {
                    state.exclusiveMode = null;
                    state.chatCommandFocusUntil = 0;
                    openCode.resumeOpenAndCode(now);
                    mode.updateModeBasedOnState();
                }
            };

            const detectChatTabActive = () => {
                try {
                    const anyWindow = /** @type {any} */ (vscode.window);
                    const group = anyWindow.tabGroups && anyWindow.tabGroups.activeTabGroup ? anyWindow.tabGroups.activeTabGroup : null;
                    if (group && group.activeTab) {
                        const label = (group.activeTab.label || '<?>') + (group.activeTab.viewType ? ('<' + group.activeTab.viewType + '>') : '');
                        if (isDebugMode && Date.now() - state.lastChatEnumLog > 15000) {
                            state.lastChatEnumLog = Date.now();
                            log.debug('[chat-heuristic] tab labels (active):', label);
                        }
                        if (isChatLikeTab(group.activeTab)) return true;
                    }
                } catch (_) { /* ignore */ }
                return false;
            };

            const scanEditors = async () => {
                if (state.isAFK || !state.windowFocused) return;
                if (state.exclusiveMode === 'terminal') {
                    stopHeuristicChatSession('terminal-exclusive', true);
                    return;
                }

                const activeEditor = vscode.window.activeTextEditor || null;
                const editors = activeEditor ? [activeEditor] : [];
                const now = Date.now();

                const chatLike = editors.find(ed => {
                    try {
                        const doc = ed.document;
                        if (!doc) return false;
                        const scheme = doc.uri.scheme;
                        const lang = doc.languageId;
                        const fileName = doc.fileName || '';
                        if (heuristicSchemes.includes(scheme)) return true;
                        if (heuristicLangs.includes(lang)) return true;
                        if (lang === 'plaintext' && /untitled/i.test(fileName)) {
                            const firstLine = doc.lineCount > 0 ? doc.lineAt(0).text : '';
                            if (/^#?\s*copilot/i.test(firstLine) || /chat/i.test(firstLine)) return true;
                        }
                        if (heuristicFilePatterns.some(r => r.test(fileName))) return true;
                    } catch (_) { return false; }
                    return false;
                });

                const chatTabActive = !chatLike && detectChatTabActive();
                const chatPanelActive = await hasChatContextActive();
                if (chatLike || chatTabActive || chatPanelActive) {
                    state.heuristicChatActive = true;
                    heuristicLossSince = 0;
                    const stickyNow = Date.now();
                    state.chatCommandFocusUntil = Math.max(state.chatCommandFocusUntil, stickyNow + 10000);

                    if (state.exclusiveMode !== 'chat') {
                        state.exclusiveMode = 'chat';
                        openCode.suspendOpenAndCode(now);
                        mode.refreshStatusBarMode();
                    }

                    if (!heuristicSession) {
                        heuristicSession = { id: genSessionId(), segmentStart: now, lastSeen: now, provider: providerName, seq: 0 };
                        if (isDebugMode) log.debug('[chat-heuristic] session start', heuristicSession.id, chatLike ? 'editor' : 'tab');
                        try {
                            const now2 = Date.now();
                            if (state.activeDocument) {
                                if (state.trackData.openTime && state.trackData.openTime < now2 - runtime.AT_LEAST_WATCHING_TIME) openCode.uploadOpenTrackData(now2);
                                if (state.trackData.codingLong) openCode.uploadCodingTrackData();
                            }
                        } catch (_) { /* ignore */ }
                    } else {
                        heuristicSession.lastSeen = now;
                    }
                } else if (heuristicSession) {
                    if (!heuristicLossSince) heuristicLossSince = now;
                    if (now - heuristicLossSince > heuristicLossGraceMs) stopHeuristicChatSession('focus-loss');
                } else {
                    state.heuristicChatActive = false;
                    heuristicLossSince = 0;
                }
            };

            const startHeuristicLoop = () => {
                if (heuristicTimer) return;
                heuristicTimer = setInterval(() => {
            void scanEditors();
            if (heuristicSession) {
                        const now = Date.now();
                        if (state.isAFK || !state.windowFocused) {
                            stopHeuristicChatSession('afk-unfocused');
                            return;
                        }
                        if (now - heuristicSession.lastSeen > getIdleThresholdMs()) {
                            stopHeuristicChatSession('idle-timeout');
                        } else {
                            if (nativeChatActiveCount === 0) flushChatSegments(heuristicSession, heuristicSession.id, now, true, false);
                        }
                    }
                }, 1000);
            };

            void scanEditors();
            startHeuristicLoop();

            subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => { void scanEditors(); }));
            try {
                const anyWindow = /** @type {any} */ (vscode.window);
                if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === 'function') {
                    subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => { try { if (isDebugMode) log.debug('[chat-heuristic] tab change event'); void scanEditors(); } catch (_) { /* ignore */ } }));
                }
            } catch (_) { /* ignore */ }

            subscriptions.push({ dispose: () => { if (heuristicTimer) clearInterval(heuristicTimer); } });

            try {
                if (!state.chatPollHandle) {
                    const CHAT_POLL_MS = 3000;
                    if (isDebugMode) log.debug('[chat-poll] starting poll @', CHAT_POLL_MS, 'ms');
                    state.chatPollHandle = setInterval(() => {
                        try {
                            if (!heuristicSession) return;
                            if (!state.windowFocused) return;
                            if (detectChatTabActive()) {
                                try { deps.recordUserActivity(); } catch (_) { /* ignore */ }
                                heuristicSession.lastSeen = Date.now();
                                if (isDebugMode) log.debug('[chat-poll] refreshed lastSeen', heuristicSession.id);
                            }
                        } catch (_) { /* ignore */ }
                    }, CHAT_POLL_MS);
                    subscriptions.push({ dispose: () => { if (state.chatPollHandle) { clearInterval(state.chatPollHandle); state.chatPollHandle = null; } } });
                }
            } catch (_) { /* ignore */ }

            pauseHandlers.push((now) => {
                if (!heuristicSession) return;
                if (nativeChatActiveCount === 0) flushChatSegments(heuristicSession, heuristicSession.id, heuristicSession.lastSeen || now, true, true);
                heuristicSession = null;
            });
        }

    }

    function dispose() {
        if (state.chatPollHandle) {
            clearInterval(state.chatPollHandle);
            state.chatPollHandle = null;
        }
    }

    return {
        register,
        dispose,
        isChatLikeTab,
        pauseAll,
        resumeAll,
        stopHeuristicChatSession: (reason, preserveExclusive) => stopHeuristicChatSession(reason, preserveExclusive)
    };
}

module.exports = {
    createChatTracker,
    isChatLikeTab
};
