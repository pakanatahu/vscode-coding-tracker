
//@ts-check

/*
	This module is used for probe exetnsion running environment.
	It can detect if modules are existed, i18n files are existed.
	And it can also generate diagnose file in the extension directory.
*/

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
/**
 * @typedef {Object} VscodeEnv
 * @property {string} [appName]
 * @property {string} [appRoot]
 * @property {string} [language]
 */

/**
 * @typedef {Object} DiagnoseDependency
 * @property {string} name
 * @property {string} path
 * @property {boolean} ok
 */

/**  
 * @typedef {Object} DiagnoseContent
 * @property {string|undefined} vscodeAppName
 * @property {string|undefined} vscodeAppRoot
 * @property {string|undefined} vscodeLanguage
 * @property {boolean} packageJsonOk
 * @property {boolean} i18nJsonOk
 * @property {DiagnoseDependency[]} dependencies
 */

/**
 * @param {string} filePath
 * @returns {string}
 */
/**
 * @param {string} filePath
 * @returns {string}
 */
const getFilePath = filePath => path.resolve(rootDir, filePath);
/**
 * @param {string} moduleName
 * @returns {string}
 */
const getModulePath = moduleName => path.resolve(rootDir, 'node_modules', moduleName);

module.exports = { generateDiagnoseLogFile };

function generateDiagnoseLogFile() {
	try {
		let dir = rootDir;
		if (!isWritable(dir)) dir = require('os').tmpdir();
		if (!isWritable(dir)) throw new Error(`${dir} is not writable`);

		const log = generateDiagnoseContent();
		fs.writeFileSync(path.resolve(dir, 'diagnose.log'), log);
	} catch (error) {
		onError(error);
	}
}

function generateDiagnoseContent() {
	const vscode = safeRequire('vscode');
	const vscodeEnv = vscode && vscode.env || {};
	const packageJson = getPackageJson();
	const i18nJson = getPackageNLSJson();
	return JSON.stringify({
		vscodeAppName: vscodeEnv.appName,
		vscodeAppRoot: vscodeEnv.appRoot,
		vscodeLanguage: vscodeEnv.language,
		packageJsonOk: !!packageJson,
		i18nJsonOk: !!i18nJson,
		dependencies: getDependencies(packageJson),
	}, null, 2);
}


/**
 * @param {{ dependencies?: Record<string, unknown> } | null | undefined} packageJson
 * @returns {DiagnoseDependency[]}
 */
function getDependencies(packageJson) {
	if (!packageJson || typeof packageJson !== 'object') {
		return [];
	}

	const { dependencies } = packageJson;
	if (!dependencies || typeof dependencies !== 'object') {
		return [];
	}

	try {
		return Object.keys(dependencies).map(name => {
			const modulePath = getModulePath(name);
			return {
				name,
				path: modulePath,
				ok: isModuleExisted(name),
			};
		});
	} catch (error) {
		onError(error);
		return [];
	}
}

function getPackageJson() {
	try {
		return JSON.parse(fs.readFileSync(getFilePath('package.json'), 'utf8'));
	} catch (error) {
		onError(error);
		return null;
	}
}

function getPackageNLSJson() {
	try {
		return JSON.parse(fs.readFileSync(getFilePath('package.nls.json'), 'utf8'));
	} catch (error) {
		onError(error);
		return null;
	}
}

/**
 * @template T
 * @param {string} name
 * @returns {T | undefined}
 */
function safeRequire(name) {
	try {
		return /** @type {T} */ (require(name));
	} catch (error) {
		onError(error);
		return undefined;
	}
}

/**
 * @param {string} name
 * @returns {boolean}
 */
function isModuleExisted(name) {
	try {
		return fs.existsSync(getModulePath(name));
	} catch (error) {
		onError(error);
		return false;
	}
}

/**
 * @param {string} dir
 * @returns {boolean}
 */
function isWritable(dir) {
	try {
		fs.accessSync(dir, fs.constants.W_OK);
		return true;
	} catch (error) {
		void error;
		return false;
	}
}

/**
 * @param {unknown} error
 * @returns {void}
 */
function onError(error) {
	// eslint-disable-next-line no-console
	console.error(`EnvironmentProbe:`, error);
}

