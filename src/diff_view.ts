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
		this.parser = new DOMParser();
		this.createHtml();
	}

	async createHtml() {
		const versions = await this.plugin.diff_utils.getVersions(this.file);
		const getContent = this.plugin.diff_utils.getContent.bind(this);
		const getUnifiedDiff = this.plugin.diff_utils.getUnifiedDiff;
		// need to choose the two versions somehow
		const [v1, v2] = [2037, 2009]; // dummy versions; iOS app file
		const [c1, c2] = [await getContent(v1), await getContent(v2)];
		//console.log(c1, '\n\n' ,c2)
		this.titleEl.setText('Diff view');
		const uDiff = await getUnifiedDiff(c1, c2);
		//console.log(`Udiff: ${uDiff}`)
		if (typeof uDiff === 'string') {
			const diff = html(uDiff);
			const parsedHtml = this.parser.parseFromString(diff, 'text/html');
			this.contentEl.appendChild(parsedHtml.documentElement);
		} else {
			new Notice('Something went wrong.');
		}
	}
}
