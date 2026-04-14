"use strict";

const runtime = require('./runtime');
const { DEFAULT_IDLE_THRESHOLD_SECONDS } = require('./hostTiming');

/**
 * Applies configuration settings to the running extension.
 * This is extracted from extension.js to keep activation readable.
 *
 * @param {object} deps
 * @param {import('vscode')} deps.vscode
 * @param {any} deps.ext
 * @param {any} deps.uploader
 * @param {any} deps.log
 * @param {any} deps.outLog
 * @param {any} deps.statusBar
 * @param {any} deps.localServer
 * @param {any} deps.uploadObject
 * @param {ReturnType<runtime.createInitialState>} deps.state
 * @param {import('vscode').ExtensionContext|null} deps.activationContext
 * @param {function(boolean, number): void} deps.applyAfkConfig
 */
async function updateConfigurations(deps) {
    const { vscode, ext, uploader, log, statusBar, localServer, uploadObject, state, activationContext, applyAfkConfig } = deps;

    const extensionCfg = ext.getConfig('codingTracker');
    /** @param {unknown} v @returns {string} */
    const sanitize = (v) => (v === undefined || v === null || v === 'undefined') ? '' : String(v);

    const uploadTokenRaw = extensionCfg.get('uploadToken');
    const connectionModeRaw = extensionCfg.get('connectionMode');
    const computerId = sanitize(extensionCfg.get('computerId'));
    const enableStatusBar = extensionCfg.get('showStatus');

    const mttRaw = extensionCfg.get('moreThinkingTime');
    let mtt = 0;
    if (typeof mttRaw === 'number') mtt = mttRaw;
    else if (typeof mttRaw === 'string') { const parsed = parseInt(mttRaw, 10); if (!isNaN(parsed)) mtt = parsed; }

    const uploadTokenCfg = sanitize(uploadTokenRaw);
    let uploadToken = '';

    // Prefer secret-stored token; migrate from config once
    try {
        if (activationContext && activationContext.secrets) {
            const secret = await activationContext.secrets.get('codingTracker.uploadToken');
            if (secret && secret.trim()) {
                uploadToken = secret.trim();
            } else if (uploadTokenCfg) {
                await activationContext.secrets.store('codingTracker.uploadToken', uploadTokenCfg);
                uploadToken = uploadTokenCfg;
                try {
                    await vscode.workspace.getConfiguration('codingTracker').update('uploadToken', '', vscode.ConfigurationTarget.Global);
                    await vscode.workspace.getConfiguration('codingTracker').update('uploadToken', '', vscode.ConfigurationTarget.Workspace);
                } catch (_) { /* ignore */ }
                try { vscode.window.showInformationMessage('CodingTracker: Upload token migrated to secure storage.'); } catch (_) { /* ignore */ }
            }
        } else {
            uploadToken = uploadTokenCfg;
        }
    } catch (e) {
        uploadToken = uploadTokenCfg;
        try { log.debug('[secrets] failed to read/migrate secret token', e); } catch (_) { /* ignore */ }
    }

    /** @type {'desktop'|'cloud'} */
    let connectionMode = 'desktop';
    if (typeof connectionModeRaw === 'string') {
        const lower = connectionModeRaw.toLowerCase();
        if (lower === 'cloud' || lower === 'desktop') connectionMode = /** @type {'desktop'|'cloud'} */ (lower);
    }

    const configuredServer = connectionMode === 'cloud'
        ? runtime.INGEST_BASE
        : `http://127.0.0.1:${process.env.SLASHCODED_DESKTOP_PORT || 5292}/`;

    const httpCfg = ext.getConfig('http');
    const baseHttpProxy = httpCfg ? httpCfg.get('proxy') : undefined;
    const overwriteHttpProxy = extensionCfg.get('proxy');
    const { getProxyConfiguration } = require('../GetProxyConfiguration');
    const proxy = getProxyConfiguration(baseHttpProxy, overwriteHttpProxy);

    // feature flags
    state.trackTerminal = extensionCfg.get('shouldTrackTerminal') !== false;
    state.trackAIChat = extensionCfg.get('shouldTrackAIChat') !== false;

    // AFK flags
    const afkEnabled = extensionCfg.get('afkEnabled') !== false;
    const idleThresholdSeconds = state.hostTrackingConfig && state.hostTrackingConfig.idleThresholdSeconds
        ? state.hostTrackingConfig.idleThresholdSeconds
        : DEFAULT_IDLE_THRESHOLD_SECONDS;
    const afkTimeoutMs = idleThresholdSeconds * runtime.SECOND;
    state.trackAFK = afkEnabled;
    state.afkTimeoutMs = afkTimeoutMs;

    // moreThinkingTime is stored in ms in the original code
    if (isNaN(mtt)) mtt = 0;
    if (mtt < -15 * runtime.SECOND) mtt = -15 * runtime.SECOND;
    state.moreThinkingTimeMs = mtt;

    uploader.set(configuredServer, uploadToken, proxy);
    try { uploader.setConnectionMode(connectionMode); } catch (e) { log.debug('Failed to set connectionMode on uploader', e); }

    const timeoutCfgRaw = extensionCfg.get('uploadTimeoutMs');
    if (typeof timeoutCfgRaw === 'number') {
        if (timeoutCfgRaw > 0) { try { uploader.configureTimeout(timeoutCfgRaw); } catch (err) { log.debug('Failed to configure timeout: ' + err); } }
    } else if (typeof timeoutCfgRaw === 'string') {
        const timeoutCfg = parseInt(timeoutCfgRaw, 10);
        if (!isNaN(timeoutCfg) && timeoutCfg > 0) { try { uploader.configureTimeout(timeoutCfg); } catch (err) { log.debug('Failed to configure timeout: ' + err); } }
    }

    const discoveryTimeoutRaw = extensionCfg.get('desktopDiscoveryTimeoutMs');
    if (typeof discoveryTimeoutRaw === 'number' && discoveryTimeoutRaw > 0) {
        try { uploader.configureDiscoveryTimeout(discoveryTimeoutRaw); } catch (err) { log.debug('Failed to configure discovery timeout: ' + err); }
    } else if (typeof discoveryTimeoutRaw === 'string') {
        const parsed = parseInt(discoveryTimeoutRaw, 10);
        if (!isNaN(parsed) && parsed > 0) {
            try { uploader.configureDiscoveryTimeout(parsed); } catch (err) { log.debug('Failed to configure discovery timeout: ' + err); }
        }
    }

    uploadObject.init(computerId || `unknown-${require('os').platform()}`);

    localServer.updateConfig();
    statusBar.init(enableStatusBar);
    try { log.debug(`[init] Status bar initialized (enabled=${!!enableStatusBar})`); } catch (_) { /* ignore */ }

    // Apply AFK config (start/stop timers)
    try {
        applyAfkConfig(afkEnabled, afkTimeoutMs);
        log.debug(`[AFK] config updated: enabled=${afkEnabled}, timeoutMs=${afkTimeoutMs}`);
    } catch (e) { log.debug('[AFK] monitor restart failed', e); }
}

module.exports = {
    updateConfigurations
};
