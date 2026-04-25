"use strict";

const crypto = require('crypto');

/**
 * @param {number} value
 * @returns {number}
 */
function clampDurationMs(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 1000;
    return Math.max(1000, Math.floor(numeric));
}

/**
 * @param {any} src
 * @param {{ segmentDurationSeconds:number, idleThresholdSeconds:number, configVersion:string }} trackingConfig
 */
function mapToDesktopEvent(src, trackingConfig) {
    const longMs = clampDurationMs(src && src.long);
    const startTs = Number(src && src.time);
    const safeStartTs = Number.isFinite(startTs) && startTs > 0 ? startTs : Date.now() - longMs;
    const segmentEndTs = safeStartTs + longMs;
    const durationMinutes = Math.max(1, Math.round(longMs / (60 * 1000)));
    const category = src && src.type ? src.type : 'code';
    const project = (src && src.proj) || 'vscode-local';
    const eventSeed = [
        category,
        safeStartTs,
        segmentEndTs,
        src && src.file || '',
        src && src.vcs_repo || '',
        src && src.vcs_branch || ''
    ].join('|');
    const eventId = `ide-${segmentEndTs}-${crypto.createHash('sha1').update(eventSeed).digest('hex').slice(0, 12)}`;

    return {
        token: src && src.token || undefined,
        userId: 'local',
        source: 'vscode',
        occurredAt: new Date(segmentEndTs).toISOString(),
        durationMinutes,
        durationMs: longMs,
        project,
        category,
        payload: {
            lang: src && src.lang || '',
            file: src && src.file || '',
            vcs_repo: src && src.vcs_repo || '',
            vcs_branch: src && src.vcs_branch || '',
            type: category,
            event_id: eventId,
            segment_start_ts: safeStartTs,
            segment_end_ts: segmentEndTs,
            trackerConfigVersion: trackingConfig.configVersion,
            segmentDurationSeconds: trackingConfig.segmentDurationSeconds,
            idleThresholdSeconds: trackingConfig.idleThresholdSeconds
        }
    };
}

module.exports = {
    mapToDesktopEvent
};
