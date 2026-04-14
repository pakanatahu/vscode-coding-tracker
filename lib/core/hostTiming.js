"use strict";

const DEFAULT_SEGMENT_DURATION_SECONDS = 15;
const DEFAULT_IDLE_THRESHOLD_SECONDS = 300;
const TRACKING_CONFIG_REFRESH_MS = 5 * 60 * 1000;

function toPositiveInteger(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return Math.floor(numeric);
}

function createDefaultTrackingConfig() {
    return {
        segmentDurationSeconds: DEFAULT_SEGMENT_DURATION_SECONDS,
        idleThresholdSeconds: DEFAULT_IDLE_THRESHOLD_SECONDS,
        configVersion: 'startup-default',
        updatedAt: null,
        source: 'default'
    };
}

/**
 * @param {any} raw
 */
function sanitizeTrackingConfig(raw) {
    const defaults = createDefaultTrackingConfig();
    return {
        segmentDurationSeconds: toPositiveInteger(raw && raw.segmentDurationSeconds, defaults.segmentDurationSeconds),
        idleThresholdSeconds: toPositiveInteger(raw && raw.idleThresholdSeconds, defaults.idleThresholdSeconds),
        configVersion: raw && typeof raw.configVersion === 'string' && raw.configVersion.trim()
            ? raw.configVersion.trim()
            : defaults.configVersion,
        updatedAt: raw && typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
            ? raw.updatedAt.trim()
            : null,
        source: 'host'
    };
}

function shouldRefreshTrackingConfig(lastFetchedAt, now = Date.now()) {
    if (!lastFetchedAt) return true;
    return (now - lastFetchedAt) >= TRACKING_CONFIG_REFRESH_MS;
}

/**
 * @param {any} state
 * @param {{ segmentDurationSeconds:number, idleThresholdSeconds:number, configVersion:string, updatedAt?:string|null, source?:string }} trackingConfig
 */
function applyTrackingConfigToState(state, trackingConfig) {
    if (!state || !trackingConfig) return;
    state.hostTrackingConfig = Object.assign({}, trackingConfig);
    state.segmentDurationMs = trackingConfig.segmentDurationSeconds * 1000;
    state.afkTimeoutMs = trackingConfig.idleThresholdSeconds * 1000;
}

module.exports = {
    DEFAULT_SEGMENT_DURATION_SECONDS,
    DEFAULT_IDLE_THRESHOLD_SECONDS,
    TRACKING_CONFIG_REFRESH_MS,
    createDefaultTrackingConfig,
    sanitizeTrackingConfig,
    shouldRefreshTrackingConfig,
    applyTrackingConfigToState
};
