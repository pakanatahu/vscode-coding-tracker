//@ts-check

/*
	What does this module work:

	1. launch a local tracking server
	2. Passing a local tracking server from other VSCode windows context
		- (It means stop local tracking server running in other VSCode windows context, and start a new in this windows)
	3. Stop a local tracking server
	4. Open tracking server report page
*/

const ENABLE_PIPE_SERVER_OUTPUT = false;

//default open new server listening 10345 port
const DEFAULT_PORT = 10345;
//Just a true const value(for readability)
const SILENT_START_SERVER = true;

//som parameters for start local server
const EXECUTE_CWD = `${__dirname}/../node_modules/vscode-coding-tracker-server/`;
const EXECUTE_CWD_DEV = `${__dirname}/../../vscode-coding-tracker-server`;
const EXECUTE_SCRIPT = 'app.js';
const EXECUTE_PARAMETERS = [
	'--local',
	'--public-report',
	`-o`,`${process.env.USERPROFILE||process.env.HOME}/.coding-tracker/`,
	`--port={0}`,
	`--token={1}`
];


const URL = require('url');
const fs = require('fs');
const { fork, exec } = require('child_process');
const vscode = require('vscode');
const axiosLib = require('axios');
// Use untyped axios to avoid duplicate type conflicts under @ts-check
/** @type {any} */
const axios = axiosLib;
const path = require('path');
const staticServer = require('./StaticWebServer');

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
//An child_process spawn object
/** @type {import('child_process').ChildProcess | null} */
var serverChildProcess = null;
// Guard to avoid error popups during intentional shutdown
let isStopping = false;
// Built-in static server handle
/** @type {{url:string, close:()=>void} | null} */
let builtinServer = null;


//init function.
//it will be call when extension active
/** @param {import('vscode').ExtensionContext} extensionContext */
function init(extensionContext) {
	var {subscriptions} = extensionContext;
	//Register commands
	subscriptions.push(vscode.commands.registerCommand('codingTracker.showReport', showReport));
	subscriptions.push(vscode.commands.registerCommand('codingTracker.startLocalServer', () => startLocalServer()));
	subscriptions.push(vscode.commands.registerCommand('codingTracker.stopLocalServer', () => stopLocalServer()));
	try { log.debug('[LocalServer] Commands registered: showReport, startLocalServer, stopLocalServer'); } catch(_) { /* ignore */ }

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
		axios.get(_getKillURL(), { params: { token: userConfig.token } })
			.then(/** @param {import('axios').AxiosResponse<any>} res */ (res) => {
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
	//If the local server is running in this windows and related configurations changed
	// then show a information tip "please reload VSCode"
	if (isLocalServerRunningInThisContext) {
		var shouldToastReloadVSCode = false;
		if (userConfig.localMode) {
			if (userConfig.token != newConfig.token || userConfig.url != newConfig.url || newConfig.localMode == false)
				shouldToastReloadVSCode = true;
		} else if (newConfig.localMode == true) {
			shouldToastReloadVSCode = true;
		}
		log.debug(`[ConfigChanged]: please reload vscode to apply it.`);
		shouldToastReloadVSCode && vscode.window.showInformationMessage(
			`CodingTracker: detected your local server configurations changed. Please reload VSCode to apply.`);
	}
	//save new configurations
	userConfig = newConfig;
}

//Start a new local server in this windows context
//silent == true: there will no any success message box display to user(but user still could see exception info if start failed)
/** Start a new local server in this windows context
 * @param {boolean=} silent there will no any success message box display to user
 */
function startLocalServer(silent) {
	isStopping = false;
	const staticDir = path.join(__dirname, '..', 'server-app');
	if (fs.existsSync(staticDir) && fs.statSync(staticDir).isDirectory()) {
		// Launch built-in static server for free GUI
		const port = Number(_getPortInfoFromURL(userConfig.url));
		builtinServer = staticServer.start(staticDir, port, (m) => log.debug(m));
		isLocalServerRunningInThisContext = true;
		statusBar.localServer.turnOn();
		vscode.window.showInformationMessage(`CodingTracker: built-in local server started!`);
		return;
	}

	// Fallback: fork external server (dev path preferred)
	let cwd = EXECUTE_CWD;
	if (fs.existsSync(EXECUTE_CWD_DEV))
		cwd = EXECUTE_CWD_DEV;

	const s = fork(EXECUTE_SCRIPT, _getLaunchParameters(), { cwd, silent: true, execArgv: [] });
	if (s.stdout) { s.stdout.setEncoding('utf8'); s.stdout.on('data', onServerStdout); }
	if (s.stderr) { s.stderr.setEncoding('utf8'); s.stderr.on('data', onServerStderr); }
	s.on('error', err => {
		isLocalServerRunningInThisContext = false;
		serverChildProcess = null;
		if (!isStopping) _showError(`start local server failed!`, err);
	});
	s.on('close', (code) => {
		isLocalServerRunningInThisContext = false;
		serverChildProcess = null;
		if (code && !isStopping) {
			_showError(`local server exit with code ${code}!(Have you launched another local server?)`, {
				stack: `[Exit] exit code: ${code}`
			});
		} else if (isStopping) {
			try { log.debug('[LocalServer] child process closed (stopping=true)'); } catch(_) { /* ignore */ }
		}
	});
	serverChildProcess = s;
	isLocalServerRunningInThisContext = true;
	log.debug(`[Launch]: Local server launching...`);
	_checkIsLocalServerStart(!!silent, 0, false);


	/** @param {unknown} data */
	function onServerStdout(data) {
		const line = String(data);
		if (!ENABLE_PIPE_SERVER_OUTPUT && line.indexOf('Server started!') < 0)
			return;
		line.split('\n').forEach(/** @param {string} it */ it => log.debug(`[LocalServer/stdout]: ${it}`));
	}
	/** @param {unknown} data */
	function onServerStderr(data) {
		// Stderr can be noisy; log to debug channel to avoid error popups flooding the UI
		String(data).split('\n').forEach(/** @param {string} it */ it => log.debug(`[LocalServer/stderr]: ${it}`));
	}
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
				silent || vscode.window.showInformationMessage(`CodingTracker: local server started!`);
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

//Stop local server by requesting API /ajax/kill
function stopLocalServer() {
	isStopping = true;
	log.debug(`[Kill]: try to kill local server...`);
	axios.get(_getKillURL(), { params: { token: userConfig.token } })
		.then(/** @param {import('axios').AxiosResponse<any>} res */ (res) => {
			/** @type {{ success?: boolean; error?: string }} */
			var result = {};
			try { result = (res && res.data) ? res.data : {}; } catch (e) { log.error('[Error]: parse JSON failed!'); }
			if (result.success) {
				statusBar.localServer.turnOff()
				log.debug(`[Killed]: killed local server!`);
				vscode.window.showInformationMessage(`CodingTracker: local server stopped!`);
			} else {
				log.debug(`[Response]: ${JSON.stringify(result)}`);
				if (!isStopping) {
					(result.error || '').indexOf('local') >= 0 ?
						_showError(`stop failed!(because this server is not a local server)`, { stack: 'Not a local server!' }) :
						_showError(`stop failed!(because your token is invalid)`, { stack: 'token is invalid' });
				}
			}
		})
		.catch(/** @param {any} err */ (err) => {
			if (!isStopping) _showError(`kill failed, because could not connect local server`, err);
		});
}

//Stop local server running in this window by child process tree killing
function stopLocalServerSilentByTreeKill() {
	isStopping = true;
	log.debug('[Kill]: try to kill local server by tree kill way...');
	if (builtinServer) {
		try { builtinServer.close(); } catch(_) { /* ignore */ }
		builtinServer = null;
	}
	if (serverChildProcess && serverChildProcess.pid)
		require('tree-kill')(serverChildProcess.pid);
	serverChildProcess = null;
}

//Open your coding time report page
function showReport() {
	exec(_getOpenReportCommand(), err =>
		err && _showError(`Execute open report command error!`, err));
}

//check is the server connectable
//then(networkError, serverError, responseBody)
/**
 * @param {(networkErr?: any, serverErr?: any, result?: any) => void} then
 */
function _checkConnection(then) {
	axios.get(_getWelcomeURL())
		.then(/** @param {import('axios').AxiosResponse<any>} res */ (res) => {
			if (!res || res.status !== 200) return then(null, `server exception!(${res ? res.status : 'unknown'})`);
			try { var result = res.data; } catch (e) { return then(null, `server exception!(illegal welcome json)`); }
			return then(null, null, result);
		})
		.catch(/** @param {any} err */ (err) => then(err));
}

//Generate command for open report page in different OS
function _getOpenReportCommand() {
	const url = _getReportURL();
	switch (process.platform) {
		case 'win32': return `start "" "${url}"`;
		case 'darwin': return `open "${url}"`;
		default: return `xdg-open "${url}"`;
	}
}
function _getReportURL() { return `${userConfig.url}/report/` + (userConfig.token ? `?token=${userConfig.token}` : ``) }
// function _getTestURL() { return `${userConfig.url}/ajax/test` }
function _getWelcomeURL() { return `${userConfig.url}/` }
function _getKillURL() { return `${userConfig.url}/ajax/kill` }
function _readUserConfig() {
	var configurations = ext.getConfig('codingTracker'),
		token = String(configurations.get('uploadToken')),
		url = String(configurations.get('serverURL')),
		localMode = Boolean(configurations.get('localServerMode'));
	// In debug mode, provide sensible defaults only if nothing is configured
	try {
		const { isDebugMode } = require('./Constants');
		if (isDebugMode) {
			const hasUrl = !!url;
			const hasToken = !!token;
			const hasLocalMode = configurations.get('localServerMode') !== undefined;
			// Only auto-enable local mode when both url and token are missing AND localServerMode is not set
			if (!hasLocalMode && !hasUrl && !hasToken) {
				url = `http://127.0.0.1:${DEFAULT_PORT}`;
				token = 'dev';
				localMode = true;
			}
		}
	} catch(_) { /* ignore */ }
	url = url.endsWith('/') ? url.slice(0, -1) : url;
	return { url, token, localMode };
}

/**
 * @param {string} errOneLine
 * @param {{stack?: any}} errObject
 */
function _showError(errOneLine, errObject) {
	const MENU_ITEM_TEXT = 'Show details'
	log.error(`[Error]: ${errOneLine}\n${errObject.stack}`);
	vscode.window.showErrorMessage(`CodingTracker: ${errOneLine}`, MENU_ITEM_TEXT).then(item =>
		item == MENU_ITEM_TEXT ? log.show() : 0);
}
function _getLaunchParameters() {
	var ps = [];
	for (let i = 0; i < EXECUTE_PARAMETERS.length; i++)
		ps.push(EXECUTE_PARAMETERS[i]
			.replace('{0}', _getPortInfoFromURL(userConfig.url))
			.replace('{1}', userConfig.token));
	return ps;
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