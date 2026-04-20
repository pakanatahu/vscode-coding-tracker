let reportChart24h = null;

async function loadSummary() {
    try {
        const response = await fetch('/api/report/summary');
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        const summary = await response.json();

        renderQuickStats(summary.totals || {}, document.querySelector('#quick-stats'));
        render24HourChart(summary.chart24h || {});
        renderGroup('By activity', 'Time grouped by tracked activity type.', summary.byActivity || [], document.querySelector('#activity-groups'));
        renderGroup('By repository', 'Repository totals from the raw locally stored events.', summary.byRepo || [], document.querySelector('#repo-groups'));
        renderGroup('By branch', 'Branch totals from the raw locally stored events.', summary.byBranch || [], document.querySelector('#branch-groups'));
        renderGroup('By file extension', 'Total time spent in files grouped by extension.', summary.byExtension || [], document.querySelector('#extension-groups'));
    } catch (error) {
        renderError(error);
    }
}

function render24HourChart(chart) {
    const root = document.querySelector('#chart24h');
    if (!root) return;
    const labels = Array.isArray(chart.labels) ? chart.labels : [];
    const series = Array.isArray(chart.series) ? chart.series : [];
    const activeSeries = series.filter(item => Array.isArray(item.values));
    const hasData = activeSeries.some(item => item.values.some(value => Number(value) > 0));

    if (!labels.length || !activeSeries.length || !hasData) {
        destroy24HourChart();
        root.innerHTML = `
            <div class="chart-header">
                <h2>VS Code activity breakdown</h2>
                <p class="chart-subtitle">Visible totals</p>
            </div>
            <p class="empty-state">No local activity recorded for today yet.</p>
        `;
        return;
    }

    root.innerHTML = `
        <div class="chart-header">
            <h2>${escapeHtml(chart.title || 'VS Code activity breakdown')}</h2>
            <p class="chart-subtitle">Visible totals</p>
        </div>
        <div class="legend-pills">
            ${activeSeries.map(renderLegendPill).join('')}
        </div>
        <div class="chart-frame">
            <div class="chart-now-badge">${escapeHtml(chart.currentTimeLabel || '')}</div>
            <div class="chart-y-axis-title">Hours</div>
            <div class="chart-canvas-wrap">
                <canvas id="chart24h-canvas" aria-label="VS Code activity breakdown 24 hour chart" role="img"></canvas>
            </div>
            <div class="chart-corner-badge">H</div>
        </div>
    `;

    render24HourChartCanvas(root, chart, labels, activeSeries);
}

function renderQuickStats(totals, root) {
    if (!root) return;
    const rangeLabel = totals.rangeStart && totals.rangeEnd
        ? formatRangeLabel(totals.rangeStart, totals.rangeEnd)
        : 'No local activity recorded yet.';

    root.innerHTML = `
        <div class="panel-head quick-stats-head">
            <h2>Quick stats</h2>
            <p class="panel-copy">Summary computed from the local fallback history store.</p>
        </div>
        <div class="quick-stats-grid">
            ${renderQuickStat('Activity today', formatDuration(totals.totalMs || 0))}
            ${renderQuickStat('Tracked records', String(totals.eventCount || 0))}
            ${renderQuickStat('Recorded range', rangeLabel)}
        </div>
    `;
}

function renderLegendPill(item) {
    return `
        <div class="legend-pill">
            <span class="legend-dot" style="background:${escapeHtml(item.color || '#ffffff')}"></span>
            <span class="legend-label">${escapeHtml(item.label || 'Unknown')}</span>
            <span class="legend-total">${escapeHtml(formatDuration(item.totalMs || 0))}</span>
        </div>
    `;
}

function destroy24HourChart() {
    if (!reportChart24h) return;
    try {
        reportChart24h.destroy();
    } catch (_) {
        // noop
    }
    reportChart24h = null;
}

function render24HourChartCanvas(root, chart, labels, series) {
    destroy24HourChart();
    const canvas = root.querySelector('#chart24h-canvas');
    if (!canvas || !window.Chart) return;

    const datasets = buildAreaDatasets(canvas, series);
    const maxMinutes = Math.max(15, (Number(chart.maxHours) || 1) * 60);
    const options = createAreaChartOptions(labels, maxMinutes, chart.currentTimeLabel || '');
    const plugins = [
        createVerticalLinePlugin(),
        createNowLinePlugin(chart.currentTimeLabel || ''),
        createTopStackOutlinePlugin()
    ];

    reportChart24h = new window.Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options,
        plugins
    });
}

function buildAreaDatasets(canvas, series) {
    return series.map((item, index) => {
        const stroke = item.color || cssHsl(`--chart-${index + 1}`);
        const backgroundColor = buildSeriesGradient(canvas, stroke);
        return {
            label: item.label || 'Unknown',
            data: (item.values || []).map(value => (Number(value) || 0) / 60000),
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

function createAreaChartOptions(labels, maxMinutes, currentTimeLabel) {
    const is24hLabels = labels.length > 0 && labels.length <= 24;
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
                        return item && typeof item.label === 'string' ? item.label : currentTimeLabel;
                    },
                    label: (ctx) => `${ctx.dataset.label} ${formatDuration(Number(ctx.parsed?.y || 0) * 60000)}`,
                    footer: (items) => {
                        const totalMinutes = items.reduce((sum, item) => sum + (Number(item.parsed?.y) || 0), 0);
                        return `Total ${formatDuration(totalMinutes * 60000)}`;
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
                    autoSkip: false,
                    maxRotation: 55,
                    minRotation: 55,
                    color: cssHsl('--muted-foreground'),
                    callback: (_, index) => labels[index] || ''
                }
            },
            y: {
                position: 'right',
                stacked: true,
                beginAtZero: true,
                max: maxMinutes,
                grid: {
                    color: readCssVar('--grid-line', 'rgba(255,255,255,0.06)'),
                    drawOnChartArea: true
                },
                title: {
                    display: true,
                    text: 'Hours',
                    color: cssHsl('--muted-foreground')
                },
                ticks: {
                    stepSize: computeMinuteStep(maxMinutes),
                    color: cssHsl('--muted-foreground'),
                    callback: (value) => formatHourScale(Number(value) / 60)
                }
            }
        }
    };
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

function createNowLinePlugin(currentTimeLabel) {
    return {
        id: 'nowLine',
        afterDraw(chart) {
            const { right, top, bottom, left } = chart.chartArea || {};
            if (typeof right !== 'number') return;
            const ctx = chart.ctx;
            const label = currentTimeLabel || '';
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(right, top);
            ctx.lineTo(right, bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255,255,255,0.30)';
            ctx.stroke();

            if (label) {
                ctx.font = `10px ${uiFontStack()}`;
                const width = ctx.measureText(label).width;
                const x = Math.min(Math.max(right - (width / 2), left + 2), right - width - 2);
                const y = Math.max(top - 10, 10);
                ctx.textBaseline = 'middle';
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0,0,0,0.55)';
                ctx.fillStyle = 'rgba(255,255,255,0.86)';
                ctx.strokeText(label, x, y);
                ctx.fillText(label, x, y);
            }
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

function computeMinuteStep(maxMinutes) {
    if (maxMinutes <= 15) return 5;
    if (maxMinutes <= 60) return 15;
    if (maxMinutes <= 180) return 30;
    return 60;
}

function formatHourScale(value) {
    return `${Number(value).toFixed(1)}h`;
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

    root.innerHTML = `
        <div class="panel-head">
            <h2>${escapeHtml(title)}</h2>
            <p class="panel-copy">${escapeHtml(description)}</p>
        </div>
        <div class="group-list">
            ${items.map(renderGroupRow).join('')}
        </div>
    `;
}

function renderGroupRow(item) {
    return `
        <div class="group-row">
            <span class="group-key">${escapeHtml(item.key || 'Unknown')}</span>
            <span class="group-value">${escapeHtml(formatDuration(item.totalMs || 0))}</span>
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

function formatDate(timestamp) {
    try {
        return new Date(timestamp).toLocaleString();
    } catch (_) {
        return 'Unknown';
    }
}

function formatRangeLabel(startTimestamp, endTimestamp) {
    try {
        const start = new Date(startTimestamp);
        const end = new Date(endTimestamp);
        return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} to ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } catch (_) {
        return 'Unknown';
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

void loadSummary();
