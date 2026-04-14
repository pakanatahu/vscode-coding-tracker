"use strict";

// Centralized runtime constants and shared mutable state.
// The goal is to keep all cross-cutting state in one obvious place.

const { createDefaultTrackingConfig } = require('./hostTiming');

const SECOND = 1000;

// Networking defaults
const INGEST_BASE = 'https://codingtracker-ingest.azurewebsites.net/';
const AUTH_API_BASE = 'https://codingtracker-api.azurewebsites.net';

// Tracking constants
const CODING_SHORTEST_UNIT_MS = 5 * SECOND;
const AT_LEAST_WATCHING_TIME = 5 * SECOND;
const MAX_ALLOW_NOT_INTENTLY_MS = 60 * SECOND;
const MAX_CODING_WAIT_TIME = 30 * SECOND;
const AFK_TIMEOUT_MS = 15 * 60 * SECOND;
const TERMINAL_REENTRY_COOLDOWN_MS = 2000;

const INVALID_CODING_DOCUMENT_SCHEMES = [
    'git-index',
    'git',
    'output',
    'input',
    'private',
    'markdown'
];

const EMPTY = { document: null, textEditor: null };

function createInitialState() {
    const initialTrackingConfig = createDefaultTrackingConfig();
    return {
        // configuration-driven flags
        moreThinkingTimeMs: 0,
        trackTerminal: true,
        trackAIChat: true,
        trackAFK: true,
        afkTimeoutMs: initialTrackingConfig.idleThresholdSeconds * SECOND,
        segmentDurationMs: initialTrackingConfig.segmentDurationSeconds * SECOND,
        hostTrackingConfig: initialTrackingConfig,

        // editor/window state
        /** @type {import('vscode').TextDocument|null} */
        activeDocument: null,
        /** @type {('chat'|'terminal'|null)} */
        exclusiveMode: null,
        windowFocused: true,

        // AFK tracking
        lastUserActivity: 0,
        isAFK: false,
        /** @type {ReturnType<typeof setInterval>|null} */
        afkCheckTimer: null,

        // open/coding tracking
        trackData: {
            openTime: 0,
            lastIntentlyTime: 0,
            firstCodingTime: 0,
            codingLong: 0,
            lastCodingTime: 0
        },


        logModeTransitions: false,
        lastReportedMode: null,
        lastReportedReason: '',

        // terminal tracking
        /** @type {import('vscode').Terminal|null} */
        activeTerminal: null,
        terminalOpenTime: 0,
        /** @type {ReturnType<typeof setInterval>|null} */
        terminalPollHandle: null,
        terminalExclusiveActive: false,
        terminalReentrySuppressedUntil: 0,

        // chat tracking
        /** @type {ReturnType<typeof setInterval>|null} */
        chatPollHandle: null,
        lastChatEnumLog: 0,
        chatCommandFocusUntil: 0,
        heuristicChatActive: false,

        // initialized by chat tracker
        chat: {
            pauseAll: /** @type {(now:number)=>void} */ ((_) => {}),
            resumeAll: /** @type {(now:number)=>void} */ ((_) => {}),
            stopHeuristicSession: /** @type {(reason?:string, preserveExclusive?:boolean)=>void} */ ((_) => {})
        }
    };
}

/**
 * Normalize a start timestamp (ms). If start is missing/invalid/<=0, synthesize start = now - duration (if duration available) or now.
 * @param {number} start
 * @param {number} duration
 */
function normalizeStart(start, duration) {
    try {
        if (typeof start === 'number' && start > 0) return start;
    } catch (_) { /* ignore */ }
    return Date.now() - (typeof duration === 'number' && duration > 0 ? duration : 0);
}

module.exports = {
    SECOND,
    INGEST_BASE,
    AUTH_API_BASE,
    CODING_SHORTEST_UNIT_MS,
    AT_LEAST_WATCHING_TIME,
    MAX_ALLOW_NOT_INTENTLY_MS,
    MAX_CODING_WAIT_TIME,
    AFK_TIMEOUT_MS,
    TERMINAL_REENTRY_COOLDOWN_MS,
    INVALID_CODING_DOCUMENT_SCHEMES,
    EMPTY,
    createInitialState,
    normalizeStart
};
