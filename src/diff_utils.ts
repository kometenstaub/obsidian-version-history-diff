import type { Plugin, App, TFile } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';
import type { gHResult, item, syncInstance } from './interfaces';
import { spawn } from 'child_process';

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

	// Thank you: https://github.com/marcusolsson/obsidian-vale/blob/fdc0fc5d1c259cc823b867ae2d278f09703acf43/src/vale/ValeCli.ts#L12
	async getUnifiedDiff(str1: string, str2: string): Promise<string | null> {
		const child = spawn('diff', [
			'-u',
			`<(echo '${str1}')`,
			`<(echo '${str2}')`,
		]);

		let stdout = '';

		if (child.stdout) {
			child.stdout.on('data', (data) => {
				stdout += data;
			});
		}
		return new Promise((resolve, reject) => {
			child.on('error', reject);

			child.on('close', (code) => {
				if (code === 0) {
					// diff exited without errors
					resolve(stdout);
				} else if (code === 1) {
					// diff returned alerts.
					resolve(null);
				} else {
					// diff exited unexpectedly.
					reject(new Error(`child exited with code ${code}`));
				}
			});
		});
	}
}
