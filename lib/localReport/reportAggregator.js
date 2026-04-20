//@ts-check

const path = require('path');

function buildReportSummary(events) {
    const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
    const filteredEvents = safeEvents.filter(event => Number(event.long) > 0);
    const datedEvents = filteredEvents.filter(event => Number(event.time) > 0);
    const times = datedEvents.map(event => Number(event.time));

    return {
        totals: {
            totalMs: sum(filteredEvents, event => Number(event.long) || 0),
            eventCount: filteredEvents.length,
            rangeStart: times.length ? Math.min(...times) : null,
            rangeEnd: times.length ? Math.max(...times.map((time, index) => time + (Number(datedEvents[index].long) || 0))) : null
        },
        byActivity: toGroups(filteredEvents, event => normalizeActivity(event.type)),
        byRepo: toGroups(filteredEvents, event => normalizeRepo(event.vcs_repo)),
        byBranch: toGroups(filteredEvents, event => normalizeBranch(event.vcs_branch)),
        byExtension: toGroups(
            filteredEvents.filter(event => shouldIncludeExtension(event.file)),
            event => extractExtension(event.file)
        )
    };
}

function sum(items, selector) {
    return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

function toGroups(events, keySelector) {
    /** @type {Map<string, number>} */
    const totals = new Map();
    for (const event of events) {
        const key = keySelector(event);
        const totalMs = Number(event.long) || 0;
        totals.set(key, (totals.get(key) || 0) + totalMs);
    }
    return Array.from(totals.entries())
        .map(([key, totalMs]) => ({ key, totalMs }))
        .sort((left, right) => {
            if (right.totalMs !== left.totalMs) return right.totalMs - left.totalMs;
            return left.key.localeCompare(right.key);
        });
}

function normalizeActivity(value) {
    return normalizeLabel(value, 'unknown');
}

function normalizeRepo(value) {
    return normalizeLabel(value, 'No repository');
}

function normalizeBranch(value) {
    return normalizeLabel(value, 'No branch');
}

function normalizeLabel(value, fallback) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? text : fallback;
}

function shouldIncludeExtension(file) {
    return typeof file === 'string' && file.trim().length > 0;
}

function extractExtension(file) {
    const ext = path.extname(typeof file === 'string' ? file.trim() : '');
    return ext || 'No extension';
}

module.exports = {
    buildReportSummary
};
