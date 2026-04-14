//@ts-check

"use strict";

const vscode = require("vscode");
const { isDebugMode } = require('./Constants');

const MAIN_TITLE = 'SlashCoded';
const DEBUG_TITLE = 'SlashCoded(Debug)';

/** @type {vscode.StatusBarItem | null} */
let statusBarItem = null;
/** @type {unknown[]} */
let uploadQueue = [];
let isLocalServerOn = false,
	/** @type {string | null} */
	mainStatus = '',
	/** @type {('watching'|'coding'|'terminal'|'chat'|'afk'|null)} */
	currentMode = null;
// Track sync health and surface in status/tooltip
let syncOnline = true;
/** @type {string|null} */
let syncLabel = null;

function init(enable = true) {
	if (statusBarItem && !enable) {
		statusBarItem.dispose();
		statusBarItem = null;
	}

	if(!statusBarItem && enable) {
		statusBarItem = vscode.window.createStatusBarItem();
		// Allow users to click the status bar to flush queued uploads
		try { statusBarItem.command = 'codingTracker.flushUploads'; } catch(_) { /* ignore */ }
	}
	syncOnline = true;
	syncLabel = null;
	mainStatus = '';
	_updateText();
	_applyStyle();
	_updateTooltip();
}

	/**
	 * @param {unknown[]} queue
	 */
	const bindUploadQueueArray = queue => {
		uploadQueue = Array.isArray(queue) ? queue : [];
		_update();
	};

	const setStatus2Uploading = () => {
		mainStatus = 'Uploading...';
		_update();
	};

	/**
	 * @param {string | undefined} desc
	 */
	const setStatus2Uploaded = desc => {
		mainStatus = desc || 'Uploaded';
		_update();
	};

	const setStatus2GotNew1 = () => {
		mainStatus = '+1';
		_update();
	};

	const setStatus2Nothing = () => {
		mainStatus = null;
		_update();
	};

	/**
	 * Reflect sync health in the status bar (online/offline label).
	 * @param {boolean} online
	 * @param {string=} label
	 */
	const setSyncState = (online, label) => {
		syncOnline = !!online;
		syncLabel = label || null;
		_update();
	};

	const setLocalServerOn = () => {
		isLocalServerOn = true;
		_update();
	};

	const setLocalServerOff = () => {
		isLocalServerOn = false;
		_update();
	};

	const setAFKOn = () => {
		currentMode = 'afk';
		_update();
	};

	const setAFKOff = () => {
		if (currentMode === 'afk') currentMode = null;
		_update();
	};

	/**
	 * Update the activity mode shown on the status bar.
	 * @param {'watching'|'coding'|'terminal'|'chat'|'afk'|null} mode
	 */
	const setMode = (mode) => {
		currentMode = mode;
		_update();
	};

function _update() {
	if (!statusBarItem) return;
	_updateText();
	_applyStyle();
	_updateTooltip();
}
function _updateText() {
	if (!statusBarItem) return;

	const iconFor = () => {
		switch (currentMode) {
			case 'watching': return 'eye';
			case 'coding': return 'code';
			case 'terminal': return 'terminal';
			case 'chat': return 'comment-discussion';
			case 'afk': return 'clock';
			default: return isDebugMode ? 'bug' : 'dashboard';
		}
	};
	const ico = iconFor();
	// Keep banner text predictable; append short badge for AFK to make the state obvious
	const baseLabel = isDebugMode ? DEBUG_TITLE : MAIN_TITLE;
	let text = `$(${ico}) ${baseLabel}`;
	if (currentMode === 'afk') text += ' (AFK)';
	if (!syncOnline) text += ' $(debug-disconnect) Offline';
	if (isLocalServerOn) text += ' $(database) Local';
	text += uploadQueue.length ? ('$(chevron-left) ' + uploadQueue.length) : '';
	statusBarItem.text = text;
	statusBarItem.show();
}
function _updateTooltip() {
	if (!statusBarItem) return;

	const qLen = uploadQueue.length;
	const modeLabel = (() => {
		switch (currentMode) {
			case 'watching': return 'Watching';
			case 'coding': return 'Coding';
			case 'terminal': return 'Terminal';
			case 'chat': return 'Chat';
			case 'afk': return 'AFK (paused)';
			default: return 'Idle';
		}
	})();

	const lines = [];
	lines.push(MAIN_TITLE);
	lines.push(`Recording: ${modeLabel}`);
	if (typeof mainStatus === 'string' && mainStatus) lines.push(`Status: ${mainStatus}`);
	if (syncLabel || !syncOnline) lines.push(`Sync: ${syncLabel || (syncOnline ? 'Online' : 'Offline')}`);
	if (isLocalServerOn) lines.push('Local server: running');
	if (qLen) lines.push(`Queue: ${qLen} pending ${qLen > 1 ? 'records' : 'record'}`);
	lines.push('Tip: Click to flush queue now');
	statusBarItem.tooltip = lines.join('\n');
	statusBarItem.show();
}

function _applyStyle() {
	if (!statusBarItem) return;
	if (currentMode === 'afk') {
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
		statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
	} else {
		statusBarItem.backgroundColor = undefined;
		statusBarItem.color = undefined;
	}
}

module.exports = {
	init,
	bindUploadQueueArray,
	setStatus2Uploading,
setStatus2Uploaded,
setStatus2GotNew1,
setStatus2Nothing,
setAFKOn,
setAFKOff,
setMode,
	setSyncState,
	localServer: {
		turnOn: setLocalServerOn,
		turnOff: setLocalServerOff
	}
};
