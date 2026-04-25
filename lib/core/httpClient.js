//@ts-check

"use strict";

const http = require('http');
const https = require('https');

/**
 * @param {{ url:string, method?:string, headers?:Record<string, string|number|boolean>, data?:any, params?:Record<string, string|number|boolean|undefined>, timeout?:number, validateStatus?:(status:number)=>boolean }} options
 */
function request(options) {
    return new Promise((resolve, reject) => {
        const target = withParams(options.url, options.params);
        const url = new URL(target);
        const body = normalizeBody(options.data);
        const headers = normalizeHeaders(options.headers);
        if (body && isJsonBody(options.data) && !hasHeader(headers, 'content-type')) {
            headers['Content-Type'] = 'application/json; charset=utf-8';
        }
        if (body && !hasHeader(headers, 'content-length')) headers['Content-Length'] = String(Buffer.byteLength(body));

        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(url, {
            method: options.method || (body ? 'POST' : 'GET'),
            headers
        }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(Buffer.from(chunk)));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                const response = {
                    status: res.statusCode || 0,
                    statusText: res.statusMessage || '',
                    data: parseBody(raw, String(res.headers['content-type'] || '')),
                    headers: res.headers
                };
                const ok = options.validateStatus ? options.validateStatus(response.status) : response.status >= 200 && response.status < 300;
                if (ok) {
                    resolve(response);
                    return;
                }
                const error = Object.assign(new Error(`Request failed with status ${response.status}`), { response });
                reject(error);
            });
        });

        req.on('error', reject);
        if (options.timeout && options.timeout > 0) {
            req.setTimeout(options.timeout, () => req.destroy(new Error(`Request timed out after ${options.timeout}ms`)));
        }
        if (body) req.write(body);
        req.end();
    });
}

/** @param {string} url @param {Record<string, string|number|boolean|undefined>|undefined} params */
function withParams(url, params) {
    if (!params) return url;
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        if (typeof value !== 'undefined') target.searchParams.set(key, String(value));
    }
    return target.toString();
}

/** @param {Record<string, string|number|boolean>|undefined} headers */
function normalizeHeaders(headers) {
    /** @type {Record<string, string>} */
    const normalized = {};
    for (const [key, value] of Object.entries(headers || {})) normalized[key] = String(value);
    return normalized;
}

/** @param {Record<string, string>} headers @param {string} name */
function hasHeader(headers, name) {
    const lower = name.toLowerCase();
    return Object.keys(headers).some(key => key.toLowerCase() === lower);
}

/** @param {any} data */
function normalizeBody(data) {
    if (typeof data === 'undefined' || data === null) return '';
    if (Buffer.isBuffer(data)) return data;
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
}

/** @param {any} data */
function isJsonBody(data) {
    if (typeof data === 'undefined' || data === null) return false;
    if (Buffer.isBuffer(data)) return false;
    if (typeof data === 'string') return false;
    return true;
}

/** @param {string} raw @param {string} contentType */
function parseBody(raw, contentType) {
    if (!raw) return null;
    if (contentType.includes('application/json') || /^[\[{]/.test(raw.trim())) {
        try { return JSON.parse(raw); } catch (_) { /* fall through */ }
    }
    return raw;
}

request.get = function get(url, options = {}) {
    return request({ ...options, url, method: 'GET' });
};

request.post = function post(url, data, options = {}) {
    return request({ ...options, url, data, method: 'POST' });
};

module.exports = request;
