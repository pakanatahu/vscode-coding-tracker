//@ts-check
/// <reference path="../index.d.ts" />

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const log = require('../Log');
const git = require('../thirdPartyCodes/gitPaths');

const CACHE_REPO = 5 * 60 * 1000;  //repo cache valid time: 5 minutes
const CACHE_BRANCH = 30 * 1000;    //branch cache valid time 30 seconds

/** @typedef {{ cache: string, expiredTime: number }} CacheEntry */

/** @type {{ [key: string]: CacheEntry }} */
const cacheRepo = {};
/** @type {{ [key: string]: CacheEntry }} */
const cacheBranch = {};

let gitApiPromise;

module.exports = { getVCSInfo };

function queryCache(cacheMap, key) {
	if (!key || !cacheMap[key]) return undefined;
	const now = Date.now();
	const entry = cacheMap[key];
	if (entry.expiredTime < now) {
		delete cacheMap[key];
		return undefined;
	}
	return entry.cache;
}

function addCache(cacheMap, key, cacheValue, ttl) {
	if (!key || typeof cacheValue !== 'string') return;
	cacheMap[key] = { cache: cacheValue, expiredTime: Date.now() + ttl };
}

function addRepoCache(fileName, repoCache) { addCache(cacheRepo, fileName, repoCache, CACHE_REPO); }
function addBranchCache(repoPath, branchCache) { addCache(cacheBranch, repoPath, branchCache, CACHE_BRANCH); }

function getRepoPath(documentFileName) {
	return new Promise((resolve, reject) => {
		const cached = queryCache(cacheRepo, documentFileName);
		if (cached) return resolve(cached);
		git.getGitRepositoryPath(documentFileName)
			.then(repoPath => { addRepoCache(documentFileName, repoPath); resolve(repoPath); })
			.catch(reject);
	});
}

function getBranch(repoPath) {
	return new Promise((resolve, reject) => {
		const cached = queryCache(cacheBranch, repoPath);
		if (cached) return resolve(cached);
		git.getGitBranch(repoPath)
			.then(branch => { addBranchCache(repoPath, branch); resolve(branch); })
			.catch(reject);
	});
}

function getGitExtensionAPI() {
	if (gitApiPromise !== undefined) return gitApiPromise;
	const gitExtension = vscode.extensions.getExtension('vscode.git');
	if (!gitExtension) {
		gitApiPromise = Promise.resolve(undefined);
		return gitApiPromise;
	}
	gitApiPromise = gitExtension.activate()
		.then(() => gitExtension.exports && typeof gitExtension.exports.getAPI === 'function' ? gitExtension.exports.getAPI(1) : undefined)
		.catch(error => {
			log.error('failed to activate vscode.git extension', error);
			return undefined;
		});
	return gitApiPromise;
}

function isPathInside(parent, child) {
	if (!parent || !child) return false;
	const relative = path.relative(parent, child);
	return relative === '' || (!relative.startsWith('..' + path.sep) && !relative.startsWith('..')) && !path.isAbsolute(relative);
}

function encodeRepoFromApi(repository) {
	const head = repository.state && repository.state.HEAD;
	const branch = head && (head.name || head.commit) || 'unknown';
	const upstreamRemote = head && head.upstream && head.upstream.remote;
	const remotes = (repository.state && repository.state.remotes) || [];
	let repoUrl;
	if (upstreamRemote) {
		const remote = remotes.find(r => r.name === upstreamRemote);
		if (remote) repoUrl = remote.fetchUrl || remote.pushUrl;
	}
	if (!repoUrl && remotes.length) {
		const remote = remotes[0];
		repoUrl = remote.fetchUrl || remote.pushUrl;
	}
	if (!repoUrl) {
		repoUrl = repository.rootUri.fsPath;
	}
	log.debug(`got vcs info from vscode.git: git(repo: ${repoUrl})(branch: ${branch})\n    document: ${repository.rootUri.fsPath}`);
	return ['git', repoUrl, branch];
}

function getRepoInfoFromVsCodeGit(documentFileName) {
	return getGitExtensionAPI().then(api => {
		if (!api || !api.repositories || api.repositories.length === 0) return undefined;
		const resolvedPath = path.resolve(documentFileName);
		const repo = api.repositories.find(repository => {
			const repoRoot = repository.rootUri.fsPath;
			return isPathInside(repoRoot, resolvedPath);
		});
		if (!repo) return undefined;
		return encodeRepoFromApi(repo);
	}).catch(error => {
		log.error('failed to get repo info from vscode.git', error);
		return undefined;
	});
}

function getVCSInfo(documentFileName) {
	const NO_VCS_INFO = Promise.resolve(undefined);

	if (!documentFileName || !fs.existsSync(documentFileName))
		return NO_VCS_INFO;

	return getRepoInfoFromVsCodeGit(documentFileName).then(vcs => {
		if (vcs) return vcs;
		return getRepoPath(documentFileName).then(repoPath => {
			if (!repoPath) return NO_VCS_INFO;
			return getBranch(repoPath)
				.then(branch => encodeVCSInfo(documentFileName, repoPath, branch));
		});
	}).catch(error => {
		log.error('get vcs info error:', documentFileName, error);
		return NO_VCS_INFO;
	});
}

function encodeVCSInfo(fileName, repoPath, branch) {
	if (!repoPath) {
		log.debug(`Can not find any vcs info of document: ${fileName}`);
		return null;
	}
	if (!branch) {
		log.warn(`The vcs "${repoPath}" has not branch information!`);
		return null;
	}
	log.debug(`got vcs info: git(repo: ${repoPath})(branch: ${branch})\n    document: ${fileName}`);
	return ['git', repoPath, branch];
}


