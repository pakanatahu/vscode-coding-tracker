//@ts-check
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Start a minimal static web server for the built-in free GUI.
 * Exposes:
 *  - GET /              -> JSON welcome {version, localServerMode}
 *  - GET /report/       -> serves index.html from staticDir
 *  - GET /ajax/kill     -> shuts down and returns {success:true}
 *  - GET other assets   -> serves from staticDir (with basic content-types)
 *  - SPA fallback       -> serves index.html for unknown paths under /report
 * @param {{ staticDir:string, port:number, debugLog:(msg:string)=>void, getReportSummary?:()=>Promise<any> }} options
 * @returns {{ url: string, close: () => void }}
 */
function start(options) {
  const staticDir = options.staticDir;
  const port = options.port;
  const debugLog = options.debugLog;
  const chartVendorFile = path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
  const getReportSummary = typeof options.getReportSummary === 'function'
    ? options.getReportSummary
    : async () => ({ totals: { totalMs: 0, eventCount: 0, rangeStart: null, rangeEnd: null }, byActivity: [], byRepo: [], byBranch: [], byExtension: [] });

  const server = http.createServer(async (req, res) => {
    try {
      const url = (req.url || '/');
      // Kill endpoint
      if (url.startsWith('/ajax/kill')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        // Delay close slightly to allow response to flush
        setTimeout(() => { try { server.close(); } catch(err) { void err; } }, 50);
        return;
      }
      // Welcome JSON at root
      if (url === '/' || url === '/welcome' || url === '/welcome/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ version: 'builtin-static', localServerMode: true }));
        return;
      }
      // Normalize path
  const p = decodeURIComponent(url.split('?')[0]);
      if (p === '/api/report/summary') {
        const summary = await getReportSummary();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(summary));
        return;
      }
      if (p === '/vendor/chart.js/chart.umd.js') {
        return streamFile(chartVendorFile, res);
      }
      // Serve index.html for /report/
      if (p === '/report' || p === '/report/') {
        const file = path.join(staticDir, 'index.html');
        return streamFile(file, res);
      }
      // Static file under staticDir
      const candidate = path.normalize(path.join(staticDir, p.replace(/^\//, '')));
      if (candidate.startsWith(path.normalize(staticDir)) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return streamFile(candidate, res);
      }
      // SPA fallback for paths under /report
      if (p.startsWith('/report/')) {
        const file = path.join(staticDir, 'index.html');
        return streamFile(file, res);
      }
      // Not found
      res.statusCode = 404; res.end('Not Found');
    } catch (e) {
      try { debugLog('[StaticWebServer] error: ' + e); } catch(err) { void err; }
      res.statusCode = 500; res.end('Internal Server Error');
    }
  });

  server.listen(port, '127.0.0.1');
  try { debugLog(`[StaticWebServer] listening at http://127.0.0.1:${port}, dir=${staticDir}`); } catch(err) { void err; }
  return {
    get url() {
      const address = server.address();
      const boundPort = address && typeof address === 'object' ? address.port : port;
      return `http://127.0.0.1:${boundPort}`;
    },
    close: () => { try { server.close(); } catch(err) { void err; } }
  };

  /** @param {string} file @param {import('http').ServerResponse} res */
  function streamFile(file, res) {
    try {
      const ext = path.extname(file).toLowerCase();
      const type = contentType(ext);
      res.writeHead(200, { 'Content-Type': type });
      const stream = fs.createReadStream(file);
      stream.on('error', () => {
        if (!res.headersSent) res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      });
      stream.pipe(res);
    } catch (e) {
      res.statusCode = 404; res.end('Not Found');
    }
  }
}

/** @param {string} ext */
function contentType(ext) {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.ico': return 'image/x-icon';
    case '.map': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

module.exports = { start };
