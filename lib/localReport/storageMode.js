//@ts-check

/**
 * @param {{ connectionMode:'desktop'|'cloud', discovery?: { apiBaseUrl?: string, publicBaseUrl?: string }|null, forceLocalFallback?: boolean }} input
 * @returns {boolean}
 */
function shouldQueueLiveEvents(input) {
    if (input && input.forceLocalFallback) return false;
    const connectionMode = input && input.connectionMode ? input.connectionMode : 'desktop';
    if (connectionMode !== 'desktop') return true;
    const discovery = input && input.discovery ? input.discovery : null;
    return !!(discovery && (discovery.apiBaseUrl || discovery.publicBaseUrl));
}

module.exports = {
    shouldQueueLiveEvents
};
