//@ts-check
/**
 * Uploader module
 * Enhancements:
 *  - JSON payload instead of form encoding (server expects application/json)
 *  - Adds 'date' (YYYY-MM-DD) field derived from 'time' if missing
 *  - Endpoint fallback: tries multiple suffixes when a 404 Not Found occurs
 */

// VS Code APIs are used for secret/global storage and notifications
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ext = require('./VSCodeHelper');
const httpClient = require('./core/httpClient');
const statusBar = require('./StatusBarManager');
const localServer = require('./LocalServer');
const log = require('./Log');
const { createHistoryStore } = require('./localReport/historyStore');
const { shouldQueueLiveEvents } = require('./localReport/storageMode');
const { isDebugMode } = require('./Constants');
const {
	createDefaultTrackingConfig,
	sanitizeTrackingConfig,
	shouldRefreshTrackingConfig
} = require('./core/hostTiming');
const { mapToDesktopEvent } = require('./core/desktopEventMapper');

const DESKTOP_DEFAULT_PORT = 5292;
/**
 * Resolve desktop API port from env override or default.
 * Supports SLASHCODED_DESKTOP_PORT as described in on-prem spec.
 * @returns {number}
 */
function getDesktopPort() {
	const raw = process.env.SLASHCODED_DESKTOP_PORT;
	if (!raw) return DESKTOP_DEFAULT_PORT;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : DESKTOP_DEFAULT_PORT;
}
// Try both loopback host names so we cope with binding differences
function getHandshakeCandidates() {
	const port = getDesktopPort();
	const suffix = `/api/host/handshake`;
	return [
		`http://127.0.0.1:${port}${suffix}`,
		`http://localhost:${port}${suffix}`
	];
}
const TOKEN_REQUEST_PATH = 'api/token/request';
const TOKEN_REFRESH_PATH = 'api/token/refresh';
const TRUST_REGISTER_PATH = 'api/security/sources/register';
const ENFORCEMENT_PATH = 'api/security/enforcement';
const DESKTOP_DISCOVERY_KEY = 'slashCoded.desktopDiscovery';
const DESKTOP_TOKEN_KEY = 'slashCoded.desktopToken';
const TRUSTED_SOURCE_KEY = 'slashCoded.trustedSource.v1';
const TRACKING_CONFIG_KEY = 'slashCoded.trackingConfig.v1';
const MAX_QUEUE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_EVENT_SIZE_BYTES = 16 * 1024;
const MAX_TERMINAL_EVENT_MS = 60 * 60 * 1000;
const QUEUE_WARN_THRESHOLD = 1000;
const RETRY_BASE_MS = [1000, 2000, 5000, 10000, 30000, 60000];
const RETRY_MAX_MS = 60000;
const TOKEN_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // refresh when <24h left
const HANDSHAKE_MIN_INTERVAL_MS = 3000;
const TRUST_ENROLL_MIN_INTERVAL_MS = 60 * 1000;
const ENFORCEMENT_REFRESH_MS = 60000;
const DESKTOP_ENDPOINT_CANDIDATES = ['api/upload', 'api/queue/upload'];
const EXTENSION_CLIENT_ID = 'DavidLundholm.slashcoded-vscode-extension';
const EXTENSION_DISPLAY_NAME = 'SlashCoded VS Code Extension';

/**
 * @typedef {Object} UploadPayload
 * @property {string} version
 * @property {string} token
 * @property {string} type
 * @property {number|string} time
 * @property {number} long
 * @property {string} lang
 * @property {string} file
 * @property {string|null} proj
 * @property {string} [vcs_type]
 * @property {string} [vcs_repo]
 * @property {string} [vcs_branch]
 * @property {number} [line]
 * @property {number} [char]
 * @property {string|null} [r1]
 * @property {string|null} [r2]
 * @property {string|null} [command]
 * @property {string|null} [cwd]
 * @property {string} [date]
 */
/**
 * @typedef {Object} QueueItem
 * @property {UploadPayload} payload
 * @property {number} createdAt
 * @property {number} retryCount
 * @property {{ segmentDurationSeconds:number, idleThresholdSeconds:number, configVersion:string, updatedAt?:string|null, source?:string }} [trackingConfig]
 */
/** @type {QueueItem[]} */
const Q = [];
/** @type {string} */
let uploadURL = '';
/** @type {string} */
let uploadToken = '';
const uploadHeader = { 'Content-Type': 'application/json; charset=utf-8' };
let uploading = 0;
// Track upload timing to allow manual recovery if a request appears stuck
let lastUploadStartTs = 0;
let lastProgressTs = 0;
let requestTimeoutMs = 15000; // default 15s
//Avoid Show error information too many times
let hadShowError = 0;
// list of fallback endpoint suffixes to try if we get a 404 (Not Found) (prefer new api first)
// Prefer local queue endpoint for desktop Local API, then legacy upload and older endpoints
const endpointCandidates = DESKTOP_ENDPOINT_CANDIDATES.slice();
let currentEndpointIndex = 0;
let baseServerURL = '';
let fallbackBaseServerURL = '';
// Keep the discovery probe short; spec suggests ~500ms
let handshakeTimeoutMs = 500;
/** @type {string} */
let queueFilePath = '';
/** @type {import('vscode').SecretStorage|null} */
let secretStorage = null;
/** @type {import('vscode').Memento|null} */
let globalState = null;
/** @type {{version?:string, apiBaseUrl?:string, publicBaseUrl?:string, discoveryId?:string, port?:number, requiresToken?:boolean}|null} */
let discovery = null;
/** @type {{ segmentDurationSeconds:number, idleThresholdSeconds:number, configVersion:string, updatedAt?:string|null, source?:string }} */
let trackingConfig = createDefaultTrackingConfig();
let lastTrackingConfigFetchAt = 0;
/** @type {{token:string, expiresAt?:number}|null} */
let tokenInfo = null;
/** @type {{ sourceId: string, secret: string, baseOrigin?: string }|null} */
let trustedSource = null;
let lastHandshakeAt = 0;
let lastTrustedEnrollAt = 0;
let syncOnline = true;
/** @type {ReturnType<typeof setTimeout> | null} */
let retryTimer = null;
let queueWarned = false;
let machineId = '';
let desktopWarned = false;
/** @type {'auto'|'standalone'} */
let storageMode = 'auto';
/** @type {'audit'|'enforce'|null} */
let enforcementMode = null;
let lastEnforcementCheckAt = 0;
/** @type {string} */
let deadLetterFilePath = '';
/** @type {{ appendMany:(events: UploadPayload[]) => Promise<void>, takeReportEvents?:()=>Promise<UploadPayload[]>, readReportEvents?:()=>Promise<UploadPayload[]> }|null} */
let historyStore = null;

/**
 * @param {UploadPayload[]} queuedPayloads
 * @param {{ segmentDurationSeconds:number, idleThresholdSeconds:number, configVersion:string, updatedAt?:string|null, source?:string }} trackingSnapshot
 */
function pushQueuePayloads(queuedPayloads, trackingSnapshot) {
	for (const queuedPayload of queuedPayloads) {
		log.debug(`new upload object: ${queuedPayload.type};${queuedPayload.time};${queuedPayload.long};${queuedPayload.file}`);
		Q.push({ payload: queuedPayload, createdAt: Date.now(), retryCount: 0, trackingConfig: trackingSnapshot });
	}
	persistQueue();
	if (!queueWarned && Q.length > QUEUE_WARN_THRESHOLD) {
		queueWarned = true;
		try { vscode.window.showWarningMessage(`SlashCoded: Offline queue has ${Q.length} pending events. Desktop app may be offline.`); } catch(_) { /* ignore */ }
	}
	statusBar.setStatus2GotNew1();
	updateSyncState();
	process.nextTick(_upload);
}

/**
 * Split payloads into contiguous shared-timing chunks.
 * @param {UploadPayload} payload
 * @param {{ segmentDurationSeconds:number }} config
 * @returns {UploadPayload[]}
 */
function expandPayloadsForQueue(payload, config) {
	if (!payload)
		return [payload];

	const total = Number(payload.long);
	const segmentMs = Math.max(1000, Number(config && config.segmentDurationSeconds) * 1000 || 15000);
	if (!Number.isFinite(total) || total <= segmentMs)
		return [payload];

	const start = Number(payload.time);
	const safeStart = Number.isFinite(start) && start > 0 ? start : (Date.now() - total);
	/** @type {UploadPayload[]} */
	const chunks = [];
	let offset = 0;
	while (offset < total) {
		const chunkDuration = Math.min(segmentMs, MAX_TERMINAL_EVENT_MS, total - offset);
		chunks.push(Object.assign({}, payload, {
			time: safeStart + offset,
			long: chunkDuration
		}));
		offset += chunkDuration;
	}
	return chunks;
}

/** @param {string=} label */
function updateSyncState(label) {
	try { statusBar.setSyncState(syncOnline, label); } catch(_) { /* ignore */ }
}

function persistQueue() {
	if (!queueFilePath) return;
	try {
		fs.writeFileSync(queueFilePath, JSON.stringify(Q, null, 2), 'utf8');
	} catch(e) { log.debug('Failed to persist queue', e); }
}

function loadQueueFromDisk() {
	if (!queueFilePath || !fs.existsSync(queueFilePath)) return;
	try {
		const parsed = JSON.parse(fs.readFileSync(queueFilePath, 'utf8'));
		if (Array.isArray(parsed)) {
			const now = Date.now();
			Q.splice(0, Q.length, ...parsed.filter(it => it && typeof it === 'object').map(/** @returns {QueueItem} */(it) => ({
				payload: it.payload || it,
				createdAt: typeof it.createdAt === 'number' ? it.createdAt : now,
				retryCount: typeof it.retryCount === 'number' ? it.retryCount : 0,
				trackingConfig: it.trackingConfig ? sanitizeTrackingConfig(it.trackingConfig) : Object.assign({}, trackingConfig)
			})).filter(it => !it.createdAt || (now - it.createdAt) < MAX_QUEUE_AGE_MS));
			if (!queueWarned && Q.length > QUEUE_WARN_THRESHOLD) {
				queueWarned = true;
				try { vscode.window.showWarningMessage(`SlashCoded: Offline queue has ${Q.length} pending events. Desktop app may be offline.`); } catch(_) { /* ignore */ }
			}
		}
	} catch(e) { log.debug('Failed to load offline queue', e); }
}

/** @param {number} retryCount */
function computeRetryDelay(retryCount) {
	if (retryCount < RETRY_BASE_MS.length) return RETRY_BASE_MS[retryCount];
	return RETRY_MAX_MS;
}

/** @param {number} delayMs */
function scheduleRetry(delayMs) {
	if (retryTimer) clearTimeout(retryTimer);
	retryTimer = setTimeout(_upload, delayMs);
}

function purgeExpiredQueue() {
	const now = Date.now();
	const filtered = Q.filter(it => !it.createdAt || (now - it.createdAt) < MAX_QUEUE_AGE_MS);
	if (filtered.length !== Q.length) {
		Q.splice(0, Q.length, ...filtered);
		persistQueue();
	}
}

function buildStatusSnapshot() {
	const oldest = Q.length ? Q.reduce((min, it) => Math.min(min, it.createdAt || Date.now()), Date.now()) : null;
	return {
		online: syncOnline,
		queueLength: Q.length,
		oldestQueuedAt: oldest,
		lastHandshakeAt,
		trackingConfig,
		discovery,
		enforcementMode,
		tokenExpiresAt: tokenInfo && tokenInfo.expiresAt || undefined
	};
}

const uploader = {
	/**
	 * @param {import('vscode').ExtensionContext=} ctx
	 */
	init: function (ctx) {
		statusBar.bindUploadQueueArray(Q);
		secretStorage = ctx ? ctx.secrets : null;
		globalState = ctx ? ctx.globalState : null;
		try { machineId = (vscode.env && vscode.env.machineId) || ''; } catch(_) { machineId = ''; }
		if (ctx) {
			try {
				const storagePath = ctx.globalStorageUri.fsPath;
				fs.mkdirSync(storagePath, { recursive: true });
				queueFilePath = path.join(storagePath, 'queue.json');
				deadLetterFilePath = path.join(storagePath, 'dead-letter.jsonl');
				historyStore = createHistoryStore({ storagePath });
				loadQueueFromDisk();
			} catch(e) { log.debug('Failed to prepare queue storage', e); }
			try {
				const stored = ctx.globalState.get(DESKTOP_DISCOVERY_KEY);
				if (stored && typeof stored === 'object') discovery = /** @type {any} */ (stored);
			} catch(_) { /* ignore */ }
			try {
				const storedTrackingConfig = ctx.globalState.get(TRACKING_CONFIG_KEY);
				if (storedTrackingConfig && typeof storedTrackingConfig === 'object') {
					trackingConfig = sanitizeTrackingConfig(storedTrackingConfig);
				}
			} catch(_) { /* ignore */ }
			try { void primeTokenFromSecret(); } catch(_) { /* ignore */ }
			try { void primeTrustedSourceFromSecret(); } catch(_) { /* ignore */ }
			try { statusBar.setStatus2Nothing(); } catch(_) { /* ignore */ }
		}
		updateSyncState();
	},
	/**
	 * @param {string} url
	 * @param {string} token
	 * @param {string|boolean|undefined} proxy
	 */
	set: function (url, token, proxy) {
		void proxy;
		// Accept either a full URL (ending in a path) or a base we will append candidates to
		try {
			const parsed = new URL(url);
			// Strip any of the known suffixes if present so we have a clean base
			const clean = DESKTOP_ENDPOINT_CANDIDATES.reduce((acc, c) => acc.endsWith(c) ? acc.slice(0, -c.length) : acc, parsed.toString());
			baseServerURL = clean.replace(/\/?$/,'/');
		} catch(_) {
			baseServerURL = url.endsWith('/') ? url : (url + '/');
		}
		baseServerURL = normalizeApiBase(baseServerURL);
		fallbackBaseServerURL = baseServerURL;
		currentEndpointIndex = 0;
		uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
		uploadToken = token;
		log.debug(`uploader configurations changed. Using endpoint: ${uploadURL}`);
	},
	/** @param {number} ms */
	configureTimeout: function(ms) { if (typeof ms === 'number' && ms > 0) { requestTimeoutMs = ms; log.debug(`uploader timeout set to ${ms}ms`); } },
	/** @param {number} ms */
	configureDiscoveryTimeout: function(ms) { if (typeof ms === 'number' && ms > 0) { handshakeTimeoutMs = ms; } },
	setStorageMode: function(mode) {
		storageMode = mode === 'standalone' ? 'standalone' : 'auto';
		try { log.debug(`uploader storageMode set to ${storageMode}`); } catch (_) { /* ignore */ }
	},
	upload: function (/** @type {UploadPayload} */ data) {
		/** @type {UploadPayload} */
		const payload = data;
		if (!payload)
			return log.debug(`new upload object(ignored): ${payload}`);
		// Ensure payload.time is a valid unix timestamp (ms). If missing or zero, derive a best-effort start time
		try {
			if (payload.time === undefined || payload.time === null || Number.isNaN(Number(payload.time)) || Number(payload.time) <= 0) {
				// Prefer to compute start = now - duration if we have a duration; otherwise use now
				const fallback = Date.now() - (typeof payload.long === 'number' && payload.long > 0 ? payload.long : 0);
				log.debug(`uploader: payload.time invalid (${payload.time}). Patching to ${fallback} derived from long=${payload.long}`);
				payload.time = fallback;
			}
		} catch (e) {
			// defensive: don't let normalization throw
			log.debug('uploader: error normalizing payload.time', e);
		}
		const trackingSnapshot = Object.assign({}, trackingConfig);
		const queuePayloads = expandPayloadsForQueue(payload, trackingSnapshot);
		if (queuePayloads.length > 1) {
			log.debug(`uploader: split payload into ${queuePayloads.length} shared-timing chunks (${payload.long}ms total)`);
		}
		if (!shouldQueueLiveEvents({ storageMode, discovery })) {
			const persistedPayloads = queuePayloads.map(queuedPayload => normalizePayload(queuedPayload));
			if (historyStore) {
				historyStore.appendMany(persistedPayloads).catch(error => {
					try { log.debug('Failed to persist local history', error); } catch (_) { /* ignore */ }
				});
			}
			statusBar.setStatus2Uploaded('Stored locally');
			updateSyncState('Desktop app not detected; storing locally');
			return;
		}
		pushQueuePayloads(queuePayloads, trackingSnapshot);
	},
	/**
	 * Attempt to flush the queue immediately. If an upload appears stuck beyond
	 * the configured timeout, this will reset the uploading flag and retry.
	 */
	flush: function() {
		const now = Date.now();
		if (!uploading) { process.nextTick(_upload); return; }
		// Consider the request stuck if it runs 1.5x longer than timeout (min 20s)
		const threshold = Math.max(20000, Math.floor(requestTimeoutMs * 1.5));
		const since = Math.max(lastUploadStartTs || 0, lastProgressTs || 0);
		if (since && (now - since) > threshold) {
			try { log.debug(`flush(): detected stuck upload (> ${threshold} ms). Forcing retry...`); } catch(_) { /* ignore */ }
			uploading = 0; // allow a new attempt; the previous request may still finish but we'll proceed
			process.nextTick(_upload);
		}
	},
	/**
	 * Force desktop rediscovery now.
	 */
	rediscover: async () => {
		await discoverDesktop(true);
	},
	refreshTrackingConfig: async (force) => {
		return fetchTrackingConfig(!!force);
	},
	/**
	 * Expose a sync snapshot for UX.
	 */
	getStatusSnapshot: () => buildStatusSnapshot(),
	getTrackingConfig: () => Object.assign({}, trackingConfig),
	queueLocalHistoryForDesktop: async () => {
		if (!historyStore || !historyStore.takeReportEvents) return { importedCount: 0 };
		const events = await historyStore.takeReportEvents();
		if (!events.length) return { importedCount: 0 };
		pushQueuePayloads(events.map(event => normalizePayload(event)), Object.assign({}, trackingConfig));
		return { importedCount: events.length };
	},
	/**
	 * Drain queued events immediately (reset backoff).
	 */
	forceDrain: () => { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } process.nextTick(_upload); }
}

async function _upload() {

	//Upload Lock
	if (uploading)
		return;
	purgeExpiredQueue();
	//Queue is empty
	if (!Q[0]) {
		//Now the queue is empty
		//And check is the server running in the local
		// - If in local, status bar will display "Local", Else not
		localServer.activeCheckIsLocalServerStart();
		statusBar.setStatus2Nothing();
		updateSyncState(syncOnline ? 'Online' : 'Offline');
		return;
	}

	if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

	uploading = 1;
	lastUploadStartTs = Date.now();

	/** @type {QueueItem} */
	const item = Q[0];
	/** @type {UploadPayload} */
	const data = Object.assign({}, item.payload);
	const now = Date.now();
	if (item.createdAt && (now - item.createdAt) > MAX_QUEUE_AGE_MS) {
		Q.shift();
		persistQueue();
		uploading = 0;
		process.nextTick(_upload);
		return;
	}

	const ready = await ensureDesktopReady();
	if (!ready) {
		uploading = 0;
		const delay = computeRetryDelay(item.retryCount);
		item.retryCount += 1;
		persistQueue();
		updateSyncState('Desktop app not detected.');
		scheduleRetry(delay);
		return;
	}

	// Set up the Desktop API token when the local Desktop API requires one.
	// In local-only Desktop mode (requiresToken === false), omit token entirely.
	if (!(discovery && discovery.requiresToken === false)) {
		const tokenToUse = tokenInfo && tokenInfo.token ? tokenInfo.token : uploadToken;
		if (tokenToUse) data.token = tokenToUse;
	} else {
		try { delete /** @type {any} */(data).token; } catch(_) { /* ignore */ }
	}
	// Ensure date field & normalize optional values before sending
	const sendData = normalizePayload(data);

	statusBar.setStatus2Uploading();

	const isAPIStyle = /api\//.test(uploadURL);
	/** @type {{method:string, timeout:number, headers:Record<string,string>, data?:string, validateStatus:(status:number)=>boolean}} */
	const uploadOptions = {
		method: 'POST',
		timeout: requestTimeoutMs,
		headers: isAPIStyle ? { ...uploadHeader } : { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
		// Treat all HTTP statuses as "handled" so we can inspect
		// 4xx/5xx bodies instead of throwing.
		validateStatus: () => true
	};
	const isDesktopUploadEndpoint = /api\/(?:queue\/)?upload/.test(uploadURL);
	if (isDesktopUploadEndpoint) {
		// Trusted Upload v2 contract: send JSON body with wrapper contractVersion and events[].
		const desktopEvent = mapToDesktopEvent(sendData, item.trackingConfig || trackingConfig);
		uploadOptions.data = JSON.stringify({ contractVersion: 'v2', events: [desktopEvent] });
		uploadOptions.headers = { ...(uploadOptions.headers || {}), 'Content-Type': 'application/json; charset=utf-8' };
		if (bodySizeBytes(uploadOptions.data) > MAX_EVENT_SIZE_BYTES) {
			appendDeadLetter(item, 400, 'payload-too-large');
			Q.shift();
			persistQueue();
			uploading = 0;
			updateSyncState('Dropped invalid event (size limit)');
			process.nextTick(_upload);
			return;
		}
	} else if (isAPIStyle) {
		uploadOptions.data = JSON.stringify(sendData);
	} else {
		const params = new URLSearchParams();
		Object.entries(/** @type {any} */(sendData)).forEach(([k,v]) => { if (v !== undefined) params.append(k, String(v)); });
		uploadOptions.data = params.toString();
	}

	const trustedSigned = await attachTrustedUploadHeaders(uploadURL, uploadOptions);

	if (isDebugMode) {
		const dump = JSON.stringify(uploadOptions, null, 2).split('\n').map(it => `  ${it}`);
		log.debug(`Upload options:\n${dump}`);
	}

	let success = true;
	let shouldDropCurrentItem = false;
	/** @type {{error?: string}} */
	let returnObject = {};
	try {
		const res = await httpClient(Object.assign({ url: uploadURL }, uploadOptions));
		const { status, statusText, data } = res;
		if (status === 200 || status === 202 || status === 204 || status === 403 || status === 400 || status === 409) {
			if (data && typeof data === 'object') returnObject = /** @type {any} */(data);
			else returnObject = {};
			if (returnObject && returnObject.error) {
				success = false;
				showErrorMessage(3, `Upload error: ${returnObject.error}`);
			} else if (status >= 400) {
				// No explicit error field; surface status text for visibility
				success = false;
				showErrorMessage(3, `Upload error: Response: ${status} (${statusText || 'Bad Request'})`);
			}
			// 400 indicates schema/limits validation failure: drop this item so queue can continue.
			if (status === 400 && !success) shouldDropCurrentItem = true;
			if (status === 403 && trustedSigned && shouldSignTrustedUpload(uploadURL)) {
				await clearTrustedSource('trusted-rejected', true);
			}
		} else if (status === 401) {
			success = false;
			if (trustedSigned && shouldSignTrustedUpload(uploadURL)) {
				await clearTrustedSource('trusted-unauthorized', true);
			}
		} else if (status === 404) {
			// Try next endpoint candidate
			const prev = uploadURL;
			if (currentEndpointIndex < endpointCandidates.length - 1) {
				currentEndpointIndex++;
				uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
				log.debug(`Endpoint 404 (${statusText}). Switching endpoint: ${prev} -> ${uploadURL}`);
				log.debug(`Retrying with encoding: ${/api\//.test(uploadURL) ? 'json' : 'form'}`);
				setTimeout(_upload, 10);
				return;
			} else {
				success = false;
				showErrorMessage(2, `Upload error: Response: ${status} (${statusText}) - exhausted endpoint fallbacks`);
			}
		} else {
			success = false;
			showErrorMessage(2, `Upload error: Response: ${status} (${statusText})`);
		}
	} catch (err) {
		success = false;
		// Attempt local-server detection + start if applicable
		const anyErr = /** @type {any} */ (err);
		const errMsg = anyErr && anyErr.stack ? anyErr.stack : (anyErr && anyErr.message ? anyErr.message : String(err));
		localServer.detectOldSever_SoStartANewIfUnderLocalMode() ||
			showErrorMessage(1, `Could not upload coding record: ${errMsg}`);
	}

	//update status bar information
	const errorMsg = (returnObject && returnObject.error) ? returnObject.error : undefined;
	statusBar.setStatus2Uploaded(errorMsg);

	uploading = 0;
	lastProgressTs = Date.now();
	if (!success) {
		if (shouldDropCurrentItem) {
			appendDeadLetter(item, 400, (returnObject && returnObject.error) ? String(returnObject.error) : 'validation-failed');
			Q.shift();
			persistQueue();
			updateSyncState('Dropped invalid event (400)');
			process.nextTick(_upload);
			return;
		}
		syncOnline = false;
		updateSyncState('Desktop offline or upload failed');
		const delay = computeRetryDelay(item.retryCount);
		item.retryCount += 1;
		persistQueue();
		if (item.retryCount === 1 && isDebugMode) log.debug('Retrying upload soon...');
		scheduleRetry(delay);
	} else {
		syncOnline = true;
		updateSyncState('Online');
		Q.shift();
		persistQueue();
		hadShowError = 0;
		process.nextTick(_upload);
		log.debug('Uploaded success!');
	}
}

/**
 * Ensure we have a recent handshake + token before sending uploads.
 */
async function ensureDesktopReady() {
	const now = Date.now();
	if (!discovery || (now - lastHandshakeAt) > HANDSHAKE_MIN_INTERVAL_MS) {
		await discoverDesktop(false);
	}
	if (!discovery) {
		syncOnline = false;
		updateSyncState('Desktop app not detected');
		return false;
	}

	baseServerURL = normalizeApiBase(
		(discovery.apiBaseUrl || discovery.publicBaseUrl || baseServerURL || fallbackBaseServerURL || '')
	);
	uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
	await fetchTrackingConfig(false);
	await refreshEnforcementModeIfNeeded();

	// In local-only mode, the desktop accepts uploads without a token.
	// When requiresToken is explicitly false, skip token bootstrap to avoid unnecessary requests.
	if (discovery.requiresToken === false) {
		await ensureTrustedSourceReady();
		return true;
	}

	await ensureTrustedSourceReady();
	const tokenOk = await ensureTokenFresh();
	return !!tokenOk;
}

/** @param {boolean} force */
async function discoverDesktop(force) {
	const now = Date.now();
	if (!force && lastHandshakeAt && (now - lastHandshakeAt) < HANDSHAKE_MIN_INTERVAL_MS) return discovery;
	lastHandshakeAt = now;
	try {
		for (const candidate of getHandshakeCandidates()) {
			try {
				const res = await httpClient.get(candidate, { timeout: handshakeTimeoutMs });
				if (res && res.status >= 200 && res.status < 300 && res.data) {
					const body = /** @type {any} */ (res.data);
					discovery = body;
					baseServerURL = normalizeApiBase(body.apiBaseUrl || body.publicBaseUrl || baseServerURL || fallbackBaseServerURL || '');
					if (!baseServerURL) {
						const parsed = new URL(candidate);
						const port = parsed.port || String(getDesktopPort());
						baseServerURL = `${parsed.protocol}//${parsed.hostname}:${port}/`;
					}
					currentEndpointIndex = 0;
					uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
					if (globalState) await globalState.update(DESKTOP_DISCOVERY_KEY, discovery);
					await fetchTrackingConfig(true);
					syncOnline = true;
					desktopWarned = false;
					updateSyncState('Desktop detected');
					return discovery;
				}
			} catch (err) {
				if (isDebugMode) {
					const e = /** @type {any} */ (err);
					try { log.debug('Desktop handshake failed', e && e.message ? e.message : e, '@', candidate); } catch(_) { /* ignore */ }
				}
			}
		}
	} catch(err) {
		if (isDebugMode) {
			const e = /** @type {any} */ (err);
			try { log.debug('Desktop handshake failed', e && e.message ? e.message : e); } catch(_) { /* ignore */ }
		}
	}
	if (!discovery) {
		syncOnline = false;
		updateSyncState('Desktop app not detected');
		if (!desktopWarned) {
			desktopWarned = true;
			try { vscode.window.setStatusBarMessage('Desktop app not detected.', 4000); } catch(_) { /* ignore */ }
		}
	}
	return null;
}

/** @param {boolean} force */
async function fetchTrackingConfig(force) {
	const now = Date.now();
	if (!force && !shouldRefreshTrackingConfig(lastTrackingConfigFetchAt, now)) return trackingConfig;
	const base = baseServerURL || fallbackBaseServerURL;
	if (!base) return trackingConfig;
	lastTrackingConfigFetchAt = now;
	const url = ensureTrailingSlash(base) + 'api/host/tracking-config';
	try {
		const res = await httpClient.get(url, { timeout: requestTimeoutMs });
		if (res && res.status >= 200 && res.status < 300 && res.data) {
			trackingConfig = sanitizeTrackingConfig(res.data);
			if (globalState) await globalState.update(TRACKING_CONFIG_KEY, trackingConfig);
		}
	} catch (err) {
		if (isDebugMode) {
			const e = /** @type {any} */ (err);
			try { log.debug('Tracking config fetch failed', e && e.message ? e.message : e); } catch(_) { /* ignore */ }
		}
	}
	return trackingConfig;
}

/** @param {string} url */
function ensureTrailingSlash(url) {
	if (!url) return '';
	return url.endsWith('/') ? url : (url + '/');
}

/**
 * Keep LocalApi base at host root so request URLs become /api/... exactly once.
 * @param {string} url
 */
function normalizeApiBase(url) {
	const base = ensureTrailingSlash(url || '');
	if (!base) return '';
	try {
		const parsed = new URL(base);
		const normalizedPath = (parsed.pathname || '/').replace(/\/+$/, '');
		if (normalizedPath.toLowerCase() === '/api') {
			parsed.pathname = '/';
			parsed.search = '';
			parsed.hash = '';
			return ensureTrailingSlash(parsed.toString());
		}
		return base;
	} catch(_) {
		return base.replace(/\/api\/?$/i, '/');
	}
}

/**
 * @param {unknown} body
 */
function bodySizeBytes(body) {
	return toBodyBuffer(body).length;
}

/**
 * Persist dropped events for forensic/debug follow-up.
 * @param {QueueItem} item
 * @param {number|string} status
 * @param {string} reason
 */
function appendDeadLetter(item, status, reason) {
	if (!deadLetterFilePath || !item || !item.payload) return;
	try {
		const record = {
			recordedAt: new Date().toISOString(),
			status,
			reason,
			retryCount: item.retryCount || 0,
			createdAt: item.createdAt || Date.now(),
			payload: item.payload
		};
		fs.appendFileSync(deadLetterFilePath, JSON.stringify(record) + '\n', 'utf8');
	} catch(_) { /* ignore */ }
}

async function primeTokenFromSecret() {
	if (!secretStorage || (tokenInfo && tokenInfo.token)) return;
	try {
		const stored = await secretStorage.get(DESKTOP_TOKEN_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (parsed && parsed.token) {
				tokenInfo = { token: parsed.token, expiresAt: parsed.expiresAt };
			}
		}
	} catch(_) { /* ignore */ }
}

async function primeTrustedSourceFromSecret() {
	if (!secretStorage || (trustedSource && trustedSource.sourceId && trustedSource.secret)) return;
	try {
		const stored = await secretStorage.get(TRUSTED_SOURCE_KEY);
		if (!stored) return;
		const parsed = JSON.parse(stored);
		if (parsed && typeof parsed.sourceId === 'string' && typeof parsed.secret === 'string') {
			trustedSource = {
				sourceId: parsed.sourceId,
				secret: parsed.secret,
				baseOrigin: typeof parsed.baseOrigin === 'string' ? parsed.baseOrigin : undefined
			};
		}
	} catch(_) { /* ignore */ }
}

async function persistToken() {
	if (!secretStorage || !tokenInfo || !tokenInfo.token) return;
	try { await secretStorage.store(DESKTOP_TOKEN_KEY, JSON.stringify(tokenInfo)); } catch(_) { /* ignore */ }
}

async function persistTrustedSource() {
	if (!secretStorage || !trustedSource || !trustedSource.sourceId || !trustedSource.secret) return;
	try { await secretStorage.store(TRUSTED_SOURCE_KEY, JSON.stringify(trustedSource)); } catch(_) { /* ignore */ }
}

/** @param {string} reason */
async function clearToken(reason) {
	void reason;
	tokenInfo = null;
	if (secretStorage) {
		try { await secretStorage.delete(DESKTOP_TOKEN_KEY); } catch(_) { /* ignore */ }
	}
}

/**
 * @param {string} reason
 * @param {boolean=} purgeStored
 */
async function clearTrustedSource(reason, purgeStored) {
	void reason;
	trustedSource = null;
	lastTrustedEnrollAt = 0;
	if (purgeStored && secretStorage) {
		try { await secretStorage.delete(TRUSTED_SOURCE_KEY); } catch(_) { /* ignore */ }
	}
}

/** @param {unknown} at */
function parseExpires(at) {
	try {
		if (!at) return undefined;
		if (typeof at === 'number') return at;
		const t = Date.parse(String(at));
		return isNaN(t) ? undefined : t;
	} catch(_) { return undefined; }
}

async function ensureTokenFresh() {
	await primeTokenFromSecret();
	if (tokenInfo && tokenInfo.expiresAt) {
		const remaining = tokenInfo.expiresAt - Date.now();
		if (remaining > TOKEN_REFRESH_WINDOW_MS) return true;
	}
	if (tokenInfo && tokenInfo.token) {
		const refreshed = await refreshToken(tokenInfo.token);
		if (refreshed === 'invalid') return false;
		if (refreshed) return true;
	}
	const requested = await requestNewToken();
	return requested;
}

/** @param {string} token */
async function refreshToken(token) {
	const base = baseServerURL || fallbackBaseServerURL;
	if (!base) return false;
	const url = ensureTrailingSlash(base) + TOKEN_REFRESH_PATH;
	try {
		const res = await httpClient.get(url, { params: { token }, timeout: requestTimeoutMs });
		if (res && res.status === 404) {
			await clearToken('refresh-404');
			try { vscode.window.showWarningMessage('SlashCoded: Desktop token expired. Requesting a new token...'); } catch(_) { /* ignore */ }
			return 'invalid';
		}
		if (res && res.status >= 200 && res.status < 300 && res.data && res.data.token) {
			tokenInfo = { token: res.data.token, expiresAt: parseExpires(res.data.expiresAt) };
			await persistToken();
			return true;
		}
	} catch(err) {
		if (isDebugMode) {
			const e = /** @type {any} */ (err);
			try { log.debug('Token refresh failed', e && e.message ? e.message : e); } catch(_) { /* ignore */ }
		}
	}
	return false;
}

async function requestNewToken() {
	const base = baseServerURL || fallbackBaseServerURL;
	if (!base) return !!uploadToken;
	const url = ensureTrailingSlash(base) + TOKEN_REQUEST_PATH;
	try {
		const payload = { clientId: EXTENSION_CLIENT_ID, clientType: 'extension', machineId: machineId || require('os').hostname() };
		const res = await httpClient.post(url, payload, { timeout: requestTimeoutMs });
		if (res && res.status >= 200 && res.status < 300 && res.data && res.data.token) {
			tokenInfo = { token: res.data.token, expiresAt: parseExpires(res.data.expiresAt) };
			await persistToken();
			return true;
		}
	} catch(err) {
		if (isDebugMode) {
			const e = /** @type {any} */ (err);
			try { log.debug('Token request failed', e && e.message ? e.message : e); } catch(_) { /* ignore */ }
		}
	}
	return !!uploadToken;
}

function getBaseOrigin() {
	try {
		const base = baseServerURL || fallbackBaseServerURL;
		if (!base) return '';
		return new URL(base).origin;
	} catch(_) { return ''; }
}

async function ensureTrustedSourceReady() {
	await primeTrustedSourceFromSecret();
	const base = baseServerURL || fallbackBaseServerURL;
	if (!base) return false;
	const now = Date.now();
	const baseOrigin = getBaseOrigin();
	if (
		trustedSource &&
		trustedSource.sourceId &&
		trustedSource.secret &&
		(!trustedSource.baseOrigin || trustedSource.baseOrigin === baseOrigin)
	) {
		return true;
	}
	if ((now - lastTrustedEnrollAt) < TRUST_ENROLL_MIN_INTERVAL_MS) return false;
	lastTrustedEnrollAt = now;
	const url = ensureTrailingSlash(base) + TRUST_REGISTER_PATH;
	try {
		const payload = {
			clientId: EXTENSION_CLIENT_ID,
			clientType: 'vscode',
			machineId: machineId || require('os').hostname(),
			displayName: EXTENSION_DISPLAY_NAME
		};
		const res = await httpClient.post(url, payload, { timeout: requestTimeoutMs, validateStatus: () => true });
		if (res && res.status >= 200 && res.status < 300 && res.data && res.data.sourceId && res.data.secret) {
			trustedSource = {
				sourceId: String(res.data.sourceId),
				secret: String(res.data.secret),
				baseOrigin
			};
			await persistTrustedSource();
			return true;
		}
		if (isDebugMode) {
			try { log.debug(`[trusted-upload] source registration skipped: HTTP ${res ? res.status : 'unknown'}`); } catch(_) { /* ignore */ }
		}
	} catch (err) {
		if (isDebugMode) {
			const e = /** @type {any} */ (err);
			try { log.debug('[trusted-upload] source registration failed', e && e.message ? e.message : e); } catch(_) { /* ignore */ }
		}
	}
	return false;
}

async function refreshEnforcementModeIfNeeded() {
	const now = Date.now();
	if (enforcementMode && (now - lastEnforcementCheckAt) < ENFORCEMENT_REFRESH_MS) return enforcementMode;
	const base = baseServerURL || fallbackBaseServerURL;
	if (!base) return null;
	const url = ensureTrailingSlash(base) + ENFORCEMENT_PATH;
	try {
		const res = await httpClient.get(url, { timeout: requestTimeoutMs, validateStatus: () => true });
		if (res && res.status >= 200 && res.status < 300 && res.data && typeof res.data.mode === 'string') {
			const mode = String(res.data.mode).toLowerCase();
			enforcementMode = mode === 'enforce' ? 'enforce' : 'audit';
			lastEnforcementCheckAt = now;
			return enforcementMode;
		}
	} catch (_) { /* ignore */ }
	lastEnforcementCheckAt = now;
	return enforcementMode;
}

/**
 * @param {string} targetUrl
 * @returns {boolean}
 */
function shouldSignTrustedUpload(targetUrl) {
	try {
		const u = new URL(targetUrl);
		return /^\/api\/(?:queue\/)?upload\/?$/i.test(u.pathname || '');
	} catch(_) { return false; }
}

/**
 * @param {unknown} body
 * @returns {Buffer}
 */
function toBodyBuffer(body) {
	if (Buffer.isBuffer(body)) return body;
	if (typeof body === 'string') return Buffer.from(body, 'utf8');
	if (body instanceof URLSearchParams) return Buffer.from(body.toString(), 'utf8');
	if (body === undefined || body === null) return Buffer.from('', 'utf8');
	return Buffer.from(JSON.stringify(body), 'utf8');
}

/**
 * @param {string} targetUrl
 * @param {{data?: any, method?: string, headers?: Record<string, string>}} options
 * @returns {Promise<boolean>}
 */
async function attachTrustedUploadHeaders(targetUrl, options) {
	if (!shouldSignTrustedUpload(targetUrl)) return false;
	const ready = await ensureTrustedSourceReady();
	if (!ready || !trustedSource || !trustedSource.sourceId || !trustedSource.secret) {
		if (isDebugMode) {
			try { log.debug('[trusted-upload] signing skipped: source not enrolled'); } catch(_) { /* ignore */ }
		}
		return false;
	}
	const body = toBodyBuffer(options.data);
	const timestamp = String(Date.now());
	const nonce = crypto.randomBytes(16).toString('hex');
	let pathOnly = '/';
	try { pathOnly = new URL(targetUrl).pathname || '/'; } catch(_) { /* ignore */ }
	const method = (options.method || 'POST').toUpperCase();
	const bodyHash = crypto.createHash('sha256').update(body).digest('base64');
	const signatureBase = `${method}\n${pathOnly}\n${timestamp}\n${nonce}\n${bodyHash}`;
	const signature = crypto.createHmac('sha256', trustedSource.secret).update(signatureBase).digest('base64');
	if (!options.headers) options.headers = {};
	options.headers['X-Sc-Source-Id'] = trustedSource.sourceId;
	options.headers['X-Sc-Timestamp'] = timestamp;
	options.headers['X-Sc-Nonce'] = nonce;
	options.headers['X-Sc-Signature'] = signature;
	return true;
}

// Normalize payload: add date, convert blank strings to null where appropriate
/**
 * @param {UploadPayload} data
 * @returns {UploadPayload}
 */
function normalizePayload(data) {
	const send = Object.assign({}, data);
	if (!send.date) {
		try {
			const d = new Date(send.time);
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			send.date = `${y}-${m}-${day}`;
		} catch (_) {
			// ignore date errors
		}
	}
	['proj', 'r1', 'r2', 'command', 'cwd'].forEach(k => {
		const s = /** @type {any} */ (send);
		if (Object.prototype.hasOwnProperty.call(s, k) && s[k] === '') s[k] = null;
	});
	return send;
}

/**
 * @param {number} id
 * @param {Error|string} error
 * @returns
 */
function showErrorMessage(id, error) {
	const msg = typeof error === 'string' ? error : (error && /** @type {any} */(error).message ? /** @type {any} */(error).message : String(error));
	log.error(msg);
	if (hadShowError == id)
		return;
	hadShowError = id;
	ext.showSingleErrorMsg(msg);
}

module.exports = uploader;
