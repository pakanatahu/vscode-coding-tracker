async function loadSummary() {
    try {
        const response = await fetch('/api/report/summary');
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        const summary = await response.json();

        renderTotals(summary.totals || {});
        renderGroup('By activity', 'Time grouped by tracked activity type.', summary.byActivity || [], document.querySelector('#activity-groups'));
        renderGroup('By repository', 'Repository totals from the raw locally stored events.', summary.byRepo || [], document.querySelector('#repo-groups'));
        renderGroup('By branch', 'Branch totals from the raw locally stored events.', summary.byBranch || [], document.querySelector('#branch-groups'));
        renderGroup('By file extension', 'Total time spent in files grouped by extension.', summary.byExtension || [], document.querySelector('#extension-groups'));
    } catch (error) {
        renderError(error);
    }
}

function renderTotals(totals) {
    const root = document.querySelector('#totals');
    const rangeLabel = totals.rangeStart && totals.rangeEnd
        ? `${formatDate(totals.rangeStart)} to ${formatDate(totals.rangeEnd)}`
        : 'No local activity recorded yet.';

    root.innerHTML = `
        <div class="group-header">
            <h2>Overview</h2>
            <p>Summary computed from the local fallback history store.</p>
        </div>
        <div class="totals-grid">
            ${renderMetric('Total time', formatDuration(totals.totalMs || 0))}
            ${renderMetric('Tracked records', String(totals.eventCount || 0))}
            ${renderMetric('Recorded range', rangeLabel)}
        </div>
    `;
}

function renderMetric(label, value) {
    return `
        <article class="metric">
            <span class="metric-label">${escapeHtml(label)}</span>
            <span class="metric-value">${escapeHtml(value)}</span>
        </article>
    `;
}

function renderGroup(title, description, items, root) {
    if (!root) return;
    if (!items.length) {
        root.innerHTML = `
            <div class="group-header">
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(description)}</p>
            </div>
            <p class="empty-state">No local activity recorded yet.</p>
        `;
        return;
    }

    root.innerHTML = `
        <div class="group-header">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(description)}</p>
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
    for (const selector of ['#totals', '#activity-groups', '#repo-groups', '#branch-groups', '#extension-groups']) {
        const root = document.querySelector(selector);
        if (!root) continue;
        root.innerHTML = selector === '#totals'
            ? '<p class="error-state">Could not load the local report summary.</p>'
            : '';
    }
    const totals = document.querySelector('#totals');
    if (totals) {
        totals.innerHTML = `<p class="error-state">Could not load the local report summary. ${escapeHtml(message)}</p>`;
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

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

void loadSummary();
