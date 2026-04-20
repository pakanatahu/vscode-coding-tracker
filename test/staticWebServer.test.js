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
        port: 19456,
        debugLog: () => {},
        getReportSummary: async () => ({ totals: { totalMs: 1234 }, byActivity: [] })
    });

    try {
        const body = await httpGetJson('http://127.0.0.1:19456/api/report/summary');
        assert.equal(body.totals.totalMs, 1234);
    } finally {
        server.close();
    }
});

async function httpGetJson(url) {
    const response = await httpGet(url);
    return JSON.parse(response.body);
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
