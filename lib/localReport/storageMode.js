//@ts-check

/**
 * @param {{ storageMode?: string, discovery?: { apiBaseUrl?: string, publicBaseUrl?: string }|null }} input
 * @returns {boolean}
 */
function shouldQueueLiveEvents(input) {
    const storageMode = input && input.storageMode === 'standalone' ? 'standalone' : 'auto';
    if (storageMode === 'standalone') return false;

    const discovery = input && input.discovery ? input.discovery : null;
    return !!(discovery && (discovery.apiBaseUrl || discovery.publicBaseUrl));
}

module.exports = {
    shouldQueueLiveEvents
};
