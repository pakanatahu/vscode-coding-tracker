/**
 * This codes is modified from "gitPaths.ts" in repository "DonJayamanne/gitHistoryVSCode"
 *
 * TODO: Use the method likes `getExtension('vscode.git')` to re-implement this module.
 *
 * @license MIT
 * @author DonJayamanne<don.jayamanne@yahoo.com>
 * @see https://github.com/DonJayamanne/gitHistoryVSCode/blob/master/src/adapter/exec/gitCommandExec.ts
 * @see https://github.com/DonJayamanne/gitHistoryVSCode/blob/master/src/adapter/repository/git.ts
 */

//@ts-check

const vscode = require('vscode');
const log = require('../Log');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// logger wrapper for original codes
const logger = { logInfo: log.debug, logError: log.error };
/** @type {string | undefined} */
let gitPath;

module.exports = {
	getGitBranch,
	getGitPath,
	getGitRepositoryPath
};

/** @returns {Promise<string>} */
function getGitPath() {
    if (gitPath !== undefined) {
        return Promise.resolve(gitPath);
    }
    return new Promise(resolve => {
        const gitPathConfig = vscode.workspace.getConfiguration('git').get('path');
        if (typeof gitPathConfig === 'string' && gitPathConfig.length > 0) {
            if (fs.existsSync(gitPathConfig)) {
                logger.logInfo(`git path: ${gitPathConfig} - from vscode settings`);
                gitPath = gitPathConfig;
                resolve(gitPathConfig);
                return;
            }
            logger.logError(`git path: ${gitPathConfig} - from vscode settings in invalid`);
        }

        if (process.platform !== 'win32') {
            logger.logInfo(`git path: using PATH environment variable`);
            gitPath = 'git';
            resolve('git');
            return;
        }

        // in Git for Windows, the recommendation is not to put git into the PATH.
        // Instead, there is an entry in the Registry.
        /**
         * @param {{ key: string; view: string | null }} location
         * @returns {Promise<string>}
         */
        const regQueryInstallPath = (location) => {
            return new Promise((resolveRegistry, rejectRegistry) => {
                /**
                 * @param {(import('child_process').ExecException & { stdout?: string; stderr?: string }) | null} error
                 * @param {string} stdout
                 * @param {string} stderr
                 */
                const handleResult = (error, stdout, stderr) => {
                    if (error) {
                        error.stdout = stdout;
                        error.stderr = stderr;
                        rejectRegistry(error);
                        return;
                    }

                    const match = stdout.match(/InstallPath\s+REG_SZ\s+([^\r\n]+)\s*\r?\n/i);
                    if (match && match[1]) {
                        resolveRegistry(`${match[1]}\\bin\\git`);
                        return;
                    }
                    rejectRegistry(new Error('git install path not found in registry output'));
                };

                let viewArg = '';
                switch (location.view) {
                    case '64':
                        viewArg = '/reg:64';
                        break;
                    case '32':
                        viewArg = '/reg:32';
                        break;
                    default:
                        break;
                }

                exec(`reg query ${location.key} ${viewArg}`.trim(), { encoding: 'utf8' }, handleResult);
            });
        };

        /**
         * @param {{ key: string; view: string | null }[]} locations
         * @returns {Promise<string>}
         */
        const queryChained = (locations) => {
            return new Promise((resolveChain, rejectChain) => {
                if (locations.length === 0) {
                    rejectChain(new Error('None of the known git Registry keys were found'));
                    return;
                }

                const [current, ...rest] = locations;
                regQueryInstallPath(current).then(resolveChain, () => {
                    queryChained(rest).then(resolveChain, rejectChain);
                });
            });
        };

        queryChained([
            { key: 'HKCU\\SOFTWARE\\GitForWindows', view: null },     // user keys have precedence over
            { key: 'HKLM\\SOFTWARE\\GitForWindows', view: null },     // machine keys
            { key: 'HKCU\\SOFTWARE\\GitForWindows', view: '64' },   // default view (null) before 64bit view
            { key: 'HKLM\\SOFTWARE\\GitForWindows', view: '64' },
            { key: 'HKCU\\SOFTWARE\\GitForWindows', view: '32' },   // last is 32bit view, which will only be checked
            { key: 'HKLM\\SOFTWARE\\GitForWindows', view: '32' }
        ]).then(pathFromRegistry => {
            logger.logInfo(`git path: ${pathFromRegistry} - from registry`);
            gitPath = pathFromRegistry;
            resolve(pathFromRegistry);
        }).catch(() => {
            logger.logInfo(`git path: falling back to PATH environment variable`);
            gitPath = 'git';
            resolve('git');
        });
    });
}

/** @returns {Promise<string | null>} */
function getGitRepositoryPath(fileName = '') {
	return new Promise((resolve, reject) => {
		getGitPath().then(gitPath => {
			const directory = fs.existsSync(fileName) && fs.statSync(fileName).isDirectory() ? fileName : path.dirname(fileName);
			const options = { cwd: directory };
			const args = ['rev-parse', '--show-toplevel'];

			// logger.logInfo('git ' + args.join(' '));
            const ls = spawn(gitPath, args, options);

            let repoPath = '';
            let error = '';
            ls.stdout.on('data', data => {
                repoPath += data.toString();
            });

            ls.stderr.on('data', data => {
                error += data.toString();
            });

            ls.on('error', function (error) {
                logger.logError(error);
                reject(error);
                return;
            });

            ls.on('close', function () {
				if (error.length > 0) {
					logger.logInfo(error); //logError => logInfo such as "repository is not exist"
					// reject(error);
					return resolve(null);
				}
                let repositoryPath = repoPath.trim();
                if (!path.isAbsolute(repositoryPath)) {
                    repositoryPath = path.join(path.dirname(fileName), repositoryPath);
				}
				logger.logInfo('git repo path: ' + repositoryPath);
				resolve(repositoryPath);
			});
        }).catch(reject);
    });
}

/** @returns {Promise<string>} */
function getGitBranch(repoPath = '') {
	return new Promise((resolve, reject) => {
		getGitPath().then(gitPath => {
			const options = { cwd: repoPath };
			const args = ['rev-parse', '--abbrev-ref', 'HEAD'];
			let branch = '';
			let error = '';
            const ls = spawn(gitPath, args, options);
			ls.stdout.on('data', function (data) {
                branch += data.toString().slice(0, -1);
			});

            ls.stderr.on('data', function (data) {
                error += data.toString();
            });

			ls.on('error', function (error) {
				logger.logError(error);
				reject(error);
				return;
			});

            ls.on('close', function () {
                if (error.length > 0) {
                    logger.logError(error);
                }
                resolve(branch);
            });
		}).catch(reject);
    });
}
