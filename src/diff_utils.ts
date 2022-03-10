import type { Plugin, App, TFile } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';
import type { gHResult, item, syncInstance } from './interfaces';

export default class DiffUtils {
	instance: syncInstance;

	constructor(private plugin: OpenSyncHistoryPlugin, private app: App) {
		this.plugin = plugin;
		this.app = app;
		this.instance = this.app.internalPlugins.plugins.sync.instance;
	}

	async getVersions(
		file: TFile,
		uid: number | null = null
	): Promise<gHResult> {
		return await this.instance.getHistory(file.path, uid);
	}

	async getContent(uid: number) {
		const content = await this.instance.getContentForVersion(uid);
		const textDecoder = new TextDecoder('utf-8');
		const text = textDecoder.decode(new Uint8Array(content));
	}
}
