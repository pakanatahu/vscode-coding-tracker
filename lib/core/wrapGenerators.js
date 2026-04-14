"use strict";

const { normalizeStart } = require('./runtime');

/**
 * Wrap UploadObject generators so they always receive a valid unix-ms start timestamp.
 * This keeps downstream payloads consistent even if callers pass 0/undefined.
 *
 * @param {object} deps
 * @param {any} deps.uploadObject
 * @param {any} deps.uploader
 * @param {any} deps.log
 * @param {boolean} deps.isDebugMode
 */
function wrapUploadObjectGenerators(deps) {
     const { uploadObject, uploader, log, isDebugMode } = deps;

    // NOTE: This includes the legacy open->chat mirror safeguard (heuristic-only) plus start normalization.
    try {
        const originalGenerateOpen = uploadObject.generateOpen;
        uploadObject.generateOpen = function(doc, start, duration) {
            const safeStart = normalizeStart(start, duration);
            const maybe = originalGenerateOpen.call(uploadObject, doc, safeStart, duration);
            return Promise.resolve(maybe).then(obj => {
                try {
                    if (doc && doc.languageId === 'plaintext' && /untitled/i.test(doc.fileName || '')) {
                        const firstLine = doc.lineCount > 0 ? doc.lineAt(0).text : '';
                        if (/chat|copilot/i.test(firstLine)) {
                            const safeChatStart = normalizeStart(start, duration);
                        Promise.resolve(uploadObject.generateChat('heuristic.chat.openMirror', 'mirror-' + Date.now().toString(36), safeChatStart, duration, 0, 0))
                            .then(o => {
                                if (!o) return;
                                o.r2 = (o.r2 ? o.r2 + ';heuristic-mirror' : 'heuristic-mirror');
                                uploader.upload(o);
                            }).catch(err => {
                                if (isDebugMode) log.debug('[heuristic-chat-mirror] upload failed', err);
                            });
                        }
                    }
                } catch (_) { /* ignore */ }
                return obj;
            });
        };
    } catch (e) { if (isDebugMode) log.debug('Failed to wrap generateOpen', e); }

    try {
        const origGenCode = uploadObject.generateCode;
        uploadObject.generateCode = function(doc, start, duration) {
            return origGenCode.call(uploadObject, doc, normalizeStart(start, duration), duration);
        };
    } catch (e) { if (isDebugMode) log.debug('Failed to wrap generateCode', e); }

    try {
        const origGenTerminal = uploadObject.generateTerminal;
        uploadObject.generateTerminal = function(name, start, duration) {
            return origGenTerminal.call(uploadObject, name, normalizeStart(start, duration), duration);
        };
    } catch (e) { if (isDebugMode) log.debug('Failed to wrap generateTerminal', e); }

    try {
        const origGenChat = uploadObject.generateChat;
        if (typeof origGenChat === 'function') {
            uploadObject.generateChat = function(provider, sessionId, start, duration, promptChars, responseChars) {
                return origGenChat.call(uploadObject, provider, sessionId, normalizeStart(start, duration), duration, promptChars, responseChars);
            };
        }
    } catch (e) { if (isDebugMode) log.debug('Failed to wrap generateChat', e); }
}

module.exports = { wrapUploadObjectGenerators };
