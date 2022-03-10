import { html } from 'diff2html';
import { App, Modal, Notice, TFile } from 'obsidian';
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
		this.parser = new DOMParser()
		this.createHtml();
	}

	async createHtml() {
		const versions = this.plugin.diff_utils.getVersions(this.file);
		// need to choose the two versions somehow
		const [v1, v2] = [10, 20] // dummy versions
		const { getContent, getUnifiedDiff } = this.plugin.diff_utils
		const [c1, c2] = [await getContent(v1), await getContent(v2)]
		this.titleEl.setText('Diff view');
		const uDiff = await getUnifiedDiff(c1, c2)
		if (uDiff !== null) {
			const diff = html(uDiff)
			const parsedHtml = this.parser.parseFromString(diff, 'text/html')
			this.contentEl.append(parsedHtml)
		} else {
			new Notice('Something went wrong.')
		}

	}
}
