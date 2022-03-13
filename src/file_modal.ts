import {App, MarkdownRenderer, Modal, TFile } from "obsidian";
import type OpenSyncHistoryPlugin from './main'

export default class FileModal extends Modal {
	constructor(private plugin: OpenSyncHistoryPlugin, public app: App, private syncFile: string, private file: TFile) {
		super(app);
		this.plugin = plugin
		this.app = app
		this.file = file
		this.syncFile = syncFile

	}

	async onOpen() {
		super.onOpen()
		const el = this.contentEl;

		await MarkdownRenderer.renderMarkdown(this.syncFile, el, null, null)
		// maybe render the current version on disk right to it, but that won't highlight differences

		//const markdown = await this.app.vault.read(file)
		//await MarkdownRenderer.renderMarkdown(markdown, el, null, null)

		// render button that will replace the current file with what is shown at the moment
	}

}
