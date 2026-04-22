//@ts-check

"use strict";

const vscode = require('vscode');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ext = /** @type {any} */ (require('./VSCodeHelper'));
const uploader = require('./Uploader');
const log = require('./Log');
const outLog = require('./OutputChannelLog');

const statusBar = require('./StatusBarManager');
const localServer = require('./LocalServer');
const uploadObject = require('./UploadObject');
const { isDebugMode } = require('./Constants');
const { generateDiagnoseLogFile } = require('./EnvironmentProbe');

const runtime = require('./core/runtime');
const { applyTrackingConfigToState } = require('./core/hostTiming');
const { installErrorHooks } = require('./core/installErrorHooks');
const modeController = require('./core/modeController');
const { updateConfigurations } = require('./core/configuration');
const { wrapUploadObjectGenerators } = require('./core/wrapGenerators');

const { createOpenCodeTracker } = require('./tracking/OpenCodeTracker');
const { createAfkMonitor } = require('./tracking/afkMonitor');
const { createTerminalTracker } = require('./tracking/terminalTracker');
const { createChatTracker } = require('./tracking/chatTracker');
const { registerGlobalActivityHooks } = require('./tracking/globalActivityHooks');

/** @type {{ state:any, openCode:any, afk:any, terminal:any, chat:any, refreshTimer:any, configWatcher:any }|null} */
let runtimeSession = null;

function buildConfigDeps(
    /** @type {import('vscode').ExtensionContext} */ context,
    /** @type {any} */ state,
    /** @type {{ applyConfig:(enabled:boolean, timeoutMs:number)=>void }} */ afk
) {
    return {
        vscode,
        ext,
        uploader,
        log,
        outLog,
        statusBar,
        localServer,
        uploadObject,
        state,
        activationContext: context,
        applyAfkConfig: /** @type {(enabled:boolean, timeoutMs:number)=>void} */ ((enabled, timeoutMs) => afk.applyConfig(enabled, timeoutMs))
    };
}

/** @param {import('vscode').ExtensionContext} context */
async function activate(context) {
    // Initialize output channel up-front for visibility
    try { outLog.start(); } catch (_) { /* ignore */ }
    try { outLog.debug('SlashCoded: activating extension...'); } catch (_) { /* ignore */ }

    installErrorHooks(log);
    generateDiagnoseLogFile();

    const state = runtime.createInitialState();
    const syncTrackingConfig = () => {
        try {
            const trackingConfig = uploader.getTrackingConfig ? uploader.getTrackingConfig() : state.hostTrackingConfig;
            if (trackingConfig) applyTrackingConfigToState(state, trackingConfig);
            afk.applyConfig(state.trackAFK, state.afkTimeoutMs);
        } catch (e) {
            try { log.debug('Failed to sync tracking config from uploader', e); } catch (_) { /* ignore */ }
        }
    };

    // Initialize core modules
    uploadObject.init();
    localServer.init(context);
    uploader.init(context);

    // Ensure UploadObject always gets valid unix-ms start values
    wrapUploadObjectGenerators({ uploadObject, uploader, log, isDebugMode });

    const modeDeps = { statusBar, state };
    const mode = {
        updateModeBasedOnState: () => modeController.updateModeBasedOnState(modeDeps),
        refreshStatusBarMode: () => modeController.refreshStatusBarMode(modeDeps)
    };

    // Break dependency cycles: openCode wants recordUserActivity, AFK wants openCode.
    let recordUserActivity = () => { state.lastUserActivity = Date.now(); };

    const openCode = createOpenCodeTracker({
        vscode,
        ext,
        log,
        isDebugMode,
        state,
        uploader,
        uploadObject,
        mode,
        recordUserActivity: () => recordUserActivity()
    });

    const afk = createAfkMonitor({
        vscode,
        log,
        isDebugMode,
        statusBar,
        state,
        uploadObject,
        uploader,
        openCode,
        mode
    });
    recordUserActivity = afk.recordUserActivity;

    const chat = createChatTracker({
        vscode,
        log,
        isDebugMode,
        state,
        uploadObject,
        uploader,
        openCode,
        mode,
        recordUserActivity: () => recordUserActivity()
    });

    const terminal = createTerminalTracker({
        vscode,
        log,
        isDebugMode,
        state,
        uploadObject,
        uploader,
        openCode,
        mode,
        recordUserActivity: () => recordUserActivity(),
        isChatLikeTab: chat.isChatLikeTab
    });

    const registerGlobalHooks = registerGlobalActivityHooks({
        vscode,
        log,
        isDebugMode,
        uploadObject,
        uploader,
        state,
        openCode,
        mode,
        recordUserActivity: () => recordUserActivity()
    });

    // Apply configuration (also initializes status bar) before starting trackers that depend on flags
    const configDeps = buildConfigDeps(context, state, afk);
    await updateConfigurations(configDeps);

    // Probe desktop app and host timing before starting trackers.
    try { await uploader.rediscover(); } catch (_) { /* ignore */ }
    syncTrackingConfig();

    // Watch for config changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(() => {
        updateConfigurations(configDeps).catch(e => { try { log.error(e); } catch (_) { /* ignore */ } });
    });
    context.subscriptions.push(configWatcher);

    // Register core editor events
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => openCode.onFileCoding((e || runtime.EMPTY).document)));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => openCode.onActiveFileChange((e && e.document) ? e.document : null)));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => openCode.onIntentlyWatchingCodes((e || runtime.EMPTY).textEditor)));
    context.subscriptions.push(vscode.window.onDidChangeWindowState(ws => openCode.onDidChangeWindowState(ws)));

    // Start AFK monitoring
    afk.start();
    context.subscriptions.push({ dispose: () => afk.stop() });
    afk.registerCommands(context.subscriptions);

    // Register trackers
    terminal.register(context.subscriptions);
    chat.register(context.subscriptions);

    // Track initial active editor after timing config is ready and trackers are registered.
    try {
        const initialDoc = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
        openCode.onActiveFileChange(initialDoc);
    } catch (_) { /* ignore */ }

    // Global activity hooks
    registerGlobalHooks(context.subscriptions);

    // Non-chat utility commands (keep IDs stable)
    registerUtilityCommands(context, configDeps);

    // Periodic status refresh
    try {
        const REFRESH_MS = 2000;
        const refreshTimer = setInterval(() => {
            try { openCode.tick(Date.now()); } catch (_) { /* ignore */ }
            try { mode.updateModeBasedOnState(); } catch (_) { /* ignore */ }
        }, REFRESH_MS);
        const trackingConfigRefreshTimer = setInterval(() => {
            uploader.refreshTrackingConfig(false)
                .then(() => syncTrackingConfig())
                .catch(e => { try { log.debug('Tracking config refresh failed', e); } catch (_) { /* ignore */ } });
        }, 5 * 60 * 1000);
        runtimeSession = { state, openCode, afk, terminal, chat, refreshTimer: { refreshTimer, trackingConfigRefreshTimer }, configWatcher };
        context.subscriptions.push({ dispose: () => { try { clearInterval(refreshTimer); } catch (_) { /* ignore */ } } });
        context.subscriptions.push({ dispose: () => { try { clearInterval(trackingConfigRefreshTimer); } catch (_) { /* ignore */ } } });
    } catch (_) {
        runtimeSession = { state, openCode, afk, terminal, chat, refreshTimer: null, configWatcher };
    }

    mode.updateModeBasedOnState();
}

/**
 * Registers commands that are not part of chat/afk trackers.
 * @param {import('vscode').ExtensionContext} context
 * @param {any} configDeps
 */
function registerUtilityCommands(context, configDeps) {
    const subscriptions = context.subscriptions;

    // Sync status quick pick
    const formatTimestamp = /** @type {(ts: number) => string} */ ((ts) => {
        if (!ts) return 'Unknown';
        try {
            const d = new Date(ts);
            const delta = Date.now() - ts;
            const ago = delta > 0 ? `${Math.floor(delta / 1000)}s ago` : 'just now';
            return `${d.toLocaleString()} (${ago})`;
        } catch (_) { return 'Unknown'; }
    });

    const showSyncStatus = async () => {
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
            { label: 'Queue local history for Desktop ingestion', action: 'queue-local-history' },
            { label: 'Force upload queued events now', action: 'flush' },
            { label: 'Re-discover Desktop App', action: 'rediscover' }
        ]);
        const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Slashcoded sync status' });
        if (!pick) return;
        if (pick.action === 'queue-local-history') {
            try {
                const result = await uploader.queueLocalHistoryForDesktop();
                const importedCount = result && typeof result.importedCount === 'number' ? result.importedCount : 0;
                vscode.window.showInformationMessage(importedCount > 0
                    ? `SlashCoded: queued ${importedCount} local event${importedCount === 1 ? '' : 's'} for Desktop ingestion.`
                    : 'SlashCoded: no local-only history found to queue.');
            } catch (e) { log.error(e); }
        } else if (pick.action === 'flush') {
            try { uploader.forceDrain(); vscode.window.showInformationMessage('SlashCoded: Upload queue flush requested.'); } catch (e) { log.error(e); }
        } else if (pick.action === 'rediscover') {
            try { await uploader.rediscover(); vscode.window.showInformationMessage('SlashCoded: Desktop re-discovery triggered.'); } catch (e) { log.error(e); }
        }
    };

    subscriptions.push(vscode.commands.registerCommand('codingTracker.showSyncStatus', () => showSyncStatus()));
    subscriptions.push(vscode.commands.registerCommand('codingTracker.queueLocalHistoryForDesktop', async () => {
        try {
            const result = await uploader.queueLocalHistoryForDesktop();
            const importedCount = result && typeof result.importedCount === 'number' ? result.importedCount : 0;
            vscode.window.showInformationMessage(importedCount > 0
                ? `SlashCoded: queued ${importedCount} local event${importedCount === 1 ? '' : 's'} for Desktop ingestion.`
                : 'SlashCoded: no local-only history found to queue.');
        } catch (e) { log.error(e); }
    }));

    subscriptions.push(vscode.commands.registerCommand('codingTracker.showOutput', () => {
        try { require('./OutputChannelLog').show(); } catch (_) { /* ignore */ }
    }));
}

function deactivate() {
    try {
        if (runtimeSession && runtimeSession.openCode) {
            runtimeSession.openCode.onActiveFileChange(null);
            runtimeSession.openCode.dispose();
        }
    } catch (_) { /* ignore */ }

    try { if (runtimeSession && runtimeSession.terminal) runtimeSession.terminal.dispose(); } catch (_) { /* ignore */ }
    try { if (runtimeSession && runtimeSession.chat) runtimeSession.chat.dispose(); } catch (_) { /* ignore */ }
    try { if (runtimeSession && runtimeSession.afk) runtimeSession.afk.stop(); } catch (_) { /* ignore */ }

    try { localServer.dispose(); } catch (_) { /* ignore */ }

    try {
        if (runtimeSession && runtimeSession.refreshTimer) {
            const timerValue = runtimeSession.refreshTimer;
            if (timerValue && typeof timerValue === 'object') {
                if (timerValue.refreshTimer) clearInterval(timerValue.refreshTimer);
                if (timerValue.trackingConfigRefreshTimer) clearInterval(timerValue.trackingConfigRefreshTimer);
            } else {
                clearInterval(timerValue);
            }
        }
    } catch (_) { /* ignore */ }

    try { log.end(); } catch (_) { /* ignore */ }
}

module.exports = { activate, deactivate };
