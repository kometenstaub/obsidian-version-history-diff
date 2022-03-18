import { Command, Notice, Plugin, TFile } from 'obsidian';
import type { OpenSyncHistorySettings } from './interfaces';
import OpenSyncHistorySettingTab from './settings';
import DiffUtils from './diff_utils';
import SyncDiffView from './diff_view';
import RecoveryDiffView from './recovery_diff_view';
import GitDiffView from './git_diff_view';

const DEFAULT_SETTINGS: OpenSyncHistorySettings = {
	//context: '3',
	diffStyle: 'word',
	matchWordsThreshold: 0.25,
	colorBlind: false,
};

export default class OpenSyncHistoryPlugin extends Plugin {
	//@ts-ignore
	settings: OpenSyncHistorySettings;
	diff_utils = new DiffUtils(this, this.app);

	addCommand = (command: Command): Command => {
		const commandName = command.name;
		const newCommand = super.addCommand(command);
		newCommand.name = 'Version history diff: ' + commandName;
		return newCommand;
	};

	openGitDiffModal(file: TFile): void {
		if (this.app.plugins.plugins['obsidian-git']) {
			new GitDiffView(this, this.app, file).open();
		} else {
			new Notice('Obsidian Git is not enabled');
		}
	}

	openRecoveryDiffModal(file: TFile): void {
		new RecoveryDiffView(this, this.app, file).open();
	}

	openDiffModal(file: TFile): void {
		new SyncDiffView(this, this.app, file).open();
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
			name: 'Show Sync history for active file',
			checkCallback: this.giveCallback(this.openSyncHistory.bind(this)),
		};
	}

	returnDiffCommand(): Command {
		return {
			id: 'open-sync-diff-view',
			name: 'Show Sync diff view for active file',
			checkCallback: this.giveCallback(this.openDiffModal.bind(this)),
		};
	}

	returnRecoveryDiffCommand(): Command {
		return {
			id: 'open-recovery-diff-view',
			name: 'Show File Recovery diff view for active file',
			checkCallback: this.giveCallback(
				this.openRecoveryDiffModal.bind(this)
			),
		};
	}

	returnGitDiffCommand(): Command {
		return {
			id: 'open-git-diff-view',
			name: 'Show Git Diff view for active file',
			checkCallback: this.giveCallback(this.openGitDiffModal.bind(this)),
		};
	}

	async onload() {
		console.log('loading Version History Diff plugin');

		this.addCommand(this.returnOpenCommand());
		this.addCommand(this.returnDiffCommand());
		this.addCommand(this.returnRecoveryDiffCommand());
		//if (this.app.plugins.plugins['obsidian-git']) {
		this.addCommand(this.returnGitDiffCommand());
		//}

		await this.loadSettings();

		this.addSettingTab(new OpenSyncHistorySettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading Version History Diff plugin');
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
