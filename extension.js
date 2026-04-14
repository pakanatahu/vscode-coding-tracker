//@ts-check
"use strict";

module.exports = (process.env.CODING_TRACKER_USE_LEGACY === '1')
    ? require('./lib/extensionLegacy')
    : require('./lib/extensionMain');
