const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const httpClient = require('../lib/core/httpClient');

test('post object bodies as application/json', async () => {
    const server = http.createServer((req, res) => {
        let raw = '';
        req.setEncoding('utf8');
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({
                contentType: req.headers['content-type'] || '',
                body: raw
            }));
        });
    });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;

        const response = await httpClient.post(`http://127.0.0.1:${port}/api/token/request`, {
            clientId: 'vscode',
            clientType: 'extension'
        });

        assert.match(response.data.contentType, /^application\/json\b/);
        assert.equal(response.data.body, '{"clientId":"vscode","clientType":"extension"}');
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
