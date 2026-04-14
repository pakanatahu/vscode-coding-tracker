/// <reference path="./vscode.d.ts/vscode.d.ts" />
/// <reference path="./vscode.d.ts/vscode_namespace.d.ts" />

type VCSCacheMap = {
	[key: string]: {
		cache: string;
		expiredTime: number;
	};
}

type UploadObject = {
	version: '4.0';
	token: string;
	type: string;
	typeCode?: number; // numeric parity: open=1, code=2, terminal=3, chat=4
	time: number; // timestamp ms
	long: number; // duration ms
	/**
	 * File language
	 */
	lang: string;
	/**
	 * File name
	 */
	file: string;
	/**
	 * Project name
	 */
	proj: string;
	/**
	 * Computer ID
	 */
	pcid: string;

	/**
	 * Version Control System Information
	 */
	vcs_type: string;
	vcs_repo: string;
	vcs_branch: string;

	/** Line counts */
	line: number;
	/** Character counts */
	char: number;
	/** Reserved field 1 */
	r1: string;
	/** Reserved field 2 */
	r2: string;
	/** Terminal command (optional) */
	command?: string;
	/** Terminal working directory (optional) */
	cwd?: string;
};

