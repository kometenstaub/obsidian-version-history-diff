import { html } from 'diff2html';
import { App, Modal, Notice, TFile } from 'obsidian';
import type { gHResult } from './interfaces';
import type OpenSyncHistoryPlugin from './main';

export default class DiffView extends Modal {
	parser: DOMParser;

	constructor(
		private plugin: OpenSyncHistoryPlugin,
		public app: App,
		private file: TFile
	) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.parser = new DOMParser();
		this.modalEl.addClasses(['mod-sync-history', 'diff'])
		this.createHtml();
	}

	async createHtml() {
		// get first thirty versions
		const versions = await this.plugin.diff_utils.getVersions(this.file);
		// for initial display
		let [latestV, secondLatestV] = [0, 0]
		if (versions.items.length > 1) {
			latestV = versions.items[0].uid
			secondLatestV = versions.items[1].uid
		} else {
			new Notice('There are not at least two versions.')
			this.close()
		}

		// get functions
		const getContent = this.plugin.diff_utils.getContent.bind(this);
		const getUnifiedDiff = this.plugin.diff_utils.getUnifiedDiff;

		// need to choose the two versions somehow
		const [c1, c2] = [await getContent(secondLatestV), await getContent(latestV)];

		this.titleEl.setText('Diff view');
		const uDiff = await getUnifiedDiff(c1, c2);

		if (typeof uDiff === 'string') {
			const diff = html(uDiff/*, {outputFormat: 'side-by-side'}*/);
			const parsedHtml = this.parser.parseFromString(diff, 'text/html');

			const leftHistory = this.createHistory(this.contentEl)
			const rightHistory = this.createHistory(this.contentEl)
			const syncHistoryContentContainer = parsedHtml.documentElement
			syncHistoryContentContainer.addClasses(['sync-history-content-container', 'diff'])

			this.contentEl.appendChild(leftHistory)
			this.contentEl.appendChild(syncHistoryContentContainer);
			this.contentEl.appendChild(rightHistory)



		} else {
			new Notice('Something went wrong.');
		}
	}

	createHistory(el: HTMLElement): HTMLElement {
		const syncHistoryListContainer = el.createDiv({
			cls: 'sync-history-list-container'
		})
		const syncHistoryList = syncHistoryListContainer.createDiv({
			cls: 'sync-history-list'
		})
		return syncHistoryListContainer
	}

	appendVersions(el: HTMLElement, versions: gHResult): void {
		for (let version of versions.items) {
			const div = el.createDiv({
				cls: 'sync-history-list-item',
				text: new Date(version.ts).toDateString()
			})
		}
	}
}
