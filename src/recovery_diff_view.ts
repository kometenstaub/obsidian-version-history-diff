import SyncDiffView from './diff_view';
import { Plugin, App, TFile, Notice } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';
import type { recResult, vRecoveryItem } from './interfaces';
import { FILE_REC_WARNING, ITEM_CLASS } from './constants';
import DiffView from './abstract_diff_view';

export default class RecoveryDiffView extends DiffView {
	versions: recResult[];
	leftVList: vRecoveryItem[];
	rightVList: vRecoveryItem[];
	constructor(plugin: OpenSyncHistoryPlugin, app: App, file: TFile) {
		super(plugin, app, file);
		this.versions = [];
		this.leftVList = [];
		this.rightVList = [];
	}

	async onOpen() {
		super.onOpen();
		await this.getInitialVersions();
		const diff = this.getDiff();
		this.makeHistoryLists(FILE_REC_WARNING);
		this.basicHtml(diff as string, 'File Recovery Diff');
		this.appendVersions();
		this.makeMoreGeneralHtml();
	}

	async getInitialVersions() {
		const fileRecovery = await this.app.internalPlugins.plugins[
			'file-recovery'
		].instance.db
			.transaction('backups', 'readonly')
			.store.index('path')
			.getAll();
		const fileContent = await this.app.vault.read(this.file);
		// correct date is calculated later
		this.versions.push({ path: this.file.path, ts: 0, data: fileContent });
		const len = fileRecovery.length - 1;
		for (let i = len; i >= 0; i--) {
			const version = fileRecovery[i];
			if (version.path === this.file.path) {
				this.versions.push(version);
			}
		}
		if (!(this.versions.length > 1)) {
			this.close();
			new Notice(
				'There is not at least on version in the file recovery.'
			);
			return;
		}

		[this.leftContent, this.rightContent] = [
			this.versions[1].data,
			this.versions[0].data,
		];
	}

	appendVersions() {
		// add the inner HTML element (the sync list) and keep a record
		// of references to the elements
		this.leftVList.push(
			...this.appendRecoveryVersions(
				this.leftHistory[1],
				this.versions,
				true
			)
		);
		this.rightVList.push(
			...this.appendRecoveryVersions(
				this.rightHistory[1],
				this.versions,
				false
			)
		);
	}

	private appendRecoveryVersions(
		el: HTMLElement,
		versions: recResult[],
		left: boolean = false
	): vRecoveryItem[] {
		const versionList: vRecoveryItem[] = [];
		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			let date = new Date(version.ts);
			if (i === 0) {
				date = new Date();
			}
			let div = el.createDiv({
				cls: ITEM_CLASS,
				attr: {
					id: left ? this.ids.left : this.ids.right,
				},
			});
			left ? (this.ids.left += 1) : (this.ids.right += 1);
			if (i === 0) {
				div.createDiv({ text: 'State on disk' });
				div.createDiv({ text: date.toLocaleTimeString() });
			} else {
				div.createDiv({
					text:
						date.toDateString() + ', ' + date.toLocaleTimeString(),
				});
			}
			versionList.push({
				html: div,
				data: version.data,
			});
			div.addEventListener('click', async () => {
				if (left) {
					const clickedEl = (await this.generateVersionListener(
						div,
						this.leftVList,
						this.leftActive,
						left
					)) as vRecoveryItem;
					this.leftContent = version.data;
					this.syncHistoryContentContainer.innerHTML =
						this.getDiff() as string;
				} else {
					const clickedEl = (await this.generateVersionListener(
						div,
						this.rightVList,
						this.rightActive
					)) as vRecoveryItem;
					this.rightContent = version.data;
					this.syncHistoryContentContainer.innerHTML =
						this.getDiff() as string;
				}
			});
		}
		return versionList;
	}
}
