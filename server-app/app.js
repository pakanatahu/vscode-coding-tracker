const areaCharts = new Map();
const THEME_STORAGE_KEY = 'slashcoded.localDashboard.theme';
const GROUP_LIMITS = {
    'By activity': Infinity,
    'By repository': 8,
    'By repository branch': 6,
    'By language': 8
};
const OTHER_LABELS = {
    'By repository': 'Other repositories',
    'By repository branch': 'Other repository branches',
    'By language': 'Other languages'
};

function initTheme() {
    const stored = readStoredTheme();
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored || preferred;
    applyTheme(theme);

    const toggle = document.querySelector('#theme-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        try {
            window.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch (_) {
            // ignore blocked localStorage
        }
    });
}

function readStoredTheme() {
    try {
        const value = window.localStorage?.getItem(THEME_STORAGE_KEY);
        return value === 'dark' || value === 'light' ? value : null;
    } catch (_) {
        return null;
    }
}

function applyTheme(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalized);
    const toggle = document.querySelector('#theme-toggle');
    if (!toggle) return;
    const isDark = normalized === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.textContent = isDark ? 'Light mode' : 'Dark mode';
}

async function loadSummary() {
    try {
        const response = await fetch('/api/report/summary');
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        const summary = await response.json();

        renderQuickStats(summary || {}, document.querySelector('#quick-stats'));
        renderAreaChart('chart24h', summary.chart24h || {}, {
            fallbackTitle: 'Last 24 hours',
            canvasId: 'chart24h-canvas',
            ariaLabel: 'Last 24 hours activity chart',
            emptyText: 'No local activity recorded for today yet.',
            fixedMaxMinutes: 60,
            tickStep: 15,
            showAllXTicks: true,
            xTickRotation: 50,
            unit: 'minutes'
        });
        renderAreaChart('chartMonth', summary.chartMonth || {}, {
            fallbackTitle: 'This month',
            canvasId: 'chart-month-canvas',
            ariaLabel: 'Current month activity chart',
            emptyText: 'No local activity recorded for this month yet.',
            tickStep: undefined,
            showAllXTicks: true,
            unit: 'hours'
        });
        renderGroup('By activity', 'Time grouped by tracked activity type.', summary.byActivity || [], document.querySelector('#activity-groups'));
        renderGroup('By repository', 'Repository totals from the raw locally stored events.', summary.byRepo || [], document.querySelector('#repo-groups'));
        renderGroup('By repository branch', 'Branch totals paired with their repository.', summary.byRepoBranch || [], document.querySelector('#branch-groups'));
        renderGroup('By language', 'Tracked file activity grouped by language.', summary.byLanguage || [], document.querySelector('#extension-groups'));
    } catch (error) {
        renderError(error);
    }
}

function renderAreaChart(rootId, chart, config) {
    const root = document.querySelector(`#${rootId}`);
    if (!root) return;
    const labels = Array.isArray(chart.labels) ? chart.labels : [];
    const series = Array.isArray(chart.series) ? chart.series : [];
    const activeSeries = series.filter(item => Array.isArray(item.values));
    const hasData = activeSeries.some(item => item.values.some(value => Number(value) > 0));
    const title = chart.title || config.fallbackTitle;

    if (!labels.length || !activeSeries.length || !hasData) {
        destroyAreaChart(rootId);
        root.innerHTML = `
            <div class="chart-header">
                <h2>${escapeHtml(title)}</h2>
            </div>
            <div class="chart-canvas-wrap chart-empty-wrap">
                <p class="empty-state">${escapeHtml(config.emptyText)}</p>
            </div>
        `;
        return;
    }

    root.innerHTML = `
        <div class="chart-header">
            <div class="chart-title-row">
                <h2>${escapeHtml(title)}</h2>
                ${renderChartStats(activeSeries)}
            </div>
            ${renderChartLegend(activeSeries)}
        </div>
        <div class="chart-frame">
            <div class="chart-canvas-wrap">
                <canvas id="${escapeHtml(config.canvasId)}" aria-label="${escapeHtml(config.ariaLabel)}" role="img"></canvas>
            </div>
        </div>
    `;

    renderAreaChartCanvas(rootId, root, chart, labels, activeSeries, config);
}

function renderQuickStats(summary, root) {
    if (!root) return;
    const totals = summary.totals || {};
    const reportDate = summary.reportDateLabel || 'Current local date';

    root.innerHTML = `
        <div class="panel-head quick-stats-head">
            <h2>Quick stats</h2>
            <p class="panel-copy">Summary computed from the local fallback history store.</p>
        </div>
        <div class="quick-stats-grid">
            ${renderQuickStat('Tracked time', formatRoundedDuration(totals.totalMs || 0))}
            ${renderQuickStat('Events', String(totals.eventCount || 0))}
            ${renderQuickStat('Report date', reportDate)}
        </div>
    `;
}

function renderChartStats(series) {
    const totalMs = series.reduce((total, item) => total + (Number(item.totalMs) || sum(item.values || [], value => value)), 0);
    return `
        <div class="chart-top-stats">
            <div class="stat-inline">
                <span class="label">Tracked time</span>
                <span class="value">${escapeHtml(formatRoundedDuration(totalMs))}</span>
            </div>
        </div>
    `;
}

function renderChartLegend(series) {
    return `
        <ul class="legend-inline" role="list" aria-label="Activity legend">
            ${series.map(item => {
                const color = item.color || cssHsl(item.colorVar || '--chart-1');
                const totalMs = Number(item.totalMs) || sum(item.values || [], value => value);
                return `
                    <li class="legend-pill" style="--c: ${escapeHtml(color)}">
                        <span class="swatch" aria-hidden="true"></span>
                        <span class="lbl">${escapeHtml(item.label || 'Unknown')}</span>
                        <span class="mins">${escapeHtml(formatRoundedDuration(totalMs))}</span>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

function sum(items, selector) {
    return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

function destroyAreaChart(key) {
    const chart = areaCharts.get(key);
    if (!chart) return;
    try {
        chart.destroy();
    } catch (_) {
        // noop
    }
    areaCharts.delete(key);
}

function renderAreaChartCanvas(key, root, chart, labels, series, config) {
    destroyAreaChart(key);
    const canvas = root.querySelector(`#${config.canvasId}`);
    if (!canvas || !window.Chart) return;

    const datasets = buildAreaDatasets(canvas, series, config);
    const options = createAreaChartOptions(labels, chart, config);
    const plugins = [
        createVerticalLinePlugin(),
        createTopStackOutlinePlugin()
    ];

    areaCharts.set(key, new window.Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options,
        plugins
    }));
}

function buildAreaDatasets(canvas, series, config) {
    const divisor = config.unit === 'hours' ? 3600000 : 60000;
    return series.map((item, index) => {
        const stroke = item.color || cssHsl(item.colorVar || `--chart-${index + 1}`);
        const backgroundColor = buildSeriesGradient(canvas, stroke);
        return {
            label: item.label || 'Unknown',
            data: (item.values || []).map(value => (Number(value) || 0) / divisor),
            borderColor: stroke,
            backgroundColor,
            borderWidth: index === 2 ? 3 : 2.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 12,
            cubicInterpolationMode: 'monotone',
            tension: 0.32,
            stack: 'activity',
            order: index + 1
        };
    });
}

function buildSeriesGradient(canvas, stroke) {
    const context = canvas.getContext('2d');
    const bounds = canvas.getBoundingClientRect();
    const height = Math.max(320, Math.round(bounds.height || canvas.height || 430));
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, withAlpha(stroke, 0.32));
    gradient.addColorStop(0.55, withAlpha(stroke, 0.14));
    gradient.addColorStop(1, withAlpha(stroke, 0.02));
    return gradient;
}

function createAreaChartOptions(labels, chart, config) {
    const is24hLabels = labels.length > 0 && labels.length <= 24;
    const unit = config.unit === 'hours' ? 'hours' : 'minutes';
    const maxValue = config.fixedMaxMinutes || computeDynamicMaxValue(chart.series || [], unit);
    const tickStep = config.tickStep || computeTickStep(maxValue, unit);
    const xTickRotation = Number(config.xTickRotation) || 0;
    return {
        ...lineBaseOptions(),
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(7, 15, 31, 0.94)',
                borderColor: 'rgba(138, 158, 201, 0.16)',
                borderWidth: 1,
                titleColor: '#f1f5ff',
                bodyColor: '#d9e3fb',
                footerColor: '#aebad8',
                displayColors: true,
                callbacks: {
                    title: (items) => {
                        const item = items && items[0];
                        return item && typeof item.label === 'string' ? item.label : (chart.currentTimeLabel || '');
                    },
                    label: (ctx) => `${ctx.dataset.label} ${formatDuration(Number(ctx.parsed?.y || 0) * (unit === 'hours' ? 3600000 : 60000))}`,
                    footer: (items) => {
                        const total = items.reduce((sum, item) => sum + (Number(item.parsed?.y) || 0), 0);
                        return `Total ${formatDuration(total * (unit === 'hours' ? 3600000 : 60000))}`;
                    }
                }
            }
        },
        layout: { padding: { left: 0, right: 0, top: 10, bottom: is24hLabels ? 12 : 8 } },
        elements: {
            line: { tension: 0.32 },
            point: { radius: 0, hoverRadius: 0 }
        },
        scales: {
            x: {
                bounds: 'ticks',
                offset: false,
                reverse: false,
                stacked: false,
                grid: {
                    drawOnChartArea: true,
                    drawTicks: true,
                    tickLength: 4,
                    color: readCssVar('--grid-line', 'rgba(255,255,255,0.06)')
                },
                ticks: {
                    autoSkip: !config.showAllXTicks,
                    maxTicksLimit: config.showAllXTicks ? undefined : 8,
                    maxRotation: xTickRotation,
                    minRotation: xTickRotation,
                    color: cssHsl('--muted-foreground'),
                    callback: (_, index) => labels[index] || ''
                }
            },
            y: {
                position: 'right',
                stacked: true,
                beginAtZero: true,
                max: maxValue,
                grid: {
                    color: readCssVar('--grid-line', 'rgba(255,255,255,0.06)'),
                    drawOnChartArea: true
                },
                title: {
                    display: true,
                    text: unit === 'hours' ? 'Hours' : 'Minutes',
                    color: cssHsl('--muted-foreground')
                },
                ticks: {
                    stepSize: tickStep,
                    color: cssHsl('--muted-foreground'),
                    callback: (value) => unit === 'hours' ? formatHourTick(Number(value)) : formatMinuteTick(Number(value))
                }
            }
        }
    };
}

function computeDynamicMaxValue(series, unit) {
    const activeSeries = Array.isArray(series) ? series : [];
    const width = activeSeries.reduce((max, item) => Math.max(max, Array.isArray(item.values) ? item.values.length : 0), 0);
    let max = 0;
    const divisor = unit === 'hours' ? 3600000 : 60000;
    for (let index = 0; index < width; index += 1) {
        const totalMs = activeSeries.reduce((sumMs, item) => sumMs + (Number(item.values?.[index]) || 0), 0);
        max = Math.max(max, totalMs / divisor);
    }
    if (unit === 'hours') {
        if (max <= 0) return 1;
        return Math.max(1, Math.ceil(max));
    }
    if (max <= 0) return 60;
    return Math.max(60, Math.ceil(max / 60) * 60);
}

function computeTickStep(maxValue, unit) {
    if (unit === 'hours') {
        if (maxValue <= 6) return 1;
        if (maxValue <= 12) return 2;
        return 4;
    }
    if (maxValue <= 60) return 15;
    if (maxValue <= 240) return 60;
    return 120;
}

function createVerticalLinePlugin() {
    return {
        id: 'verticalLine',
        afterDraw(chart) {
            const active = chart.tooltip?.getActiveElements?.() || [];
            if (!active.length) return;
            const x = active[0]?.element?.x;
            if (typeof x !== 'number') return;
            const ctx = chart.ctx;
            const { top, bottom } = chart.chartArea;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255,255,255,0.24)';
            ctx.stroke();
            ctx.restore();
        }
    };
}

function createTopStackOutlinePlugin() {
    return {
        id: 'topStackOutline',
        afterDatasetsDraw(chart) {
            const metas = chart.getSortedVisibleDatasetMetas?.() || [];
            if (!metas.length) return;
            const length = metas[0]?.data?.length || 0;
            if (!length) return;

            const xScale = chart.scales?.x;
            const yScale = chart.scales?.y;
            if (!xScale || !yScale) return;

            const ctx = chart.ctx;
            ctx.save();
            ctx.beginPath();
            for (let index = 0; index < length; index += 1) {
                let sumY = 0;
                for (const meta of metas) {
                    const parsed = meta?.controller?.getParsed?.(index);
                    sumY += Number(parsed?.y || 0);
                }
                const x = xScale.getPixelForValue(index);
                const y = yScale.getPixelForValue(sumY);
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.lineWidth = 1.25;
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.stroke();
            ctx.restore();
        }
    };
}

function lineBaseOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 0,
        font: { family: uiFontStack() }
    };
}

function uiFontStack() {
    return readCssVar('--font-ui', 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif');
}

function cssHsl(varName, alpha) {
    const value = readCssVar(varName, '').trim();
    if (!value) return alpha == null ? '#9aa0a6' : `rgba(154,160,166,${alpha})`;
    return alpha == null ? `hsl(${value})` : `hsl(${value} / ${alpha})`;
}

function readCssVar(name, fallback) {
    try {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value && value.length > 0 ? value : fallback;
    } catch (_) {
        return fallback;
    }
}

function withAlpha(color, alpha) {
    const value = String(color || '').trim();
    const match = /^#([0-9a-f]{6})$/i.exec(value);
    if (!match) return color;
    const base = match[1];
    const red = parseInt(base.slice(0, 2), 16);
    const green = parseInt(base.slice(2, 4), 16);
    const blue = parseInt(base.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatMinuteTick(value) {
    if (value === 60) return '1h';
    return `${Math.max(0, Number(value) || 0)}m`;
}

function formatHourTick(value) {
    return `${Math.max(0, Number(value) || 0)}h`;
}

function renderQuickStat(label, value) {
    return `
        <article class="stat-card">
            <span class="stat-label">${escapeHtml(label)}</span>
            <span class="stat-value">${escapeHtml(value)}</span>
        </article>
    `;
}

function renderGroup(title, description, items, root) {
    if (!root) return;
    if (!items.length) {
        root.innerHTML = `
            <div class="panel-head">
                <h2>${escapeHtml(title)}</h2>
                <p class="panel-copy">${escapeHtml(description)}</p>
            </div>
            <p class="empty-state">No local activity recorded yet.</p>
        `;
        return;
    }
    const limit = GROUP_LIMITS[title] ?? Infinity;
    const visibleItems = Number.isFinite(limit) ? items.slice(0, limit) : items;
    const hiddenItems = Number.isFinite(limit) ? items.slice(limit) : [];
    const hiddenTotal = hiddenItems.reduce((total, item) => total + (Number(item.totalMs) || 0), 0);
    const displayItems = hiddenItems.length
        ? visibleItems.concat([{ key: OTHER_LABELS[title] || 'Other', totalMs: hiddenTotal, isSummary: true }])
        : visibleItems;
    const maxTotal = Math.max(...displayItems.map(item => Number(item.totalMs) || 0), 1);

    root.innerHTML = `
        <div class="panel-head">
            <h2>${escapeHtml(title)}</h2>
            <p class="panel-copy">${escapeHtml(description)}</p>
        </div>
        <div class="group-list">
            ${displayItems.map(item => renderGroupRow(title, item, maxTotal)).join('')}
        </div>
    `;
}

function renderGroupRow(title, item, maxTotal) {
    const summaryClass = item.isSummary ? ' group-row-summary' : '';
    const totalMs = Number(item.totalMs) || 0;
    const width = Math.max(2, Math.min(100, Math.round((totalMs / Math.max(maxTotal, 1)) * 100)));
    return `
        <div class="group-row${summaryClass}">
            <div class="group-row-head">
                <span class="group-key">${escapeHtml(formatGroupKey(title, item.key || 'Unknown'))}</span>
                <span class="group-value">${escapeHtml(formatBarDuration(totalMs))}</span>
            </div>
            <div class="group-bar-track" aria-hidden="true">
                <span class="group-bar-fill" style="width: ${width}%"></span>
            </div>
        </div>
    `;
}

function renderError(error) {
    const message = error && error.message ? error.message : 'Unknown error';
    for (const selector of ['#quick-stats', '#activity-groups', '#repo-groups', '#branch-groups', '#extension-groups']) {
        const root = document.querySelector(selector);
        if (!root) continue;
        root.innerHTML = selector === '#quick-stats'
            ? '<p class="error-state">Could not load the local report summary.</p>'
            : '';
    }
    const quickStats = document.querySelector('#quick-stats');
    if (quickStats) {
        quickStats.innerHTML = `<p class="error-state">Could not load the local report summary. ${escapeHtml(message)}</p>`;
    }
}

function formatDuration(totalMs) {
    const ms = Math.max(0, Number(totalMs) || 0);
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    return `${seconds}s`;
}

function formatRoundedDuration(totalMs) {
    const ms = Math.max(0, Number(totalMs) || 0);
    if (ms >= 3600000) return `${Math.max(1, Math.round(ms / 3600000))}h`;
    return formatDuration(ms);
}

function formatBarDuration(totalMs) {
    const ms = Math.max(0, Number(totalMs) || 0);
    if (ms >= 3600000) {
        const hours = ms / 3600000;
        return hours >= 10 ? `${Math.round(hours)}h` : `${Math.round(hours * 10) / 10}h`;
    }
    const minutes = Math.round(ms / 60000);
    if (minutes >= 1) return `${minutes} min`;
    return formatDuration(ms);
}

function formatGroupKey(title, key) {
    if (title === 'By repository') {
        return formatRepositoryLabel(key);
    }
    return key;
}

function formatRepositoryLabel(value) {
    const text = String(value || '').trim();
    if (!text) return 'Unknown';
    try {
        const url = new URL(text);
        const cleaned = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '');
        return cleaned || text;
    } catch (_) {
        return text.replace(/\.git$/i, '');
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

initTheme();
void loadSummary();
