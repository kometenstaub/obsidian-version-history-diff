import { html } from 'diff2html';
import { App, Modal, TFile } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';

export default class DiffView extends Modal {
	constructor(
		private plugin: OpenSyncHistoryPlugin,
		public app: App,
		private file: TFile
	) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.createHtml();
	}

	createHtml() {
		const versions = this.plugin.diff_utils.getVersions(this.file);
		this.titleEl.setText('Diff view');
		//this.contentEl.
	}
}
