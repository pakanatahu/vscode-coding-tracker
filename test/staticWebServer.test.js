const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const { start } = require('../lib/StaticWebServer');

test('static server returns local report summary json', async () => {
    const staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-tracker-static-'));
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html><body>report</body></html>', 'utf8');

    const server = start({
        staticDir,
        port: 0,
        debugLog: () => {},
        getReportSummary: async () => ({ totals: { totalMs: 1234 }, byActivity: [] })
    });

    try {
        await waitForServer(server);
        const body = await httpGetJson(`${server.url}/api/report/summary`);
        assert.equal(body.totals.totalMs, 1234);
    } finally {
        server.close();
    }
});

test('report route serves the fallback app shell', async () => {
    const staticDir = path.join(__dirname, '..', 'server-app');
    const server = start({
        staticDir,
        port: 0,
        debugLog: () => {},
        getReportSummary: async () => ({ totals: { totalMs: 1234 }, byActivity: [] })
    });

    try {
        await waitForServer(server);
        const html = await httpGetText(`${server.url}/report/`);
        assert.match(html, /Want more advanced analytics\?/);
        assert.match(html, /by activity/i);
    } finally {
        server.close();
    }
});

test('report route serves the desktop-style fallback dashboard shell', async () => {
    const staticDir = path.join(__dirname, '..', 'server-app');
    const server = start({
        staticDir,
        port: 0,
        debugLog: () => {},
        getReportSummary: async () => ({ totals: {}, chart24h: {}, byActivity: [] })
    });

    try {
        await waitForServer(server);
        const html = await httpGetText(`${server.url}/report/`);
        assert.match(html, /dashboard-shell/);
        assert.match(html, /quick-stats/);
        assert.match(html, /chart24h-card/);
    } finally {
        server.close();
    }
});

test('static server serves the chart.js vendor asset', async () => {
    const staticDir = path.join(__dirname, '..', 'server-app');
    const server = start({
        staticDir,
        port: 0,
        debugLog: () => {},
        getReportSummary: async () => ({ totals: { totalMs: 1234 }, byActivity: [] })
    });

    try {
        await waitForServer(server);
        const script = await httpGetText(`${server.url}/vendor/chart.js/chart.umd.js`);
        assert.match(script, /Chart/);
    } finally {
        server.close();
    }
});

async function httpGetJson(url) {
    const response = await httpGet(url);
    return JSON.parse(response.body);
}

async function httpGetText(url) {
    const response = await httpGet(url);
    return response.body;
}

async function waitForServer(server) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (!String(server.url).endsWith(':0')) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => resolve({ statusCode: response.statusCode, body }));
        });
        request.on('error', reject);
    });
}
