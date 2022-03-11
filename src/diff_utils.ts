import type { Plugin, App, TFile } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';
import type { gHResult, item, syncInstance } from './interfaces';
import { exec } from 'child_process';

export default class DiffUtils {
	plugin: OpenSyncHistoryPlugin;
	app: App;
	instance: syncInstance;

	constructor(plugin: OpenSyncHistoryPlugin, app: App) {
		this.plugin = plugin;
		this.app = app;
		this.instance = app.internalPlugins.plugins.sync.instance
	}

	async getVersions(
		file: TFile,
		uid: number | null = null
	): Promise<gHResult> {
		//const { instance } = this.app.internalPlugins.plugins.sync
		return await this.instance.getHistory(file.path, uid);
	}

	async getContent(uid: number): Promise<string> {
		const content = await this.app.internalPlugins.plugins.sync.instance.getContentForVersion(uid);
		const textDecoder = new TextDecoder('utf-8');
		const text = textDecoder.decode(new Uint8Array(content));
		return text;
	}

	// Thank you: https://github.com/marcusolsson/obsidian-vale/blob/fdc0fc5d1c259cc823b867ae2d278f09703acf43/src/vale/ValeCli.ts#L12
	async getUnifiedDiff(str1: string, str2: string): Promise<string | void> {
		// 5 is currently the amount of context
		const child = exec(`diff -u5 <(echo -e "${str1}") <(echo -e "${str2}")`, (error, stdout, stderr) => {
			if (stdout) {
				console.log(stdout)
				return stdout
			}
			else if (error) {
				console.error(`exec error: ${error}`)
				return
			}
			else if (stderr) {
				console.error(`stderr: ${stderr}`)
			}
		});

	}
}
