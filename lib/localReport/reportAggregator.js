//@ts-check

const path = require('path');

function buildReportSummary(events) {
    const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
    const filteredEvents = safeEvents.filter(event => Number(event.long) > 0);
    const datedEvents = filteredEvents.filter(event => Number(event.time) > 0);
    const times = datedEvents.map(event => Number(event.time));
    const chart24h = build24HourChart(filteredEvents);

    return {
        totals: {
            totalMs: sum(filteredEvents, event => Number(event.long) || 0),
            eventCount: filteredEvents.length,
            rangeStart: times.length ? Math.min(...times) : null,
            rangeEnd: times.length ? Math.max(...times.map((time, index) => time + (Number(datedEvents[index].long) || 0))) : null
        },
        chart24h,
        byActivity: toGroups(filteredEvents, event => normalizeActivity(event.type)),
        byRepo: toGroups(filteredEvents, event => normalizeRepo(event.vcs_repo)),
        byBranch: toGroups(filteredEvents, event => normalizeBranch(event.vcs_branch)),
        byExtension: toGroups(
            filteredEvents.filter(event => shouldIncludeExtension(event.file)),
            event => extractExtension(event.file)
        )
    };
}

function build24HourChart(events) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000);
    const hourMs = 60 * 60 * 1000;
    const labels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
    const reading = new Array(24).fill(0);
    const writing = new Array(24).fill(0);
    const terminal = new Array(24).fill(0);

    for (const event of events) {
        const bucket = toChartBucket(event.type);
        if (!bucket) continue;
        const eventStart = Number(event.time) || 0;
        const duration = Number(event.long) || 0;
        if (eventStart <= 0 || duration <= 0) continue;
        const eventEnd = eventStart + duration;
        const overlapStart = Math.max(eventStart, startOfDay);
        const overlapEnd = Math.min(eventEnd, endOfDay);
        if (overlapEnd <= overlapStart) continue;

        for (let hour = 0; hour < 24; hour += 1) {
            const slotStart = startOfDay + (hour * hourMs);
            const slotEnd = slotStart + hourMs;
            const coveredMs = Math.max(0, Math.min(overlapEnd, slotEnd) - Math.max(overlapStart, slotStart));
            if (!coveredMs) continue;
            if (bucket === 'reading') reading[hour] += coveredMs;
            if (bucket === 'writing') writing[hour] += coveredMs;
            if (bucket === 'terminal') terminal[hour] += coveredMs;
        }
    }

    const peakHours = Math.max(
        ...reading.map((_, index) => (reading[index] + writing[index] + terminal[index]) / hourMs),
        0
    );
    const maxHours = peakHours > 0
        ? Math.max(0.25, Math.ceil(peakHours * 4) / 4)
        : 1;

    return {
        title: 'Last 24 hours',
        breakdownLabel: 'Break down by',
        breakdownOptions: ['Activities'],
        activeBreakdown: 'Activities',
        axisUnit: 'Minutes',
        labels,
        currentTimeLabel: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        maxHours,
        series: [
            { key: 'reading', label: 'Reading', totalMs: sum(reading, value => value), values: reading, color: '#50c2ff' },
            { key: 'writing', label: 'Writing', totalMs: sum(writing, value => value), values: writing, color: '#7a5cff' },
            { key: 'terminal', label: 'Terminal', totalMs: sum(terminal, value => value), values: terminal, color: '#c46cff' }
        ]
    };
}

function toChartBucket(type) {
    if (type === 'open') return 'reading';
    if (type === 'code') return 'writing';
    if (type === 'terminal') return 'terminal';
    return '';
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
