"use strict";

/**
 * Installs global error hooks once per extension-host process.
 * This keeps stack traces visible instead of failing silently.
 */
function installErrorHooks(log) {
    const hookFlag = Symbol.for('codingTracker.errorHookInstalled');
    const sharedScope = /** @type {{ [key: symbol]: unknown }} */ (/** @type {unknown} */ (global));
    if (sharedScope[hookFlag]) return;
    sharedScope[hookFlag] = true;

    /** @type {(err: unknown) => void} */
    const uncaughtHandler = (err) => {
        try {
            const maybeStack = /** @type {{stack?: unknown}} */ (err);
            const stack = maybeStack && typeof maybeStack.stack === 'string' ? maybeStack.stack : String(err);
            log.error(`[uncaughtException] ${stack}`);
        } catch (loggingError) {
            // eslint-disable-next-line no-console
            console.error('[uncaughtException]', err, '(logging failed:', loggingError, ')');
        }
    };
    process.on('uncaughtException', uncaughtHandler);

    /** @type {(reason: unknown, promise: Promise<unknown>) => void} */
    const unhandledHandler = (reason, promise) => {
        void promise;
        try {
            const maybeStack = /** @type {{stack?: unknown}} */ (reason);
            const stack = maybeStack && typeof maybeStack.stack === 'string' ? maybeStack.stack : String(reason);
            log.error(`[unhandledRejection] ${stack}`);
        } catch (loggingError) {
            // eslint-disable-next-line no-console
            console.error('[unhandledRejection]', reason, '(logging failed:', loggingError, ')');
        }
    };
    process.on('unhandledRejection', unhandledHandler);
}

module.exports = { installErrorHooks };
