//@ts-check
"use strict";

const vscode = require('vscode');

// VSCode helper (typed as any to avoid strict property lookup issues in JS context)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ext = /** @type {any} */ (require('./VSCodeHelper'));
const uploader = require('./Uploader');
const log = require('./Log');
// Ensure Output Channel exists early so users can see logs even if activation fails later
const outLog = require('./OutputChannelLog');

/**
 * Soft type for global to store our hook flag without NodeJS.Global type (avoids TS mismatch under @ts-check)
 * @typedef {{ [key: symbol]: unknown }} GlobalWithSymbols
 */

// Log unexpected runtime errors once so we can capture full stack traces from the field.
const hookFlag = Symbol.for('codingTracker.errorHookInstalled');
const sharedScope = /** @type {GlobalWithSymbols} */ (/** @type {unknown} */ (global));
if (!sharedScope[hookFlag]) {
    sharedScope[hookFlag] = true;
    /** @type {(err: unknown) => void} */
    const uncaughtHandler = (err) => {
        try {
            const maybeStack = /** @type {{stack?: unknown}} */ (err);
            const stack = maybeStack && typeof maybeStack.stack === 'string' ? maybeStack.stack : String(err);
            log.error(`[uncaughtException] ${stack}`);
        } catch (loggingError) {
            // eslint-disable-next-line no-console
            console.error('[uncaughtException]', err, '(logging failed:', loggingError, ')');
        }
        // Do NOT rethrow—swallow to prevent crashing the extension host on debug/kill
    };
    process.on('uncaughtException', uncaughtHandler);

    /** @type {(reason: unknown, promise: Promise<unknown>) => void} */
    const unhandledHandler = (reason, promise) => {
        void promise; // best effort logging only, keep signature for typings
        try {
            const maybeStack = /** @type {{stack?: unknown}} */ (reason);
            const stack = maybeStack && typeof maybeStack.stack === 'string' ? maybeStack.stack : String(reason);
            log.error(`[unhandledRejection] ${stack}`);
        } catch (loggingError) {
            // eslint-disable-next-line no-console
            console.error('[unhandledRejection]', reason, '(logging failed:', loggingError, ')');
        }
    };
    process.on('unhandledRejection', unhandledHandler);
}
const statusBar = require('./StatusBarManager');
const localServer = require('./LocalServer');
const uploadObject = require('./UploadObject');

const { isDebugMode } = require('./Constants');
const { getProxyConfiguration } = require('./GetProxyConfiguration');
const { generateDiagnoseLogFile } = require('./EnvironmentProbe');

/** How many ms in 1s */
const SECOND = 1000;
/** Hardcoded ingest base URL */
const INGEST_BASE = 'https://codingtracker-ingest.azurewebsites.net/';

/** shortest time to record coding. 5000 means: All coding record divide by 5000  */
const CODING_SHORTEST_UNIT_MS = 5 * SECOND;

/** at least time to upload a watching(open) record */
const AT_LEAST_WATCHING_TIME = 5 * SECOND;

/**
 * means if you are not intently watching time is more than this number
 * the watching track will not be continuously but a new record
 */
const MAX_ALLOW_NOT_INTENTLY_MS = 60 * SECOND;

/** if you have time below not coding(pressing your keyboard), the coding track record will be upload and re-track */
const MAX_CODING_WAIT_TIME = 30 * SECOND;

/** Default AFK detection timeout - 15 minutes of no activity (overridden by settings) */
const AFK_TIMEOUT_MS = 15 * 60 * SECOND;

/** If there a event onFileCoding with scheme in here, just ignore this event */
const INVALID_CODING_DOCUMENT_SCHEMES = [
	//there are will be a `onDidChangeTextDocument` with document scheme `git-index`
	//be emitted when you switch document, so ignore it
    'git-index',
    //since 1.9.0 vscode changed `git-index` to `git`, OK, they are refactoring around source control
    //see more: https://code.visualstudio.com/updates/v1_9#_contributable-scm-providers
    'git',
	//when you just look up output channel content, there will be a `onDidChangeTextDocument` be emitted
	'output',
	//This is a edit event emit from you debug console input box
    'input',
    //This scheme is appeared in vscode global replace diff preview editor
    'private',
    //This scheme is used for markdown preview document
    //It will appear when you edit a markdown with aside preview
    'markdown'
];

const EMPTY = { document: null, textEditor: null };

/** more thinking time from user configuration */
let moreThinkingTime = 0;
/** feature flags from configuration */
let trackTerminal = true;
let trackAIChat = true;
// AFK feature flag and timeout are configurable
let trackAFK = true;
let afkTimeoutMs = AFK_TIMEOUT_MS;
/** current active document*/
/** @type {vscode.TextDocument|null} */
let activeDocument = null;
/** @type {('chat'|'terminal'|null)} Exclusive activity mode to prevent parallel slices */
let exclusiveMode = null;
/** Global user activity tracking for AFK detection */
let lastUserActivity = 0;
let isAFK = false;
/** @type {ReturnType<typeof setInterval>|null} */
let afkCheckTimer = null;
/** Tracking data, record document open time, first coding time and last coding time and coding time long */
const trackData = {
    openTime: 0,
    lastIntentlyTime: 0,
    firstCodingTime: 0,
    codingLong: 0,
    lastCodingTime: 0
};
/** @type {vscode.Terminal|null} */
let activeTerminal = null;
let terminalOpenTime = 0;
// Poll handle for terminal focus detection via keyboard toggles
/** @type {ReturnType<typeof setInterval>|null} */
let terminalPollHandle = null;
// Poll handle for chat panel focus (when no text editor captures focus)
/** @type {ReturnType<typeof setInterval>|null} */
let chatPollHandle = null;
// Throttle for label enumeration when chat undetected
let lastChatEnumLog = 0;
// Global pause/resume hooks for chat sessions (native and heuristic will register handlers)
/** @type {Array<(now:number)=>void>} */
const chatPauseHandlers = [];
/** @type {Array<(now:number)=>void>} */
const chatResumeHandlers = [];
/** @type {(now:number)=>void} */
const pauseAllChatSessions = (now) => { for (const h of chatPauseHandlers) { try { h(now); } catch(e) { void e; } } };
/** @type {(now:number)=>void} */
const resumeAllChatSessions = (now) => { for (const h of chatResumeHandlers) { try { h(now); } catch(e) { void e; } } };
/** @param {number} now */
const resetTrackOpenAndIntentlyTime = (now) => { trackData.openTime = trackData.lastIntentlyTime = now };
/**
 * Normalize a start timestamp (ms). If start is missing/invalid/<=0, synthesize start = now - long (if long available) or now.
 * @param {number} start
 * @param {number} long
 */
function normalizeStart(start, long) {
    try {
        if (typeof start === 'number' && start > 0) return start;
    } catch(_) { /* ignore */ }
    const fallback = Date.now() - (typeof long === 'number' && long > 0 ? long : 0);
    return fallback;
}
/** Sticky focus window for chat when entered via commands (ms) */
let chatCommandFocusUntil = 0;
let terminalExclusiveActive = false;
let heuristicChatActive = false;
// Global hook that heuristic chat block will assign; accepts optional
// reason/preserveExclusive parameters but is a no-op until initialized.
/** @type {(reason?: string, preserveExclusive?: boolean) => void} */
let stopHeuristicChatSession = (reason, preserveExclusive) => { void reason; void preserveExclusive; };
// Tab / panel label or viewType patterns for chat panels & input areas
const chatTabRegex = /copilot|chatgpt|ai\s*chat|codeium.*chat|chat panel|github\.copilot\.chat|^chat$|assistant|ai assistant|codex/i;
const chatTabSchemes = ['vscode-chat', 'vscode-chat-session', 'vscode-chat-editor'];
const chatSchemeRegex = /(chat|assistant)/i;
/**
 * Detect whether a VS Code tab corresponds to a chat/assistant surface.
 * @param {any} tab
 */
const isChatLikeTab = (tab) => {
    if (!tab || typeof tab !== 'object') return false;
    const label = typeof tab.label === 'string' ? tab.label : '';
    const viewType = typeof tab.viewType === 'string' ? tab.viewType : '';
    if (chatTabRegex.test(label) || chatTabRegex.test(viewType)) return true;

    const seenSchemes = new Set();
    /** @param {unknown} uriCandidate */
    const addScheme = (uriCandidate) => {
        try {
            if (!uriCandidate) return;
            if (typeof uriCandidate === 'string') {
                seenSchemes.add(uriCandidate.toLowerCase());
                return;
            }
            const maybeUri = /** @type {{ scheme?: string }} */ (uriCandidate);
            if (maybeUri && typeof maybeUri.scheme === 'string') {
                seenSchemes.add(maybeUri.scheme.toLowerCase());
            }
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
};
/** @type {vscode.ExtensionContext|null} */
let activationContext = null;
/** Suspend open/code tracking when entering an exclusive mode (chat/terminal) */
/** @param {number} now */
function suspendOpenAndCode(now){
    if (trackData.openTime && now && trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
        // finalize current open slice safely
        uploadOpenTrackData(now);
    }
    if (trackData.codingLong) {
        uploadCodingTrackData();
    }
    trackData.openTime = 0;
    trackData.lastIntentlyTime = 0;
    trackData.firstCodingTime = 0;
    trackData.lastCodingTime = 0;
    trackData.codingLong = 0;
}
/** Resume open/code tracking after leaving exclusive mode */
/** @param {number} now */
function resumeOpenAndCode(now){
    if (!activeDocument) return;
    trackData.openTime = now;
    trackData.lastIntentlyTime = now;
    trackData.firstCodingTime = 0;
    trackData.codingLong = 0;
    trackData.lastCodingTime = 0;
}

/** Pause only the open(watching) tracking by finalizing the current open slice up to now */
/** @param {number} now */
function pauseOpenTracking(now) {
    if (trackData.openTime && activeDocument) {
        if (trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
            uploadOpenTrackData(now);
        }
        // pause open tracking (do not immediately start a new slice)
        trackData.openTime = 0;
        trackData.lastIntentlyTime = 0;
    }
}

/** After coding ends, resume watching tracking from the given time */
/** @param {number} now */
// resumeOpenTracking helper removed (inlined where needed)

/** Set status bar mode based on current state (no exclusive/afk) */
function updateModeBasedOnState() {
    if (!statusBar || typeof statusBar.setMode !== 'function') return;
    if (isAFK) { statusBar.setMode('afk'); return; }
    if (heuristicChatActive) { statusBar.setMode('chat'); return; }
    const now = Date.now();
        stopHeuristicChatSession('coding-activity');
    if (exclusiveMode === 'chat' || (chatCommandFocusUntil > now && exclusiveMode !== 'terminal')) { statusBar.setMode('chat'); return; }
    if (exclusiveMode === 'terminal' || terminalExclusiveActive) { statusBar.setMode('terminal'); return; }
    // Consider coding recent if lastCodingTime within the wait window
    if (trackData.firstCodingTime && trackData.lastCodingTime && (now - trackData.lastCodingTime) <= (MAX_CODING_WAIT_TIME + 2000)) {
        statusBar.setMode('coding');
        return;
    }
    if (!windowFocused) { statusBar.setMode(null); return; }
    if (activeDocument) {
        statusBar.setMode('watching');
    } else {
        statusBar.setMode(null);
    }
}

function refreshStatusBarMode() {
    try { updateModeBasedOnState(); } catch(_) { /* ignore */ }
}

// Periodically refresh status to clear lingering states (low frequency to avoid churn)
try {
    const REFRESH_MS = 2000;
    setInterval(() => {
        try { updateModeBasedOnState(); } catch(_) { /* ignore */ }
    }, REFRESH_MS);
    // Attach to extension lifecycle via module-scoped disposer
    // We'll clear this interval in deactivate via process exit; VS Code clears timers on dispose.
} catch(_) { /* ignore */ }

/** Record user activity and exit AFK state if needed */
function recordUserActivity() {
    const now = Date.now();
    lastUserActivity = now;
    
    if (isAFK) {
        isAFK = false;
        try {
            if (statusBar && typeof statusBar.setAFKOff === 'function') {
                statusBar.setAFKOff();
            }
        } catch (e) {
            if (isDebugMode) log.debug('[AFK] Error updating status bar:', e);
        }
        if (isDebugMode) log.debug('[AFK] User returned from AFK');
        
        // Resume tracking if we have an active document and not in exclusive mode
        if (!exclusiveMode && activeDocument) {
            resumeOpenAndCode(now);
        }
        updateModeBasedOnState();
        // Resume chat sessions when user returns, if window is focused
        try { if (windowFocused) resumeAllChatSessions(now); } catch(_) { /* ignore */ }
    }
}

/** Check for AFK state and handle slice finalization */
function checkAFKStatus() {
    try {
        if (!lastUserActivity) return; // No initial activity recorded yet
        
        const now = Date.now();
        const timeSinceActivity = now - lastUserActivity;
        
        // If user is in an exclusive chat session, treat that as active
        // even if we don't see regular editor/terminal events.
        if (!isAFK && timeSinceActivity > afkTimeoutMs && exclusiveMode === 'chat' && windowFocused) {
            lastUserActivity = now;
            return;
        }

        if (!isAFK && timeSinceActivity > afkTimeoutMs) {
            isAFK = true;
            try {
                if (statusBar && typeof statusBar.setAFKOn === 'function') {
                    statusBar.setAFKOn();
                }
            } catch (e) {
                if (isDebugMode) log.debug('[AFK] Error updating status bar:', e);
            }
            if (isDebugMode) log.debug('[AFK] User went AFK, finalizing active slices');
            
            // Finalize all active slices
            if (trackData.openTime && trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
                uploadOpenTrackData(now);
            }
            if (trackData.codingLong) {
                uploadCodingTrackData();
            }
            
            // Finalize terminal slice
            if (activeTerminal && terminalOpenTime) {
                const duration = now - terminalOpenTime;
                if (duration > 0) {
                    uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
                }
                terminalOpenTime = 0;
            }
            // Immediately pause/finalize chat sessions while AFK
            try { pauseAllChatSessions(now); } catch(_) { /* ignore */ }
        }
    } catch (e) {
        if (isDebugMode) log.debug('[AFK] Error in checkAFKStatus:', e);
    }
}

/** Start AFK monitoring */
function startAFKMonitoring() {
    try {
        if (!trackAFK) { if (isDebugMode) log.debug('[AFK] tracking disabled'); return; }
        if (afkCheckTimer) return;
        
        lastUserActivity = Date.now();
        
        // Check AFK status every 30 seconds
        afkCheckTimer = setInterval(checkAFKStatus, 30 * SECOND);
        
        if (isDebugMode) log.debug('[AFK] Started AFK monitoring');
    } catch (e) {
        if (isDebugMode) log.debug('[AFK] Error starting AFK monitoring:', e);
    }
}

/** Stop AFK monitoring */
function stopAFKMonitoring() {
    try {
        if (afkCheckTimer) {
            clearInterval(afkCheckTimer);
            afkCheckTimer = null;
        }
        if (isDebugMode) log.debug('[AFK] Stopped AFK monitoring');
    } catch (e) {
        if (isDebugMode) log.debug('[AFK] Error stopping AFK monitoring:', e);
    }
}

// (reserved) finalizeActiveTerminal removed (inlined logic where needed)
/** Finalize active terminal slice if running */
// (reserved) finalizeActiveTerminal removed (inlined logic where needed)
/** whether VSCode window is currently focused */
let windowFocused = true;
/** GitHub/OAuth API base (refresh endpoint) */
const AUTH_API_BASE = 'https://codingtracker-api.azurewebsites.net';

/**
 * Perform refresh-token exchange to obtain upload token.
 * @param {vscode.ExtensionContext} context
 */
async function performTokenRefresh(context) {
    try {
        const secrets = context.secrets;
        const storedRefresh = await secrets.get('codingTracker.refreshToken');
        if (!storedRefresh) return false;
    const axios = /** @type {any} */ (require('axios'));
    const resp = await axios.post(`${AUTH_API_BASE}/api/token/refresh`, { refreshToken: storedRefresh });
        const uploadToken = resp.data && (resp.data.uploadToken || resp.data.token);
        if (uploadToken) {
            await vscode.workspace.getConfiguration('codingTracker').update('uploadToken', uploadToken, vscode.ConfigurationTarget.Global);
            if (isDebugMode) log.debug('Refreshed upload token via stored refresh token.');
            return true;
        }
        log.debug('Token refresh response missing uploadToken field');
    } catch (e) {
        const err = /** @type {any} */ (e);
        if (isDebugMode) log.debug('Token refresh failed: ' + (err && err.message ? err.message : err));
    }
    return false;
}

/**
 * Command handler: GitHub auth scaffolding.
 * Prompts for refresh token (copied from browser flow) and exchanges it.
 * @param {vscode.ExtensionContext} context
 */
async function githubAuthCommand(context) {
    const input = await vscode.window.showInputBox({
        prompt: 'Paste your CodingTracker refresh token (from browser after GitHub auth)',
        ignoreFocusOut: true,
        password: true,
        placeHolder: 'refresh-token'
    });
    if (!input) {
        vscode.window.showInformationMessage('GitHub auth cancelled.');
        return;
    }
    await context.secrets.store('codingTracker.refreshToken', input);
    const ok = await performTokenRefresh(context);
    if (ok) {
        vscode.window.showInformationMessage('CodingTracker upload token updated successfully.');
    } else {
        vscode.window.showErrorMessage('Failed to refresh upload token. Check the refresh token and try again.');
    }
}

/**
 * Uploading open track data
 * @param {number} now
 */
/** @param {number} now */
function uploadOpenTrackData(now) {
    if (!activeDocument || isIgnoreDocument(activeDocument)) { resetTrackOpenAndIntentlyTime(now); return; }
    // Defensive: if we don't have a valid start time, avoid emitting a record with time=0
    if (!trackData.openTime || trackData.openTime <= 0) { resetTrackOpenAndIntentlyTime(now); return; }
    const longest = trackData.lastIntentlyTime + MAX_ALLOW_NOT_INTENTLY_MS + moreThinkingTime;
    const duration = Math.min(now, longest) - trackData.openTime;
    uploadObject.generateOpen(activeDocument, trackData.openTime, duration).then(uploader.upload);
    resetTrackOpenAndIntentlyTime(now);
}

/** Uploading coding track data and retracking coding track data */
function uploadCodingTrackData() {
    if (activeDocument && !isIgnoreDocument(activeDocument)) {
        uploadObject.generateCode(activeDocument, trackData.firstCodingTime, trackData.codingLong).then(uploader.upload);
    }
    trackData.codingLong = trackData.lastCodingTime = trackData.firstCodingTime = 0;
}

/** Check a TextDocument, Is it a ignore document(null/'inmemory') */
/** @param {vscode.TextDocument|null} doc */
function isIgnoreDocument(doc) { return !doc || doc.uri.scheme == 'inmemory'; }

/** Handler VSCode Event */
const EventHandler = {
    /** @param {vscode.TextEditor} textEditor */
    onIntentlyWatchingCodes: (textEditor) => {
        recordUserActivity(); // Record user activity for AFK detection
        // If user interacts with the editor, ensure we leave terminal/chat modes
        const now = Date.now();
        if (!isAFK && exclusiveMode === 'terminal') {
            try {
                if (activeTerminal && terminalOpenTime) {
                    const duration = now - terminalOpenTime;
                    if (duration > 0) uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
                }
            } catch(_) { /* ignore */ }
            activeTerminal = null;
            terminalOpenTime = 0;
            exclusiveMode = null;
            terminalExclusiveActive = false;
            resumeOpenAndCode(now);
            updateModeBasedOnState();
        } else if (!isAFK && exclusiveMode === 'chat') {
            try { pauseAllChatSessions(now); } catch(_) { /* ignore */ }
            exclusiveMode = null;
            chatCommandFocusUntil = 0;
            resumeOpenAndCode(now);
            updateModeBasedOnState();
        }
        if (isAFK) return; // suppress during AFK
        // if (isDebugMode)
		//   log.debug('watching intently: ' + ext.dumpEditor(textEditor));
        if (!textEditor || !textEditor.document)
            return;//Empty document
        // 'now' already computed above
        //Long time have not intently watching document
        if (now > trackData.lastIntentlyTime + MAX_ALLOW_NOT_INTENTLY_MS + moreThinkingTime) {
            uploadOpenTrackData(now);
            //uploadOpenTrackDate has same expression as below:
            //resetTrackOpenAndIntentlyTime(now);
        } else {
            trackData.lastIntentlyTime = now;
        }
    },
    /** @param {vscode.TextDocument|null} doc */
    onActiveFileChange: (doc) => {
        recordUserActivity(); // Record user activity for AFK detection
        const now = Date.now();
        // If we were in an exclusive mode and switched to a real editor (doc present),
        // finalize that exclusive slice and return to normal tracking. If doc is null,
        // we might be switching to a panel (e.g., chat) and should not exit chat mode.
        if (doc) {
            if (exclusiveMode === 'terminal') {
                try {
                    if (activeTerminal && terminalOpenTime) {
                        const duration = now - terminalOpenTime;
                        if (duration > 0) {
                            uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration)
                                .then(uploader.upload);
                        }
                    }
                } catch(_) { /* ignore */ }
                activeTerminal = null;
                terminalOpenTime = 0;
                exclusiveMode = null;
                try { updateModeBasedOnState(); } catch(_) { /* ignore */ }
            } else if (exclusiveMode === 'chat') {
                try { pauseAllChatSessions(now); } catch(_) { /* ignore */ }
                exclusiveMode = null;
                chatCommandFocusUntil = 0;
                try { updateModeBasedOnState(); } catch(_) { /* ignore */ }
            }
        }
        if (isAFK) return; // suppress during AFK
        // if(isDebugMode)
        //     log.debug('active file change: ' + ext.dumpDocument(doc));
        // If there is a TextEditor opened before changed, should upload the track data
        if (activeDocument) {
            //At least open 5 seconds
            if (trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
                uploadOpenTrackData(now);
            }
            //At least coding 1 second
            if (trackData.codingLong) {
                uploadCodingTrackData();
            }
        }
        activeDocument = doc ? doc : null;
        //Retracking file open time again (Prevent has not retracked open time when upload open tracking data has been called)
        resetTrackOpenAndIntentlyTime(now);
        trackData.codingLong = trackData.lastCodingTime = trackData.firstCodingTime = 0;
        // focus snapshot helper removed; keep call stubbed to avoid runtime errors
    },
    /** @param {vscode.Terminal} terminal */
    onDidOpenTerminal: (terminal) => {
        recordUserActivity(); // Record user activity for AFK detection
        stopHeuristicChatSession('terminal-open', true);
        if (isDebugMode) {
            log.debug(`Terminal opened: ${terminal.name}`);
        }
        // Enter terminal exclusive mode when a terminal is opened (not in chat, window focused)
        if (!isAFK && windowFocused) {
            exclusiveMode = 'terminal';
            terminalExclusiveActive = true;
            suspendOpenAndCode(Date.now());
            refreshStatusBarMode();
        }
        chatCommandFocusUntil = 0;
        activeTerminal = terminal;        
        terminalOpenTime = Date.now();
    },
    /** @param {vscode.Terminal} terminal */
    onDidCloseTerminal: (terminal) => {
        if (isDebugMode) {
            log.debug(`Terminal closed: ${terminal.name}`);
        }
        const allTerms = vscode.window.terminals || [];
        const isSame = activeTerminal && activeTerminal === terminal;
        if (isSame || (activeTerminal && !allTerms.includes(activeTerminal))) {
            const duration = Date.now() - terminalOpenTime;
            if (duration > 0) {
                uploadObject.generateTerminal((activeTerminal ? activeTerminal.name : terminal.name), terminalOpenTime, duration)
                    .then(uploader.upload);
            }
            activeTerminal = null;
            terminalOpenTime = 0;
            // leave terminal exclusive mode if we were in it
            if (exclusiveMode === 'terminal') {
                exclusiveMode = null;
                terminalExclusiveActive = false;
                resumeOpenAndCode(Date.now());
                updateModeBasedOnState();
            }
        }
    },
    /** @param {vscode.Terminal | undefined} terminal */
    onDidChangeActiveTerminal: (terminal) => {
        recordUserActivity(); // Record user activity for AFK detection
        if (isDebugMode) {
            log.debug(`Active terminal changed: ${terminal ? terminal.name : 'None'}`);
        }
        if (activeTerminal && activeTerminal !== (terminal || null)) {
            const duration = Date.now() - terminalOpenTime;
            if (duration > 0) {
                uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration)
                    .then(uploader.upload);
            }
        }
        if (terminal) {
            // Enter terminal mode when window focused
            if (windowFocused && !isAFK) {
                stopHeuristicChatSession('terminal-focus', true);
                exclusiveMode = 'terminal';
                terminalExclusiveActive = true;
                suspendOpenAndCode(Date.now());
                refreshStatusBarMode();
            }
            chatCommandFocusUntil = 0;
            activeTerminal = terminal;
            terminalOpenTime = Date.now();
        } else {
            activeTerminal = null;
            terminalOpenTime = 0;
            if (exclusiveMode === 'terminal') {
                exclusiveMode = null;
                terminalExclusiveActive = false;
                resumeOpenAndCode(Date.now());
                updateModeBasedOnState();
            }
        }
        // focus snapshot helper removed; no-op
    },
    /** handle window focus changes to prevent runaway terminal timing while unfocused */
    /** @param {vscode.WindowState} state */
    onDidChangeWindowState: (state) => {
        if (!state.focused) {
            windowFocused = false;
            // Pause chat sessions when window loses focus
            try { pauseAllChatSessions(Date.now()); } catch(e) { void e; }
            // Do not forcibly clear the mode to avoid flicker back to Watching
            try { updateModeBasedOnState(); } catch(_) { /* ignore */ }
            if (activeTerminal && terminalOpenTime) {
                const duration = Date.now() - terminalOpenTime;
                if (duration > 0) {
                    uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration)
                        .then(uploader.upload);
                }
                terminalOpenTime = 0; // stop timing while unfocused
            }
                // focus snapshot helper removed; no-op
        } else { // regained focus
            if (!windowFocused) {
                windowFocused = true;
                // Resume chat sessions if not AFK
                try { if (!isAFK) resumeAllChatSessions(Date.now()); } catch(e) { void e; }
                if (activeTerminal) {
                    // start a new timing slice for the active terminal
                    terminalOpenTime = Date.now();
                }
            }
        }
    },
    dispose: () => {
        if (activeTerminal) {
            const duration = Date.now() - terminalOpenTime;
            if (duration > 0) {
                uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration)
                    .then(uploader.upload);
            }
            activeTerminal = null;
            terminalOpenTime = 0;
        }
    },
    /** onDidChangeTextDocument actual handler */
    /** @param {vscode.TextDocument} doc */
    onFileCoding: (doc) => {
        recordUserActivity(); // Record user activity for AFK detection
        if (isAFK || exclusiveMode) return; // suppress during AFK or exclusive modes

        // onFileCoding is an alias of event `onDidChangeTextDocument`
        //
        // Here is description of this event excerpt from vscode extension docs page.
        //   (Link: https://code.visualstudio.com/docs/extensionAPI/vscode-api)
        // ```
        //     An event that is emitted when a text document is changed.
        //     This usually happens when the contents changes but also when other things like the dirty - state changes.
        // ```

        // if(isDebugMode)
        //     log.debug('coding: ' + ext.dumpDocument(doc));

        // vscode bug:
        // Event `onDidChangeActiveTextEditor` be emitted with empty document when you open "Settings" editor.
        // Then Event `onDidChangeTextDocument` be emitted even if you has not edited anything in setting document.
        // I ignore empty activeDocument to keeping tracker up and avoiding exception like follow:
        //    TypeError: Cannot set property 'lineCount' of null  // activeDocument.lineCount = ...
        if (!activeDocument)
            return ;

		// Ignore the invalid coding file schemes
        if (!doc || INVALID_CODING_DOCUMENT_SCHEMES.indexOf(doc.uri.scheme) >= 0 )
            return;

        if (isDebugMode) {
            // fragment in this if condition is for catching unknown document scheme
            const { uri } = doc; const { scheme } = uri;
            if (scheme != 'file' &&
                scheme != 'untitled' &&
                scheme != 'debug' &&
                //scheme in vscode user settings (or quick search bar in user settings)
                scheme != 'vscode' &&
                //scheme in vscode ineractive playground
                scheme != 'walkThroughSnippet') {
                log.debug(ext.dumpDocument(doc));
            }
        }

    const now = Date.now();
        //If time is too short to calling this function then just ignore it
        if (now - CODING_SHORTEST_UNIT_MS < trackData.lastCodingTime)
            return;
    // Removed attempt to modify read-only property lineCount

        //If is first time coding in this file, record time
        if (!trackData.firstCodingTime) {
            // First coding event: ensure watching slice is closed to avoid overlap
            pauseOpenTracking(now);
            trackData.firstCodingTime = now;
        }
        //If too long time to recoding, so upload old coding track and retracking
        else if (trackData.lastCodingTime < now - MAX_CODING_WAIT_TIME - moreThinkingTime) {//30s
            uploadCodingTrackData()
            //Reset first coding time
            trackData.firstCodingTime = now;
        }
        trackData.codingLong += CODING_SHORTEST_UNIT_MS;
        trackData.lastCodingTime = now;
        refreshStatusBarMode();
    }
};

/** when extension launch or vscode config change */
/**
 * Apply configuration changes
 */
async function updateConfigurations() {
    //CodingTracker Configuration
    const extensionCfg = ext.getConfig('codingTracker');
    /** @param {unknown} v @returns {string} */
    const sanitize = (v) => (v === undefined || v === null || v === 'undefined') ? '' : String(v);
    const uploadTokenRaw = extensionCfg.get('uploadToken');
    const connectionModeRaw = extensionCfg.get('connectionMode');
    const computerId = sanitize(extensionCfg.get('computerId'));
    const enableStatusBar = extensionCfg.get('showStatus');
    const mttRaw = extensionCfg.get('moreThinkingTime');
    let mtt = 0;
    if (typeof mttRaw === 'number') mtt = mttRaw; else if (typeof mttRaw === 'string') { const parsed = parseInt(mttRaw, 10); if (!isNaN(parsed)) mtt = parsed; }
    const uploadTokenCfg = sanitize(uploadTokenRaw);
    // Prefer secret-stored token; migrate from config once
    let uploadToken = '';
    try {
        if (activationContext && activationContext.secrets) {
            const secret = await activationContext.secrets.get('codingTracker.uploadToken');
            if (secret && secret.trim()) {
                uploadToken = secret.trim();
            } else if (uploadTokenCfg) {
                await activationContext.secrets.store('codingTracker.uploadToken', uploadTokenCfg);
                uploadToken = uploadTokenCfg;
                try {
                    // Clear from settings to avoid leakage (global)
                    await vscode.workspace.getConfiguration('codingTracker').update('uploadToken', '', vscode.ConfigurationTarget.Global);
                    // Also clear from workspace if present
                    await vscode.workspace.getConfiguration('codingTracker').update('uploadToken', '', vscode.ConfigurationTarget.Workspace);
                } catch(_) { /* ignore */ }
                try { if (isDebugMode) log.debug('[secrets] migrated uploadToken from settings to secret storage'); } catch(_) { /* ignore */ }
                try { vscode.window.showInformationMessage('CodingTracker: Upload token migrated to secure storage.'); } catch(_) { /* ignore */ }
            }
        } else {
            uploadToken = uploadTokenCfg;
        }
    } catch(e) {
        uploadToken = uploadTokenCfg; // fallback
        try { if (isDebugMode) log.debug('[secrets] failed to read/migrate secret token', e); } catch(_) { /* ignore */ }
    }

    // Select base server by connection mode. In 'desktop' mode, uploads target the
    // SlashCoded desktop Local API on localhost; in 'cloud' mode, they use legacy ingest.
    /** @type {'desktop'|'cloud'} */
    let connectionMode = 'desktop';
    if (typeof connectionModeRaw === 'string') {
        const lower = connectionModeRaw.toLowerCase();
        if (lower === 'cloud' || lower === 'desktop') connectionMode = /** @type {'desktop'|'cloud'} */ (lower);
    }
    // For desktop mode, we let the uploader discover the actual Local API URL via
    // handshake and do not configure a fallback cloud endpoint.
    const configuredServer = connectionMode === 'cloud' ? INGEST_BASE : `http://127.0.0.1:${process.env.SLASHCODED_DESKTOP_PORT || 5292}/`;

    const httpCfg = ext.getConfig('http');
    const baseHttpProxy = httpCfg ? httpCfg.get('proxy') : undefined;

    const overwriteHttpProxy = extensionCfg.get('proxy');
    const proxy = getProxyConfiguration(baseHttpProxy, overwriteHttpProxy);

    // feature flags
    trackTerminal = extensionCfg.get('shouldTrackTerminal') !== false;
    trackAIChat = extensionCfg.get('shouldTrackAIChat') !== false;
    // AFK flags
    trackAFK = extensionCfg.get('afkEnabled') !== false;
    const afkMinRaw = extensionCfg.get('afkTimeoutMinutes');
    if (typeof afkMinRaw === 'number') {
        afkTimeoutMs = Math.max(1, Math.min(180, afkMinRaw)) * 60 * SECOND;
    } else if (typeof afkMinRaw === 'string') {
        const parsed = parseInt(afkMinRaw, 10);
        if (!isNaN(parsed)) afkTimeoutMs = Math.max(1, Math.min(180, parsed)) * 60 * SECOND;
    } else {
        afkTimeoutMs = AFK_TIMEOUT_MS;
    }

    // fixed wrong more thinking time configuration value
    if (isNaN(mtt)) mtt = 0;
    if (mtt < -15 * SECOND) mtt = -15 * SECOND;
    moreThinkingTime = mtt;

    // Configure uploader; in desktop mode it will discover and prefer the Local API
    // via /api/host/handshake, while cloud mode sends directly to the ingest base.
    uploader.set(configuredServer, uploadToken, proxy);
    try { uploader.setConnectionMode(connectionMode); } catch(e) { if (isDebugMode) log.debug('Failed to set connectionMode on uploader', e); }
    // configure uploader timeout if provided
    const timeoutCfgRaw = extensionCfg.get('uploadTimeoutMs');
    if (typeof timeoutCfgRaw === 'number') {
        if (timeoutCfgRaw > 0) {
            try { uploader.configureTimeout(timeoutCfgRaw); } catch(err) { log.debug('Failed to configure timeout: ' + err); }
        }
    } else if (typeof timeoutCfgRaw === 'string') {
        const timeoutCfg = parseInt(timeoutCfgRaw, 10);
        if (!isNaN(timeoutCfg) && timeoutCfg > 0) {
            try { uploader.configureTimeout(timeoutCfg); } catch(err) { log.debug('Failed to configure timeout: ' + err); }
        }
    }
    const discoveryTimeoutRaw = extensionCfg.get('desktopDiscoveryTimeoutMs');
    if (typeof discoveryTimeoutRaw === 'number' && discoveryTimeoutRaw > 0) {
        try { uploader.configureDiscoveryTimeout(discoveryTimeoutRaw); } catch(err) { log.debug('Failed to configure discovery timeout: ' + err); }
    } else if (typeof discoveryTimeoutRaw === 'string') {
        const parsed = parseInt(discoveryTimeoutRaw, 10);
        if (!isNaN(parsed) && parsed > 0) {
            try { uploader.configureDiscoveryTimeout(parsed); } catch(err) { log.debug('Failed to configure discovery timeout: ' + err); }
        }
    }
    uploadObject.init(computerId || `unknown-${require('os').platform()}`);

    localServer.updateConfig();
    statusBar.init(enableStatusBar);
    try { log.debug(`[init] Status bar initialized (enabled=${!!enableStatusBar})`); } catch(_) { /* ignore */ }
    // Restart AFK monitor based on new settings
    try {
        if (trackAFK) { stopAFKMonitoring(); startAFKMonitoring(); }
        else { stopAFKMonitoring(); }
        if (isDebugMode) log.debug(`[AFK] config updated: enabled=${trackAFK}, timeoutMs=${afkTimeoutMs}`);
    } catch(e) { if (isDebugMode) log.debug('[AFK] monitor restart failed', e); }
    updateModeBasedOnState();
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
    // Keep context available for config-driven restarts of monitors
    activationContext = context;
    // Initialize output channel up-front for visibility
    outLog.start();
    outLog.debug('CodingTracker: activating extension...');
	generateDiagnoseLogFile();

	//Declare for add disposable inside easy
    const subscriptions = context.subscriptions;

    uploadObject.init();

    //Initialize local server(launch local server if localServer config is true)
    localServer.init(context);

    //Initialize Uploader Module
    uploader.init(context);
    //Update configurations first time
    updateConfigurations();
    // Probe desktop app on activation
    try { void uploader.rediscover(); } catch(_) { /* ignore */ }

    //Listening workspace configurations change
    vscode.workspace.onDidChangeConfiguration(updateConfigurations);

    //Tracking the file display when vscode open
    EventHandler.onActiveFileChange( (vscode.window.activeTextEditor || EMPTY).document || null);

    //Listening vscode event to record coding activity
    subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => EventHandler.onFileCoding( (e || EMPTY).document)  ));
    subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => EventHandler.onActiveFileChange((e || EMPTY).document || null )  ));
    //the below event happen means you change the cursor in the document.
    //So It means you are watching so intently in some ways
    subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => EventHandler.onIntentlyWatchingCodes((e || EMPTY).textEditor)  ));

    // Start AFK monitoring after status bar is initialized
    startAFKMonitoring();
    subscriptions.push({ dispose: stopAFKMonitoring });

    // AFK commands: enable, disable, toggle
    try {
    /** @param {boolean} enabled */
    const setAfkEnabled = async (enabled) => {
            // persist in user settings
            await vscode.workspace.getConfiguration('codingTracker').update('afkEnabled', enabled, vscode.ConfigurationTarget.Global);
            // reflect immediately
            trackAFK = !!enabled;
            stopAFKMonitoring();
            if (trackAFK) startAFKMonitoring(); else {
                isAFK = false; try { statusBar.setAFKOff(); } catch(_) { /* ignore */ }
            }
            vscode.window.showInformationMessage(`CodingTracker: AFK ${enabled ? 'enabled' : 'disabled'}`);
        };
        subscriptions.push(vscode.commands.registerCommand('codingTracker.afkEnable', () => setAfkEnabled(true)));
        subscriptions.push(vscode.commands.registerCommand('codingTracker.afkDisable', () => setAfkEnabled(false)));
        subscriptions.push(vscode.commands.registerCommand('codingTracker.afkToggle', async () => {
            const cfg = vscode.workspace.getConfiguration('codingTracker');
            const cur = cfg.get('afkEnabled') !== false;
            await setAfkEnabled(!cur);
        }));
    } catch(e) { if (isDebugMode) log.debug('[AFK] command registration failed', e); }

    // Terminal tracking events
    if (trackTerminal) {
        subscriptions.push(vscode.window.onDidOpenTerminal(EventHandler.onDidOpenTerminal));
        subscriptions.push(vscode.window.onDidCloseTerminal(EventHandler.onDidCloseTerminal));
        subscriptions.push(vscode.window.onDidChangeActiveTerminal((t) => EventHandler.onDidChangeActiveTerminal(t)));
        subscriptions.push(vscode.window.onDidChangeWindowState(EventHandler.onDidChangeWindowState));
        // If a terminal is already active on startup, begin tracking it
        try {
            const t = vscode.window.activeTerminal;
            if (t) {
                EventHandler.onDidChangeActiveTerminal(t);
            }
        } catch(_) { /* ignore */ }
        // Start lightweight polling to detect keyboard-only terminal focus toggles (e.g., Ctrl+Ö) that may not emit change events reliably across platforms
        try {
            if (!terminalPollHandle) {
                const POLL_MS = 1500; // low frequency to minimize overhead
                if (isDebugMode) log.debug('[terminal-poll] starting poll @', POLL_MS, 'ms');
                terminalPollHandle = setInterval(() => {
                    try {
                        const current = vscode.window.activeTerminal || null;
                        // Detect if a chat-like UI has focus (panel/tab) and should suppress terminal continuation
                        let chatUIFocused = false;
                        try {
                            const anyWindow = /** @type {any} */ (vscode.window);
                            const groups = anyWindow.tabGroups && anyWindow.tabGroups.all ? anyWindow.tabGroups.all : [];
                            for (const g of groups) {
                                if (!g || !g.activeTab) continue;
                                if (isChatLikeTab(g.activeTab)) { chatUIFocused = true; break; }
                            }
                        } catch(_) { /* ignore */ }

                        if (chatUIFocused && activeTerminal) {
                            // Cut off terminal timing since user moved into chat panel without terminal close
                            const duration = Date.now() - terminalOpenTime;
                            if (duration > 0) {
                                uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
                                if (isDebugMode) log.debug('[terminal-poll] terminal slice ended (chat focus)');
                            }
                            activeTerminal = null; terminalOpenTime = 0;
                            if (exclusiveMode === 'terminal') { exclusiveMode = null; terminalExclusiveActive = false; updateModeBasedOnState(); }
                        } else if (!chatUIFocused) {
                            // If there is no active terminal but we think we have one, finalize and clear
                            if (!current && activeTerminal) {
                                // Terminal focus lost without close event (e.g., switched away via keyboard)
                                const duration = Date.now() - terminalOpenTime;
                                if (duration > 0) {
                                    uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
                                    if (isDebugMode) log.debug('[terminal-poll] synthesized terminal slice (focus lost)');
                                }
                                activeTerminal = null; terminalOpenTime = 0;
                                if (exclusiveMode === 'terminal') { exclusiveMode = null; terminalExclusiveActive = false; updateModeBasedOnState(); }
                            }
                        }
                    } catch(_) { /* ignore */ }
                }, POLL_MS);
                subscriptions.push({ dispose: () => { if (terminalPollHandle) { clearInterval(terminalPollHandle); terminalPollHandle = null; } } });
            }
        } catch(e) { if (isDebugMode) log.debug('terminal poll init failed', e); }
    }
    // Global lightweight activity hooks to avoid AFK while interacting with VS Code UI
    try {
        // Mark activity on any executed command (keyboard shortcuts, palette, etc.)
        const anyCommands = /** @type {any} */ (vscode.commands);
        if (anyCommands && typeof anyCommands.onDidExecuteCommand === 'function') {
            subscriptions.push(anyCommands.onDidExecuteCommand((/** @type {any} */ e) => {
                try { recordUserActivity(); } catch(_) { /* ignore */ }
                try {
                    const id = e && typeof e.command === 'string' ? e.command : '';
                    try { if (isDebugMode) log.debug('[cmd]', id); } catch(_) { /* ignore */ }
                    const now = Date.now();
                    // Detect terminal focus/open commands
                    if (/terminal/i.test(id) && /(focus|toggle|new|show|open)/i.test(id)) {
                        if (!isAFK && windowFocused) {
                            stopHeuristicChatSession('terminal-command', true);
                            exclusiveMode = 'terminal';
                            terminalExclusiveActive = true;
                            suspendOpenAndCode(now);
                            refreshStatusBarMode();
                            if (!activeTerminal && vscode.window.activeTerminal) {
                                activeTerminal = vscode.window.activeTerminal;
                                terminalOpenTime = now;
                            } else if (activeTerminal && !terminalOpenTime) {
                                terminalOpenTime = now;
                            }
                        }
                    }
                    // Detect chat-related commands broadly (no secondary qualifier required)
                    else if (/(copilot|chat|assistant|gpt|codeium)/i.test(id)
                             || /workbench\..*chat/i.test(id)
                             || /github\.copilot\./i.test(id)) {
                        if (!isAFK && windowFocused) {
                            exclusiveMode = 'chat';
                            suspendOpenAndCode(now);
                            refreshStatusBarMode();
                            // Keep Chat visible briefly even if we don't get further signals
                            chatCommandFocusUntil = now + 30000; // 30s sticky window
                        }
                    }
                    // Detect focusing back to the editor to exit exclusive modes
                    else if (/workbench\.action\.focus.*Editor/i.test(id)) {
                        if (exclusiveMode === 'terminal') {
                            if (activeTerminal && terminalOpenTime) {
                                const dur = now - terminalOpenTime; if (dur > 0) uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, dur).then(uploader.upload);
                            }
                            activeTerminal = null; terminalOpenTime = 0; exclusiveMode = null; chatCommandFocusUntil = 0; resumeOpenAndCode(now); updateModeBasedOnState();
                        } else if (exclusiveMode === 'chat') {
                            try { pauseAllChatSessions(now); } catch(_) { /* ignore */ }
                            exclusiveMode = null; chatCommandFocusUntil = 0; resumeOpenAndCode(now); updateModeBasedOnState();
                        }
                    }
                } catch(_) { /* ignore */ }
            }));
        }
    } catch(_) { /* ignore */ }
    try {
        // Changing visible editors implies user interaction
        subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => recordUserActivity()));
    } catch(_) { /* ignore */ }
    try {
        const anyWindow = /** @type {any} */ (vscode.window);
        if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === 'function') {
            subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => recordUserActivity()));
        }
        // Also track terminal interaction state changes and reflect Terminal mode
        if (typeof vscode.window.onDidChangeTerminalState === 'function') {
            subscriptions.push(vscode.window.onDidChangeTerminalState((term) => {
                try {
                    recordUserActivity();
                    if (term === vscode.window.activeTerminal && term && term.state && term.state.isInteractedWith) {
                        const now = Date.now();
                        if (!isAFK && windowFocused) {
                            stopHeuristicChatSession('terminal-state', true);
                            exclusiveMode = 'terminal';
                            terminalExclusiveActive = true;
                            suspendOpenAndCode(now);
                            refreshStatusBarMode();
                            if (!activeTerminal || activeTerminal.name !== term.name) {
                                activeTerminal = term; terminalOpenTime = now;
                            }
                        }
                    }
                } catch(_) { /* ignore */ }
            }));
        }
    } catch(_) { /* ignore */ }
    // Record refocus as activity so AFK exits quickly (independent of terminal tracking)
    try {
        subscriptions.push(vscode.window.onDidChangeWindowState((state) => { if (state.focused) recordUserActivity(); }));
    } catch(_) { /* ignore */ }
    // AI Chat tracking events (native + heuristic fallback)
    if (trackAIChat) {
        // Hardcoded chat tracking parameters (previously configurable)
        const maybeChat = /** @type {any} */ (vscode).chat;
        const hasNative = !!(maybeChat && typeof maybeChat.onDidOpenChatSession === 'function' && typeof maybeChat.onDidDisposeChatSession === 'function');
        try {
            if (isDebugMode) {
                log.debug('[chat-native] vscode.chat available =', !!maybeChat, 'handlers =', hasNative ? 'ok' : 'missing');
            }
        } catch(_) { /* ignore */ }
        // Track whether native chat sessions are active to avoid double-counting with heuristics
        let nativeChatActiveCount = 0;
        const chatSliceIntervalSec = 120; // fixed periodic slice interval (seconds), set 0 to disable
        const enableHeuristics = true; // master switch for heuristic mode
        const heuristicIdleMs = 60000; // finalize heuristic session after 60s of invisibility
        const heuristicLossGraceMs = 4000; // tolerate brief focus glitches (ms) before ending chat
        const heuristicSchemes = ['vscode-chat', 'vscode-chat-session', 'vscode-chat-editor'];
        // Do not treat markdown as chat to avoid misclassification of .md editing as AI chat
        const heuristicLangs = ['copilot-chat', 'chat'];
        // Additional heuristic clues (file names / patterns) for editors that don't expose special scheme
        const heuristicFilePatterns = [
            /copilot.*chat/i,
            /chatgpt/i,
            /ai[- ]?chat/i
        ];

        /**
         * Emit a chat slice upload
         * @param {string} provider
         * @param {string} sessionId
         * @param {number} start
         * @param {number} now
         * @param {boolean} heuristic
         */
    /**
     * @param {string} provider
     * @param {string} sessionId
     * @param {number} start
     * @param {number} now
     * @param {boolean} heuristic
     * @param {number} seq
     * @param {boolean} isFinal
     */
    const emitChatSlice = (provider, sessionId, start, now, heuristic, seq, isFinal) => {
            const duration = now - start;
            uploadObject.generateChat(provider, sessionId, start, duration, 0, 0).then(obj => {
        const markers = [];
                if (heuristic) markers.push('heuristic');
                if (typeof seq === 'number') markers.push('seq=' + seq);
                if (isFinal) markers.push('final');
                const markerStr = markers.join(';');
                obj.r2 = obj.r2 ? (obj.r2 + (markerStr ? (';' + markerStr) : '')) : markerStr;
                uploader.upload(obj);
            });
        };

        // Native session API path
        if (hasNative) {
            const chatSessions = new Map(); // id -> {provider,start,lastSliceTime, seq:number, paused?:boolean}
            /** @param {any} session */
            const onDidOpenChatSession = (session) => {
                // record user interaction to avoid immediate AFK marking
                try { recordUserActivity(); } catch(_) { /* ignore */ }
                // Do not record activity artificially; depend on real interactions
                const start = Date.now();
                let providerId = 'unknown';
                try {
                    if (session && session.provider) {
                        providerId = session.provider.id || session.provider.label || 'unknown';
                    } else if (session && session.providerId) {
                        providerId = session.providerId;
                    }
                } catch(_) { /* ignore */ }
                try {
                    if (isDebugMode) log.debug('[chat-native] onDidOpenChatSession', 'id=', session && session.id, 'provider=', providerId);
                } catch(_) { /* ignore */ }
                
                // Enter chat exclusive mode
                exclusiveMode = 'chat';
                suspendOpenAndCode(start);
                refreshStatusBarMode();
                
                nativeChatActiveCount++;
                chatSessions.set(session.id, { provider: providerId, start, lastSliceTime: start, seq: 0 });
                emitChatSlice(providerId, session.id, start, start, false, 0, false); // immediate start slice
            };
            subscriptions.push(maybeChat.onDidOpenChatSession(onDidOpenChatSession));

            if (chatSliceIntervalSec > 0) {
                const intervalHandle = setInterval(() => {
                    const now = Date.now();
                    for (const [id, rec] of chatSessions.entries()) {
                        if (!windowFocused || isAFK || rec.paused) continue;
                        if (now - rec.lastSliceTime >= chatSliceIntervalSec * 1000) {
                            rec.seq += 1;
                            emitChatSlice(rec.provider, id, rec.start, now, false, rec.seq, false);
                            rec.lastSliceTime = now;
                        }
                    }
                }, Math.min(chatSliceIntervalSec * 1000, 5 * 60 * 1000));
                subscriptions.push({ dispose: () => clearInterval(intervalHandle) });
            }

            subscriptions.push(maybeChat.onDidDisposeChatSession(/** @type {(session:any)=>void} */(session => {
                try {
                    if (isDebugMode) log.debug('[chat-native] onDidDisposeChatSession', 'id=', session && session.id);
                } catch(_) { /* ignore */ }
                const rec = chatSessions.get(session.id);
                if (rec) {
                    const now = Date.now();
                    rec.seq += 1;
                    emitChatSlice(rec.provider, session.id, rec.start, now, false, rec.seq, true);
                    chatSessions.delete(session.id);
                    nativeChatActiveCount = Math.max(0, nativeChatActiveCount - 1);
                    
                    // Exit chat exclusive mode if no other chat sessions
                    if (chatSessions.size === 0 && exclusiveMode === 'chat') {
                        exclusiveMode = null;
                        resumeOpenAndCode(now);
                        updateModeBasedOnState();
                    }
                }
            })));

            // Register pause/resume handlers for native chat
            chatPauseHandlers.push((now) => {
                try { if (isDebugMode) log.debug('[chat-native] pause-all at', new Date(now).toISOString()); } catch(_) { /* ignore */ }
                for (const [id, rec] of chatSessions.entries()) {
                    if (rec.paused) continue;
                    rec.seq += 1;
                    emitChatSlice(rec.provider, id, rec.start, now, false, rec.seq, true);
                    rec.paused = true;
                }
            });
            chatResumeHandlers.push((now) => {
                try { if (isDebugMode) log.debug('[chat-native] resume-all at', new Date(now).toISOString()); } catch(_) { /* ignore */ }
                for (const [id, rec] of chatSessions.entries()) {
                    if (!rec.paused) continue;
                    rec.paused = false;
                    rec.start = now;
                    rec.lastSliceTime = now;
                    rec.seq += 1;
                    emitChatSlice(rec.provider, id, rec.start, now, false, rec.seq, false);
                }
            });
        } else {
            try {
                if (isDebugMode) log.debug('[chat-native] vscode.chat not available; relying on heuristics only');
            } catch(_) { /* ignore */ }
        }

        // Heuristic path (also enabled when native exists, but uploads suppressed while native is active)
        if (enableHeuristics) {
            /** @type {{id:string,start:number,lastSeen:number,provider:string,seq:number,nextSliceTs:number}|null} */
            let heuristicSession = null; // {id,start,lastSeen,provider,seq,nextSliceTs}
            /** @type {ReturnType<typeof setInterval>|null} */
            let heuristicTimer = null;
            const providerName = 'heuristic.chat';
            const genSessionId = () => 'heuristic-' + Date.now().toString(36);
            let heuristicLossSince = 0;

            stopHeuristicChatSession = (reason = 'manual', preserveExclusive = false) => {
                if (!heuristicSession) return;
                const now = Date.now();
                heuristicSession.seq += 1;
                if (nativeChatActiveCount === 0) {
                    emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, heuristicSession.lastSeen, true, heuristicSession.seq, true);
                }
                if (isDebugMode) log.debug('[chat-heuristic] session end', heuristicSession.id, reason);
                heuristicSession = null;
                heuristicLossSince = 0;
                heuristicChatActive = false;
                refreshStatusBarMode();
                if (!preserveExclusive && exclusiveMode === 'chat') {
                    exclusiveMode = null;
                    chatCommandFocusUntil = 0;
                    resumeOpenAndCode(now);
                    updateModeBasedOnState();
                }
            };

            // augment: detect chat via tab groups (view containers that aren't traditional text editors)
            const detectChatTabActive = () => {
                try {
                    const anyWindow = /** @type {any} */ (vscode.window);
                    const groups = anyWindow.tabGroups && anyWindow.tabGroups.all ? anyWindow.tabGroups.all : [];
                    /** @type {string[]} */
                    const labels = [];
                    for (const g of groups) {
                        if (!g || !g.activeTab) continue;
                        const t = g.activeTab;
                        const label = (t.label || '');
                        const viewType = (t.viewType || '');
                        labels.push(label + (viewType && viewType !== label ? ('<' + viewType + '>') : ''));
                        if (isChatLikeTab(t)) {
                            return true;
                        }
                    }
                    // If we didn't detect chat, occasionally enumerate labels for diagnostics
                    const now = Date.now();
                    if (isDebugMode && now - lastChatEnumLog > 15000) {
                        lastChatEnumLog = now;
                        if (labels.length) log.debug('[chat-heuristic] tab labels (no-hit):', labels.join(' | '));
                    }
                } catch(_) { /* ignore */ }
                return false;
            };

            const scanEditors = () => {
                // Do not synthesize activity; also stop while unfocused or AFK
                if (isAFK || !windowFocused) return;
                if (exclusiveMode === 'terminal') {
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
                            // Attempt to detect Copilot Chat untitled buffers by content signature (lightweight)
                            const firstLine = doc.lineCount > 0 ? doc.lineAt(0).text : '';
                            if (/^#?\s*copilot/i.test(firstLine) || /chat/i.test(firstLine)) return true;
                        }
                        if (heuristicFilePatterns.some(r => r.test(fileName))) return true;
                    } catch (_) { return false; }
                    return false;
                });
                const chatTabActive = !chatLike && detectChatTabActive();
                if (chatLike || chatTabActive) {
                    heuristicChatActive = true;
                    heuristicLossSince = 0;
                    const stickyNow = Date.now();
                    chatCommandFocusUntil = Math.max(chatCommandFocusUntil, stickyNow + 10000);
                    if (exclusiveMode !== 'chat') {
                        exclusiveMode = 'chat';
                        suspendOpenAndCode(now);
                        refreshStatusBarMode();
                    }
                    if (!heuristicSession) {
                        // Enter chat session
                        heuristicSession = { id: genSessionId(), start: now, lastSeen: now, provider: providerName, seq: 0, nextSliceTs: now + (chatSliceIntervalSec * 1000) };
                        if (nativeChatActiveCount === 0) {
                            emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, heuristicSession.start, true, 0, false);
                        }
                        if (isDebugMode) log.debug('[chat-heuristic] session start', heuristicSession.id, chatLike ? 'editor' : 'tab');
                        // finalize any existing open/coding slice to avoid overlapping classification
                        try {
                            const now2 = Date.now();
                            if (activeDocument) {
                                if (trackData.openTime && trackData.openTime < now2 - AT_LEAST_WATCHING_TIME) uploadOpenTrackData(now2);
                                if (trackData.codingLong) uploadCodingTrackData();
                            }
                        } catch(_) { /* ignore */ }
                    } else {
                        heuristicSession.lastSeen = now;
                    }
                } else if (heuristicSession) {
                    if (!heuristicLossSince) heuristicLossSince = now;
                    if (now - heuristicLossSince > heuristicLossGraceMs) {
                        stopHeuristicChatSession('focus-loss');
                    }
                } else {
                    heuristicChatActive = false;
                    heuristicLossSince = 0;
                }
            };

            const startHeuristicLoop = () => {
                if (heuristicTimer) return;
                heuristicTimer = setInterval(() => {
                    scanEditors();
                    if (heuristicSession) {
                        const now = Date.now();
                        if (isAFK || !windowFocused) {
                            stopHeuristicChatSession('afk-unfocused');
                            return;
                        }
                        if (now - heuristicSession.lastSeen > heuristicIdleMs) {
                            stopHeuristicChatSession('idle-timeout');
                        } else if (chatSliceIntervalSec > 0 && now >= heuristicSession.nextSliceTs) {
                            heuristicSession.seq += 1;
                            if (nativeChatActiveCount === 0) {
                                emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, now, true, heuristicSession.seq, false);
                            }
                            heuristicSession.nextSliceTs = now + (chatSliceIntervalSec * 1000);
                            if (isDebugMode) log.debug('[chat-heuristic] periodic slice', heuristicSession && heuristicSession.id, 'seq', heuristicSession.seq);
                        }
                    }
                }, Math.min(Math.max(15000, chatSliceIntervalSec > 0 ? chatSliceIntervalSec * 1000 : 30000), 5 * 60 * 1000));
            };

            scanEditors();
            startHeuristicLoop();
            subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(scanEditors));
            // Also react to tab group changes (keyboard shortcuts that switch groups/editors)
            try {
                const anyWindow = /** @type {any} */ (vscode.window);
                if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === 'function') {
                    subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => {
                        try {
                            if (isDebugMode) log.debug('[chat-heuristic] tab change event');
                            scanEditors();
                        } catch(_) { /* ignore */ }
                    }));
                }
            } catch(_) { /* ignore */ }
            subscriptions.push({ dispose: () => { if (heuristicTimer) clearInterval(heuristicTimer); } });

            // Additional poll to keep session alive when only panel/input focused (no visible text editors changing)
            try {
                if (!chatPollHandle) {
                    const CHAT_POLL_MS = 3000;
                    if (isDebugMode) log.debug('[chat-poll] starting poll @', CHAT_POLL_MS, 'ms');
                    chatPollHandle = setInterval(() => {
                        try {
                            if (!heuristicSession) return; // no active session
                            if (!windowFocused) return; // don't keep alive while unfocused
                            if (detectChatTabActive()) {
                                // Treat typing in chat as activity to avoid AFK
                                try { recordUserActivity(); } catch(_) { /* ignore */ }
                                heuristicSession.lastSeen = Date.now();
                                if (isDebugMode) log.debug('[chat-poll] refreshed lastSeen', heuristicSession.id);
                            }
                        } catch(_) { /* ignore */ }
                    }, CHAT_POLL_MS);
                    subscriptions.push({ dispose: () => { if (chatPollHandle) { clearInterval(chatPollHandle); chatPollHandle = null; } } });
                }
            } catch(_) { /* ignore */ }

            // Register pause handler for heuristic chat; resume handled by scanning
            chatPauseHandlers.push((now) => {
                if (!heuristicSession) return;
                heuristicSession.seq += 1;
                if (nativeChatActiveCount === 0) {
                    emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, heuristicSession.lastSeen || now, true, heuristicSession.seq, true);
                }
                heuristicSession = null;
            });
        }
    }

    // Safeguard: if a heuristic chat session is active, when we would normally emit an 'open' event for an untitled/plaintext suspected chat doc, also emit a chat slice.
    // Light-touch approach: wrap uploadObject.generateOpen to mirror with chat when pattern matches and current heuristic session active.
    // NOTE: This is defensive; native session path unaffected.
    try {
        const originalGenerateOpen = uploadObject.generateOpen;
        uploadObject.generateOpen = function(doc, start, duration) {
            // ensure start is a valid unix-ms timestamp before generating
            const safeStart = normalizeStart(start, duration);
            const maybe = originalGenerateOpen.call(uploadObject, doc, safeStart, duration);
            // We cannot access heuristicSession here directly (it is closure-scoped). Instead, we redundantly check patterns.
            // If doc looks like chat (plaintext + untitled + first line marker), also schedule a synthetic chat slice after open resolves.
            return maybe.then(obj => {
                try {
                    if (doc && doc.languageId === 'plaintext' && /untitled/i.test(doc.fileName || '')) {
                        const firstLine = doc.lineCount > 0 ? doc.lineAt(0).text : '';
                        if (/chat|copilot/i.test(firstLine)) {
                            // Emit a parallel chat slice (duration mirrors open).
                            const safeChatStart = normalizeStart(start, duration);
                            uploadObject.generateChat('heuristic.chat.openMirror', 'mirror-' + Date.now().toString(36), safeChatStart, duration, 0, 0)
                                .then(o => { o.r2 = (o.r2 ? o.r2 + ';heuristic-mirror' : 'heuristic-mirror'); uploader.upload(o); });
                        }
                    }
                } catch(_) { /* ignore */ }
                return obj;
            });
        };
    } catch(e) { if (isDebugMode) log.debug('Failed to install open->chat mirror safeguard', e); }

    // Wrap other generators to normalize start timestamps at the call-site so UploadObject always receives a valid unix-ms start
    try {
        const origGenCode = uploadObject.generateCode;
        uploadObject.generateCode = function(doc, start, duration) {
            return origGenCode.call(uploadObject, doc, normalizeStart(start, duration), duration);
        };
    } catch(e) { if (isDebugMode) log.debug('Failed to wrap generateCode', e); }

    try {
        const origGenTerminal = uploadObject.generateTerminal;
        uploadObject.generateTerminal = function(name, start, duration) {
            return origGenTerminal.call(uploadObject, name, normalizeStart(start, duration), duration);
        };
    } catch(e) { if (isDebugMode) log.debug('Failed to wrap generateTerminal', e); }

    try {
        const origGenChat = uploadObject.generateChat;
        uploadObject.generateChat = function(provider, sessionId, start, duration, promptChars, responseChars) {
            return origGenChat.call(uploadObject, provider, sessionId, normalizeStart(start, duration), duration, promptChars, responseChars);
        };
    } catch(e) { if (isDebugMode) log.debug('Failed to wrap generateChat', e); }

    // Maybe I will add "onDidChangeVisibleTextEditors" in extension in next version
    // For detect more detailed editor information
    // But this event will always include debug-input box if you open debug panel one time

    // subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(e => log.debug('onDidChangeVisibleTextEditors', e)))

    /**
     * @param {number|undefined|null} ts
     */
    const formatTimestamp = (ts) => {
        if (!ts) return 'Unknown';
        try {
            const d = new Date(ts);
            const delta = Date.now() - ts;
            const ago = delta > 0 ? `${Math.floor(delta / 1000)}s ago` : 'just now';
            return `${d.toLocaleString()} (${ago})`;
        } catch(_) { return 'Unknown'; }
    };
    const showSyncStatus = async () => {
        /** @type {{online?:boolean, queueLength?:number, oldestQueuedAt?:number|null, lastHandshakeAt?:number, discovery?:any, tokenExpiresAt?:number}|null} */
        const status = uploader.getStatusSnapshot ? uploader.getStatusSnapshot() : null;
        const items = /** @type {(import('vscode').QuickPickItem & {action?:string})[]} */ ([
            {
                label: (status && status.online) ? '$(check) Online' : '$(debug-disconnect) Offline',
                detail: status && status.discovery && status.discovery.apiBaseUrl ? `Endpoint: ${status.discovery.apiBaseUrl}` : 'Desktop app not detected'
            },
            {
                label: `Queue: ${status && typeof status.queueLength === 'number' ? status.queueLength : 0} pending`,
                detail: status && status.oldestQueuedAt ? `Oldest queued: ${formatTimestamp(status.oldestQueuedAt)}` : 'No pending uploads'
            },
            {
                label: 'Last handshake',
                detail: status ? formatTimestamp(status.lastHandshakeAt) : 'Not yet'
            },
            {
                label: 'Token expiry',
                detail: status && status.tokenExpiresAt ? formatTimestamp(status.tokenExpiresAt) : 'Not requested'
            },
            {
                label: 'Force upload queued events now',
                action: 'flush'
            },
            {
                label: 'Re-discover Desktop App',
                action: 'rediscover'
            }
        ]);
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Slashcoded sync status' });
        if (!pick) return;
        if (pick.action === 'flush') {
            try { uploader.forceDrain(); vscode.window.showInformationMessage('CodingTracker: Upload queue flush requested.'); } catch(e) { log.error(e); }
        } else if (pick.action === 'rediscover') {
            try { await uploader.rediscover(); vscode.window.showInformationMessage('CodingTracker: Desktop re-discovery triggered.'); } catch(e) { log.error(e); }
        }
    };

    // debug command
    // subscriptions.push(vscode.commands.registerCommand('codingTracker.dumpVCSQueue', () => {
    //     log.debug(require('./lib/vcs/Git')._getVCSInfoQueue);
    // }));
    // Register GitHub auth scaffolding command
    subscriptions.push(vscode.commands.registerCommand('codingTracker.showSyncStatus', () => showSyncStatus()));
    subscriptions.push(vscode.commands.registerCommand('codingTracker.rediscoverDesktop', async () => {
        try { await uploader.rediscover(); vscode.window.showInformationMessage('CodingTracker: Desktop re-discovery triggered.'); } catch(e) { log.error(e); }
    }));
    subscriptions.push(vscode.commands.registerCommand('codingTracker.githubAuth', () => githubAuthCommand(context)));
    // Provide a command to securely set the upload token (stored in secret storage)
    subscriptions.push(vscode.commands.registerCommand('codingTracker.setUploadToken', async () => {
        try {
            const val = await vscode.window.showInputBox({ prompt: 'Enter CodingTracker upload token', password: true, ignoreFocusOut: true });
            if (!val) return;
            if (activationContext && activationContext.secrets) {
                await activationContext.secrets.store('codingTracker.uploadToken', val.trim());
                // Reconfigure uploader immediately
                await updateConfigurations();
                vscode.window.showInformationMessage('CodingTracker: Upload token saved to secure storage.');
            } else {
                // Fallback to settings if secrets API unavailable
                await vscode.workspace.getConfiguration('codingTracker').update('uploadToken', val.trim(), vscode.ConfigurationTarget.Global);
                await updateConfigurations();
                vscode.window.showWarningMessage('CodingTracker: Secret storage unavailable. Token saved in settings instead.');
            }
        } catch(e) { log.error(e); }
    }));

    // Debug: manual flush of uploader queue
    subscriptions.push(vscode.commands.registerCommand('codingTracker.flushUploads', () => {
        try { uploader.flush(); vscode.window.showInformationMessage('CodingTracker: flush triggered'); } catch(e) { log.error(e); }
    }));
    // Debug: dump chat detection context
    subscriptions.push(vscode.commands.registerCommand('codingTracker.dumpChatDetection', () => {
        try {
            const anyWindow = /** @type {any} */ (vscode.window);
            const groups = anyWindow.tabGroups && anyWindow.tabGroups.all ? anyWindow.tabGroups.all : [];
            const summaries = groups.map(/** @param {any} g */ g => {
                if (!g || !g.activeTab) return 'empty-group';
                const t = g.activeTab;
                return (t.label || '<?>') + (t.viewType ? ('<' + t.viewType + '>') : '');
            });
            const editors = (vscode.window.visibleTextEditors || []).map(ed => {
                try {
                    return `${ed.document.uri.scheme}:${ed.document.languageId}:${ed.document.fileName.split(/[/\\]/).pop()}`;
                } catch(_) { return 'editor-error'; }
            });
            const logCommands = async () => {
                try {
                    const cmds = await vscode.commands.getCommands(true);
                    const hits = cmds.filter(id => /(copilot|chat|assistant|gpt|codeium)/i.test(id));
                    log.debug('[chat-dump] commands=', hits.join(' | '));
                } catch(e) { log.debug('[chat-dump] getCommands failed', e); }
            };
            log.debug('[chat-dump] tabGroups=', summaries.join(' || '), ' editors=', editors.join(' || '));
            logCommands().finally(() => vscode.window.showInformationMessage('Chat detection snapshot logged.'));
        } catch(e) { log.debug('[chat-dump] failed', e); }
    }));

    // Debug: probe context keys to see which flip when Chat is focused
    subscriptions.push(vscode.commands.registerCommand('codingTracker.probeChatContexts', async () => {
        try {
            const keys = [
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
            /** @type {string[]} */
            const hits = [];
            for (const k of keys) {
                // eslint-disable-next-line no-await-in-loop
                const v = await vscode.commands.executeCommand('vscode.getContextKeyValue', k).then(Boolean, () => false);
                if (v) hits.push(k);
            }
            log.debug('[chat-ctx] probe hits =', hits.join(', ') || '<none>');
            vscode.window.showInformationMessage(`Chat context probe logged (${hits.length} hits)`);
        } catch(e) { log.debug('[chat-ctx] probe failed', e); }
    }));

    // Utility: show the Coding Tracker output channel
    subscriptions.push(vscode.commands.registerCommand('codingTracker.showOutput', () => {
        try { require('./OutputChannelLog').show(); } catch(_) { /* ignore */ }
    }));

    // Manual Chat controls as a reliable fallback when built-in events are not observable
    subscriptions.push(vscode.commands.registerCommand('codingTracker.chatTrackToggle', async () => {
        const now = Date.now();
        if (exclusiveMode === 'chat') {
            try { pauseAllChatSessions(now); } catch(_) { /* ignore */ }
            exclusiveMode = null;
            chatCommandFocusUntil = 0;
            resumeOpenAndCode(now);
            updateModeBasedOnState();
            vscode.window.showInformationMessage('CodingTracker: Chat tracking OFF');
        } else {
            exclusiveMode = 'chat';
            suspendOpenAndCode(now);
            refreshStatusBarMode();
            chatCommandFocusUntil = now + 5 * 60 * 1000; // 5 min sticky window
            updateModeBasedOnState();
            vscode.window.showInformationMessage('CodingTracker: Chat tracking ON');
        }
    }));
    subscriptions.push(vscode.commands.registerCommand('codingTracker.chatFocus', async () => {
        const now = Date.now();
        // Best-effort: try a list of common chat focus/open/toggle commands
        try {
            const candidates = [
                'workbench.action.chat.open',
                'workbench.action.chat.focus',
                'workbench.view.chat',
                'workbench.panel.chat.view.focus',
                'github.copilot.chat.toggleChat',
                'github.copilot.chat.open',
                'github.copilot.chat.focus'
            ];
            const cmds = await vscode.commands.getCommands(true);
            const chosen = candidates.find(c => cmds.includes(c));
            if (chosen) { await vscode.commands.executeCommand(chosen); }
        } catch(_) { /* ignore */ }
        // Reflect Chat in our status regardless (sticky)
        exclusiveMode = 'chat';
        suspendOpenAndCode(now);
        refreshStatusBarMode();
        chatCommandFocusUntil = now + 60000; // 60s sticky
        updateModeBasedOnState();
    }));
}
function deactivate() {
    EventHandler.onActiveFileChange(null);
    EventHandler.dispose(); // Call dispose for terminal tracking
	localServer.dispose();
    try { if (terminalPollHandle) { clearInterval(terminalPollHandle); terminalPollHandle = null; } } catch(_) { /* ignore */ }
    try { if (chatPollHandle) { clearInterval(chatPollHandle); chatPollHandle = null; } } catch(_) { /* ignore */ }
	log.end();
}


exports.activate = activate;
exports.deactivate = deactivate;
