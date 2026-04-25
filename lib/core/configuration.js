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
    const { ext, uploader, log, statusBar, localServer, uploadObject, state, applyAfkConfig } = deps;

    const extensionCfg = ext.getConfig('slashCoded');
    const storageMode = extensionCfg.get('storageMode') === 'standalone' ? 'standalone' : 'auto';
    const enableStatusBar = extensionCfg.get('showStatus');
    const configuredServer = `http://127.0.0.1:${process.env.SLASHCODED_DESKTOP_PORT || 5292}/`;

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

    state.moreThinkingTimeMs = 0;

    uploader.set(configuredServer, '', undefined);
    try { uploader.setStorageMode(storageMode); } catch (e) { log.debug('Failed to set storageMode on uploader', e); }

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

    uploadObject.init();

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
