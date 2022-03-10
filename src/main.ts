import { Command, Plugin, TFile } from 'obsidian';
//import type { OpenSyncHistorySettings } from './interfaces';
//import OpenSyncHistorySettingTab from './settings';
import DiffUtils from './diff_utils';
import DiffView from './diff_view';

//const DEFAULT_SETTINGS: OpenSyncHistorySettings = {};

export default class OpenSyncHistoryPlugin extends Plugin {
	//@ts-ignore
	//settings: OpenSyncHistorySettings;
	diff_utils = new DiffUtils(this, this.app);

	openDiffModal(file: TFile): void {
		new DiffView(this, this.app, file).open();
	}

	async openSyncHistory(file: TFile): Promise<void> {
		const { instance } = this.app.internalPlugins.plugins['sync'];
		await instance.showVersionHistory(file.path);
	}

	giveCallback(
		fn: (file: TFile) => Promise<void> | void
	): Command['checkCallback'] {
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

	returnOpenCommand(): Command {
		return {
			id: 'open-sync-version-history',
			name: 'Show history for active file',
			checkCallback: this.giveCallback(this.openSyncHistory.bind(this)),
		};
	}

	returnDiffCommand(): Command {
		return {
			id: 'open-diff-view',
			name: 'Show diff view',
			checkCallback: this.giveCallback(this.openDiffModal.bind(this)),
		};
	}

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
