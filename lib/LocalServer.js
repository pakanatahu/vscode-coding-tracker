//@ts-check

/*
	What does this module work:

	1. launch a local tracking server
	2. Passing a local tracking server from other VSCode windows context
		- (It means stop local tracking server running in other VSCode windows context, and start a new in this windows)
	3. Stop a local tracking server
	4. Open tracking server report page
*/

//default open new server listening 10345 port
const DEFAULT_PORT = 10345;
//Just a true const value(for readability)
const SILENT_START_SERVER = true;

const URL = require('url');
const fs = require('fs');
const vscode = require('vscode');
const httpClient = require('./core/httpClient');
const path = require('path');
const staticServer = require('./StaticWebServer');
const { createHistoryStore } = require('./localReport/historyStore');
const { buildReportSummary } = require('./localReport/reportAggregator');

const log = require('./OutputChannelLog');
const statusBar = require('./StatusBarManager');
// VS Code helper typed as any for JS interop under @ts-check
const ext = /** @type {any} */ (require('./VSCodeHelper'));

//User config read from vscode configurations
var userConfig = {
	url: '',
	token: '',
	localMode: false
};

//Is local server running under this windows context
var isLocalServerRunningInThisContext = false;
// Built-in static server handle
/** @type {{url:string, close:()=>void} | null} */
let builtinServer = null;
/** @type {string} */
let storagePath = '';


//init function.
//it will be call when extension active
/** @param {import('vscode').ExtensionContext} extensionContext */
function init(extensionContext) {
	var {subscriptions} = extensionContext;
	storagePath = extensionContext && extensionContext.globalStorageUri ? extensionContext.globalStorageUri.fsPath : '';
	//Register commands
	subscriptions.push(vscode.commands.registerCommand('slashCoded.showLocalReport', showLocalReport));
	try { log.debug('[LocalServer] Commands registered: showLocalReport'); } catch(_) { /* ignore */ }

	//Read user config
	userConfig = _readUserConfig();
	// If local mode is on but URL isn't local, coerce to default local server (only when explicitly enabled)
	if (userConfig.localMode && !_isLocalURL(userConfig.url)) {
		log.debug(`[LocalServer] localServerMode=true and serverURL is remote (${userConfig.url}). Forcing local URL http://127.0.0.1:${DEFAULT_PORT}`);
		userConfig.url = `http://127.0.0.1:${DEFAULT_PORT}`;
	}
	try { log.debug(`[LocalServer] init with serverURL=${userConfig.url}, localMode=${userConfig.localMode}`); } catch(_) { /* ignore */ }
	//if turn on local mode
	if (userConfig.localMode) {
		//Kill/stop old server by requesting /ajax/kill
		log.debug(`[LocalMode]: try to kill old tracking server...`);
		httpClient.get(_getKillURL(), { params: { token: userConfig.token } })
			.then(/** @param {{data:any}} res */ (res) => {
				/** @type {{ success?: boolean; error?: string }} */
				var result = {};
				try { result = (res && res.data) ? res.data : {}; } catch (e) { log.error('[Error]: parse JSON failed!'); }
				if (result.success) {
					log.debug('[Killed]: killed old server! and opening a new local server...');
					return startLocalServer(true); //start a new server
				} else {
					log.debug(`[Response]: ${JSON.stringify(result)}`);
					(result.error || '').indexOf('local') >= 0 ?
						_showError(`Starting the local mode failed!(because the existed server is not a local server)`, { stack: 'Not a local server!' }) :
						_showError(`Starting the local mode failed!(because your token is invalid for existed server)`, { stack: 'token is invalid' });
				}
			})
			.catch(() => {
				log.debug(`[LocalMode]: there are no old tracking server, just opening a new local server...`);
				return startLocalServer(true);// start a new server
			});
	}
}

//This function will be call when vscode configurations changed
function updateConfig() {
	var newConfig = _readUserConfig();
	userConfig = newConfig;
}

//Start a new local server in this windows context
//silent == true: there will no any success message box display to user(but user still could see exception info if start failed)
/** Start a new local server in this windows context
 * @param {boolean=} silent there will no any success message box display to user
 */
function startLocalServer(silent) {
	const staticDir = path.join(__dirname, '..', 'server-app');
	if (fs.existsSync(staticDir) && fs.statSync(staticDir).isDirectory()) {
		if (builtinServer) {
			isLocalServerRunningInThisContext = true;
			statusBar.localServer.turnOn();
			if (!silent) vscode.window.showInformationMessage(`SlashCoded: built-in local server started!`);
			return;
		}
		// Launch built-in static server for free GUI
		const port = Number(_getPortInfoFromURL(userConfig.url));
		builtinServer = staticServer.start({
			staticDir,
			port,
			debugLog: (m) => log.debug(m),
			getReportSummary: async () => {
				const historyStore = createHistoryStore({ storagePath });
				const events = await historyStore.readReportEvents();
				return Object.assign(buildReportSummary(events), {
					desktop: {
						detected: false,
						downloadUrl: 'https://lundholm.io/project/slashcoded'
					}
				});
			}
		});
		isLocalServerRunningInThisContext = true;
		statusBar.localServer.turnOn();
		vscode.window.showInformationMessage(`SlashCoded: built-in local server started!`);
		return;
	}

	_showError(`built-in local dashboard assets are missing`, { stack: `Missing directory: ${staticDir}` });
}

/**
 * Check is the local server started by requesting welcome information page
 *
 * @param {boolean} silent  : if local server started, there are no any message
 * @param {number} times   : how many times retry
 * @param {boolean} isActiveCheck   : is this calling from active heart beat (It will be change log content)
 * @returns
 */
/**
 * @param {boolean} silent
 * @param {number} times
 * @param {boolean} isActiveCheck
 */
function _checkIsLocalServerStart(silent, times, isActiveCheck) {
	if (times >= 10) return statusBar.localServer.turnOff();
	_checkConnection((networkErr, serverErr, result) => {
		if (result) {
			if (/** @type {{localServerMode?: boolean}} */ (result).localServerMode) {
				silent || vscode.window.showInformationMessage(`SlashCoded: local server started!`);
				isActiveCheck ? log.debug(`[Heartbeat]: server in local!`) :
					log.debug(`[Launched]: Local server has launching!`);
				statusBar.localServer.turnOn();
			} else {
				statusBar.localServer.turnOff();
			}
		} else if (!networkErr) {
			//connect success, but not local server
			return;
		} else {
			setTimeout(() => _checkIsLocalServerStart(silent, times + 1, isActiveCheck), 800);
		}
	})
}

//Stop local server running in this window by child process tree killing
function stopLocalServerSilentByTreeKill() {
	log.debug('[Kill]: try to kill local server by tree kill way...');
	if (builtinServer) {
		try { builtinServer.close(); } catch(_) { /* ignore */ }
		builtinServer = null;
	}
}

async function showLocalReport() {
	try {
		startLocalServer(true);
		const fallbackUrl = getBuiltinReportURL();
		await vscode.env.openExternal(vscode.Uri.parse(fallbackUrl));
	} catch (err) {
		_showError(`Execute open local report command error!`, /** @type {{stack?:any}} */ (err || { stack: 'Unknown error' }));
	}
}

//check is the server connectable
//then(networkError, serverError, responseBody)
/**
 * @param {(networkErr?: any, serverErr?: any, result?: any) => void} then
 */
function _checkConnection(then) {
	httpClient.get(_getWelcomeURL())
		.then(/** @param {{status:number, data:any}} res */ (res) => {
			if (!res || res.status !== 200) return then(null, `server exception!(${res ? res.status : 'unknown'})`);
			try { var result = res.data; } catch (e) { return then(null, `server exception!(illegal welcome json)`); }
			return then(null, null, result);
		})
		.catch(/** @param {any} err */ (err) => then(err));
}

function getBuiltinReportURL() {
	try {
		if (builtinServer && builtinServer.url) return `${String(builtinServer.url).replace(/\/$/, '')}/report/`;
	} catch (_) { /* ignore */ }
	return `http://127.0.0.1:${DEFAULT_PORT}/report/`;
}

// function _getTestURL() { return `${userConfig.url}/ajax/test` }
function _getWelcomeURL() { return `${userConfig.url}/` }
function _getKillURL() { return `${userConfig.url}/ajax/kill` }
function _readUserConfig() {
	ext.getConfig('slashCoded');
	return { url: `http://127.0.0.1:${DEFAULT_PORT}`, token: '', localMode: false };
}

/**
 * @param {string} errOneLine
 * @param {{stack?: any}} errObject
 */
function _showError(errOneLine, errObject) {
	const MENU_ITEM_TEXT = 'Show details'
	log.error(`[Error]: ${errOneLine}\n${errObject.stack}`);
	vscode.window.showErrorMessage(`SlashCoded: ${errOneLine}`, MENU_ITEM_TEXT).then(item =>
		item == MENU_ITEM_TEXT ? log.show() : 0);
}
/** @param {string} url */
function _getPortInfoFromURL(url) { return String(URL.parse(url).port || DEFAULT_PORT); }

/**
 * @param {string} url
 */
function _isLocalURL(url) {
	try {
		const u = URL.parse(url);
		const h = (u.hostname || '').toLowerCase();
		return h === '127.0.0.1' || h === 'localhost';
	} catch(_) { return false; }
}

module.exports = {
	init,
	updateConfig,
	activeCheckIsLocalServerStart: () => _checkIsLocalServerStart(true, 9, true),
	detectOldSever_SoStartANewIfUnderLocalMode: () => {
		if (!userConfig.localMode)
			return false;
		if (!isLocalServerRunningInThisContext) {
			log.debug('[Launch]: launching a new tracking server because detected old server exited!');
			startLocalServer(SILENT_START_SERVER);
			return true;
		}
		return false;
	},
	dispose: stopLocalServerSilentByTreeKill
};
