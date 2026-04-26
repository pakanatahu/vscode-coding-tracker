//@ts-check

const path = require('path');
const { languageFromFile, normalizeLanguageName } = require('./languageExtensions');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ACTIVITY_SERIES = [
    { key: 'reading', label: 'Reading', aliases: ['open'], colorVar: '--chart-2', color: '#38bdf8' },
    { key: 'coding', label: 'Coding', aliases: ['code'], colorVar: '--chart-1', color: '#8b5cf6' },
    { key: 'aiChat', label: 'AI chat', aliases: ['chat', 'aiChat', 'aichat'], colorVar: '--chart-3', color: '#2dd4bf' },
    { key: 'terminal', label: 'Terminal', aliases: ['terminal'], colorVar: '--chart-4', color: '#f59e0b' }
];
function buildReportSummary(events, options) {
    const now = normalizeNow(options && options.now);
    const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
    const filteredEvents = safeEvents.filter(event => Number(event.long) > 0);
    const datedEvents = filteredEvents.filter(event => Number(event.time) > 0);
    const times = datedEvents.map(event => Number(event.time));
    const chart24h = build24HourChart(filteredEvents, now);
    const chartMonth = buildMonthChart(filteredEvents, now);

    return {
        reportDate: now.getTime(),
        reportDateLabel: formatReportDate(now),
        totals: {
            totalMs: sum(filteredEvents, event => Number(event.long) || 0),
            eventCount: filteredEvents.length,
            rangeStart: times.length ? Math.min(...times) : null,
            rangeEnd: times.length ? Math.max(...times.map((time, index) => time + (Number(datedEvents[index].long) || 0))) : null
        },
        chart24h,
        chartMonth,
        byActivity: toGroups(filteredEvents, event => normalizeActivity(event.type)),
        byRepo: toGroups(filteredEvents, event => normalizeRepo(event.vcs_repo)),
        byBranch: toGroups(filteredEvents, event => normalizeBranch(event.vcs_branch)),
        byRepoBranch: toGroups(filteredEvents, normalizeRepoBranch),
        byExtension: toGroups(
            filteredEvents.filter(event => shouldIncludeExtension(event.file)),
            event => extractExtension(event.file)
        ),
        byLanguage: toGroups(
            filteredEvents.filter(event => normalizeLanguage(event)),
            normalizeLanguage
        )
    };
}

function build24HourChart(events, now) {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + DAY_MS;
    const labels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
    const buckets = buildActivityBuckets(events, startOfDay, 24, HOUR_MS);

    return {
        title: 'Last 24 hours',
        breakdownLabel: 'Break down by',
        breakdownOptions: ['Activities'],
        activeBreakdown: 'Activities',
        axisUnit: 'Minutes',
        labels,
        currentTimeLabel: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        rangeStart: startOfDay,
        rangeEnd: endOfDay,
        maxHours: 1,
        series: buildChartSeries(buckets)
    };
}

function buildMonthChart(events, now) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endOfMonth = startOfMonth + (daysInMonth * DAY_MS);
    const labels = Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, '0'));
    const buckets = buildActivityBuckets(events, startOfMonth, daysInMonth, DAY_MS);
    const peakHours = Math.max(
        ...labels.map((_, index) => ACTIVITY_SERIES.reduce((total, activity) => total + buckets[activity.key][index], 0) / HOUR_MS),
        0
    );

    return {
        title: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        breakdownLabel: 'Break down by',
        breakdownOptions: ['Activities'],
        activeBreakdown: 'Activities',
        axisUnit: 'Minutes',
        labels,
        rangeStart: startOfMonth,
        rangeEnd: endOfMonth,
        maxHours: peakHours > 0 ? Math.max(1, Math.ceil(peakHours)) : 1,
        series: buildChartSeries(buckets)
    };
}

function buildActivityBuckets(events, rangeStart, bucketCount, bucketMs) {
    const buckets = Object.fromEntries(ACTIVITY_SERIES.map(activity => [activity.key, new Array(bucketCount).fill(0)]));
    const rangeEnd = rangeStart + (bucketCount * bucketMs);

    for (const event of events) {
        const bucket = toChartBucket(event.type);
        if (!bucket) continue;
        const eventStart = Number(event.time) || 0;
        const duration = Number(event.long) || 0;
        if (eventStart <= 0 || duration <= 0) continue;
        const eventEnd = eventStart + duration;
        const overlapStart = Math.max(eventStart, rangeStart);
        const overlapEnd = Math.min(eventEnd, rangeEnd);
        if (overlapEnd <= overlapStart) continue;

        const firstIndex = Math.max(0, Math.floor((overlapStart - rangeStart) / bucketMs));
        const lastIndex = Math.min(bucketCount - 1, Math.floor((overlapEnd - 1 - rangeStart) / bucketMs));
        for (let index = firstIndex; index <= lastIndex; index += 1) {
            const slotStart = rangeStart + (index * bucketMs);
            const slotEnd = slotStart + bucketMs;
            const coveredMs = Math.max(0, Math.min(overlapEnd, slotEnd) - Math.max(overlapStart, slotStart));
            if (coveredMs) buckets[bucket][index] += coveredMs;
        }
    }

    return buckets;
}

function buildChartSeries(buckets) {
    return ACTIVITY_SERIES.map(activity => ({
        key: activity.key,
        label: activity.label,
        totalMs: sum(buckets[activity.key], value => value),
        values: buckets[activity.key],
        color: activity.color,
        colorVar: activity.colorVar
    }));
}

function toChartBucket(type) {
    const value = typeof type === 'string' ? type.trim() : '';
    const lower = value.toLowerCase();
    for (const activity of ACTIVITY_SERIES) {
        if (activity.aliases.some(alias => alias.toLowerCase() === lower)) return activity.key;
    }
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
    const bucket = toChartBucket(value);
    const activity = ACTIVITY_SERIES.find(item => item.key === bucket);
    return activity ? activity.label : 'Unknown';
}

function normalizeRepo(value) {
    return normalizeLabel(value, 'No repository');
}

function normalizeBranch(value) {
    return normalizeLabel(value, 'No branch');
}

function normalizeRepoBranch(event) {
    return `${normalizeRepo(event.vcs_repo)} / ${normalizeBranch(event.vcs_branch)}`;
}

function normalizeLanguage(event) {
    const lang = typeof event.lang === 'string' ? event.lang.trim() : '';
    const normalizedLanguage = normalizeLanguageName(lang);
    return normalizedLanguage || languageFromFile(event.file);
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

function normalizeNow(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
}

function formatReportDate(now) {
    return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

module.exports = {
    buildReportSummary
};
