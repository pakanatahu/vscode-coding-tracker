//@ts-check

/**
 * OutputChannel module
 * 1. create a new output channel for coding tracker
 * 2. output content / exception
 * 3. show output channel
 * 4. dispose output channel
 */

const log = require('./Log');
const vscode = require('vscode');
const { outputChannelName } = require('./Constants');

/** @type {vscode.OutputChannel | null} */
let channel = null;

const getChannel = () => {
    channel = channel || vscode.window.createOutputChannel(outputChannelName);
    return channel;
};

const stop = () => {
    if (!channel) return;
    channel.hide();
    channel.dispose();
    channel = null;
};

/**
 * @param {unknown} data
 */
const debug = data => {
    log.debug(data);
    getChannel().appendLine(String(data));
};

/**
 * @param {unknown} err
 */
const error = err => {
    log.error(err);
    getChannel().appendLine(String(err));
};

module.exports = {
	start: getChannel,
	stop,
	debug,
	error,
	show: () => getChannel().show()
};
