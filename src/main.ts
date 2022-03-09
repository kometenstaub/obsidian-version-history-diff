import { Command, Plugin, TFile } from 'obsidian';
//import type { OpenSyncHistorySettings } from './interfaces';
//import OpenSyncHistorySettingTab from './settings';

//const DEFAULT_SETTINGS: OpenSyncHistorySettings = {};

export default class OpenSyncHistoryPlugin extends Plugin {
	//@ts-ignore
	//settings: OpenSyncHistorySettings;

	openSyncHistory(file: TFile): void {
		// @ts-expect-error, untyped
		const { instance } = this.app.internalPlugins.plugins['sync'];
		instance.showVersionHistory(file.path);
	}

	giveCallback(fn: (file: TFile) => void): Command['checkCallback'] {
		return (checking: boolean): boolean => {
			const tfile: TFile | null = this.app.workspace.getActiveFile();
			if (tfile !== null) {
				if (!checking) {
					fn(tfile);
				}
				return true;
			} else {
				return false;
			}
		};
	}

	returnOpenCommand = (): Command => {
		return {
			id: 'open-sync-version-history',
			name: 'Show history',
			checkCallback: this.giveCallback(this.openSyncHistory.bind(this)),
		};
	};

	async onload() {
		console.log('loading Sync Version History plugin');

		this.addCommand(this.returnOpenCommand());

		//await this.loadSettings();

		//this.addSettingTab(new OpenSyncHistorySettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading Sync Version History plugin');
	}

	//async loadSettings() {
	//	this.settings = Object.assign(
	//		{},
	//		DEFAULT_SETTINGS,
	//		await this.loadData()
	//	);
	//}

	//async saveSettings() {
	//	await this.saveData(this.settings);
	//}
}
