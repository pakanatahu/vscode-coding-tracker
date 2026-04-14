"use strict";

const runtime = require('../core/runtime');

/**
 * Perform refresh-token exchange to obtain upload token.
 * @param {import('vscode').ExtensionContext} context
 * @param {import('vscode')} vscode
 * @param {any} log
 * @param {boolean} isDebugMode
 */
async function performTokenRefresh(context, vscode, log, isDebugMode) {
    try {
        const secrets = context.secrets;
        const storedRefresh = await secrets.get('codingTracker.refreshToken');
        if (!storedRefresh) return false;

        const axios = /** @type {any} */ (require('axios'));
        const resp = await axios.post(`${runtime.AUTH_API_BASE}/api/token/refresh`, { refreshToken: storedRefresh });
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
 *
 * @param {import('vscode').ExtensionContext} context
 * @param {import('vscode')} vscode
 * @param {any} log
 * @param {boolean} isDebugMode
 */
async function githubAuthCommand(context, vscode, log, isDebugMode) {
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
    const ok = await performTokenRefresh(context, vscode, log, isDebugMode);
    if (ok) vscode.window.showInformationMessage('CodingTracker upload token updated successfully.');
    else vscode.window.showErrorMessage('Failed to refresh upload token. Check the refresh token and try again.');
}

module.exports = {
    githubAuthCommand,
    performTokenRefresh
};
