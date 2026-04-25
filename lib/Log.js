//@ts-check
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isDebugMode, prefix } = require('./Constants');

/**
 * @typedef {(...msg: unknown[]) => void} LogFn
 */

/** @type {LogFn} */
const noopLog = (..._args) => {
	void _args;
	return undefined;
};
/** @type {() => void} */
const noopEnd = () => undefined;

/** @type {{ error: LogFn; warn: LogFn; debug: LogFn; end: () => void }} */
const logger = {
	error: /** @type {LogFn} */((...msg) => console.error(prefix, ...msg)),
	warn: /** @type {LogFn} */((...msg) => console.warn(prefix, ...msg)),
	debug: noopLog,
	end: noopEnd,
};

if (isDebugMode)
	setupDebugLogger();

module.exports = logger;


//#====================================
//#region module private functions

/**
 * Setup logger to debug mode (show message box, write log to file)
 */
function setupDebugLogger() {
	const vscode = require('vscode');
	const logStream = getDebugLogFileStream();

	logger.error = /** @type {LogFn} */((...msg) => {
		console.error(prefix, ...msg);
		vscode.window.showErrorMessage(`${prefix}: ${msg.join(' ')}`);
		if (logStream)
			logStream.write('-ERROR', ...msg);
	});
	logger.warn = /** @type {LogFn} */((...msg) => {
		console.warn(prefix, ...msg);
		vscode.window.showWarningMessage(`${prefix}: ${msg.join(' ')}`);
		if (logStream)
			logStream.write('-WARN', ...msg);
	});
	logger.debug = /** @type {LogFn} */((...msg) => {
		console.log(prefix, ...msg);
		if (logStream)
			logStream.write('', ...msg);
	});
	logger.end = () => {
		if (logStream)
			logStream.end();
	};
}

function getDebugLogFileStream() {
	const DEBUG_LOG_DIR = path.join(__dirname, '..', 'logs');

	try {
		if (!fs.existsSync(DEBUG_LOG_DIR))
			fs.mkdirSync(DEBUG_LOG_DIR);
	} catch (error) {
		logger.error(`create debug log dir (${DEBUG_LOG_DIR}) failed!`, error);
		return;
	}
	const now = new Date();
	const rand = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
	const id = rand.slice(rand.length - 12);
	const file = padding(now.getFullYear()) + padding(now.getMonth() + 1) + padding(now.getDate()) +
		padding(now.getHours()) + '.log';

	/** @type {fs.WriteStream | undefined} */
	let stream;
	let streamErrorOccurred = false;
	try {
	stream = fs.createWriteStream(path.join(DEBUG_LOG_DIR, file), { flags: 'a' });
		stream.on('error', onStreamError);
	} catch (error) {
		logger.error(`create debug log file stream (${file}) failed!`, error);
		return;
	}
	logger.debug(`created debug log file stream: ${file}`);
	return {
		/**
		 * @param {string} type
		 * @param {...unknown} data
		 */
		write: (type, ...data) => {
			if (!stream) return;
			stream.write(data.map(item => {
				if (Buffer.isBuffer(item)) return item.toString();
				if (item instanceof Error) return String(item.stack || item.message || item);
				return String(item);
			}).join('\t').split('\n').map(it => `${id}${type}:\t${it}`).join('\n') + '\n', () => undefined);
		},
		end: () => endStream(),
	};

	/**
	 * @param {number} num
	 * @returns {string}
	 */
	function padding(num) {
		return 10 > num ? `0${num}` : `${num}`;
	}
	function endStream() {
		try { if (stream) stream.end(); } catch (error) { void error; }
		stream = undefined;
	}
	/**
	 * @param {unknown} error
	 */
	function onStreamError(error) {
		if (streamErrorOccurred) return;
		streamErrorOccurred = true;
		logger.error('debug log file stream error:', error);
	}
}
//#endregion
