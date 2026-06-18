import type { App, TFile } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';
import type { gHResult, syncInstance } from './interfaces';

export default class DiffUtils {
	plugin: OpenSyncHistoryPlugin;
	app: App;
	instance: syncInstance;

	constructor(plugin: OpenSyncHistoryPlugin, app: App) {
		this.plugin = plugin;
		this.app = app;
		this.instance = app.internalPlugins.plugins.sync.instance;
	}

	async getVersions(
		file: TFile,
		uid: number | null = null
	): Promise<gHResult> {
		//const { instance } = this.app.internalPlugins.plugins.sync
		return await this.instance.getHistory(file.path, uid);
	}

	async getContent(uid: number): Promise<Uint8Array> {
		const content =
			await this.app.internalPlugins.plugins.sync.instance.getContentForVersion(
				uid
			);
		return new Uint8Array(content);
	}

	isBinaryFile(filename: string): boolean {
		const extension = filename.split('.').pop()?.toLowerCase() || '';
		const binaryExtensions = [
			'png',
			'jpg',
			'jpeg',
			'gif',
			'bmp',
			'webp',
			'pdf',
			'zip',
		];
		return binaryExtensions.includes(extension);
	}
}
