import DiffView from './diff_view';
import {Plugin, App, TFile, Notice } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';
import type {recResult, rVList } from './interfaces';

export default class RecoveryDiffView extends DiffView {
	//@ts-expect-error, this class uses them differently
	versions: recResult[];
	//@ts-expect-error, tthis class uses them differently
	leftVList: rVList[];
	//@ts-expect-error, tthis class uses them differently
	rightVList: rVList[];
	constructor(plugin: OpenSyncHistoryPlugin, app: App, file: TFile) {
		super(plugin, app, file);
		this.versions = [];
		this.leftVList = [];
		this.rightVList = [];
	}

	async onOpen() {
		await this.getVersions()
		const diff = this.getDiff()
		this.makeHistoryLists()
		this.basicHtml(diff);
		this.appendRecVersions()
		this.makeMoreGeneralHtml()
	}

	async getVersions() {
		const fileRecovery = await this.app.internalPlugins.plugins[
			'file-recovery'
		].instance.db
			.transaction('backups', 'readonly')
			.store.index('path')
			.getAll();
		const fileContent = await this.app.vault.read(this.file)
		this.versions.push({path: this.file.path, ts: new Date().getMilliseconds(), data: fileContent})
		for (const version of fileRecovery) {
			if (version.path === this.file.path) {
				this.versions.push(version)
			}
		}
		if (!(this.versions.length > 1)){
			this.close()
			new Notice('There is not at least on version in the file recovery.')
			return
		}

		[this.leftContent, this.rightContent] = [this.versions[1].data, this.versions[0].data]
	}

	private appendRecVersions() {
		// add the inner HTML element (the sync list) and keep a record
		// of references to the elements
		this.leftVList.push(
			...this.makeVersions(this.leftHistory[1], this.versions, true)
		);
		this.rightVList.push(
			...this.makeVersions(this.rightHistory[1], this.versions, false)
		);
	}

	private makeVersions(el: HTMLElement, versions: recResult[], left: boolean = false) {
		const versionList: rVList[] = [];
		for (const version of versions) {
			const date = new Date(version.ts)
			const div = el.createDiv({
				cls: 'sync-history-list-item',
				text: date.toDateString() + ', ' + date.toLocaleTimeString(),
			});
			versionList.push({
				html: div,
				data: version.data
			})
			div.addEventListener('click', async () => {
				if (left) {
					const clickedEl = await this.generateVersionListener(
						div,
						//@ts-expect-error, the object has an html property, the other one is different
						this.leftVList,
						this.leftActive,
						left
					);
					this.leftContent = version.data
					this.diffAndDiffHtml();
				} else {
					const clickedEl = await this.generateVersionListener(
						div,
						//@ts-expect-error, the object has an html property, the other one is different
						this.rightVList,
						this.rightActive
					);
					this.rightContent = version.data
					this.diffAndDiffHtml();
				}
			});

		}
		return versionList
	}
}
