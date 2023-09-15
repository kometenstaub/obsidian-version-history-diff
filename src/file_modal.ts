import {
	App,
	Component,
	MarkdownRenderer,
	Modal,
	Notice,
	sanitizeHTMLToDom,
	setTooltip,
	TFile,
} from 'obsidian';
import { FILE_REC_WARNING } from './constants';
import type OpenSyncHistoryPlugin from './main';

export default class FileModal extends Modal {
	raw: boolean;
	comp: Component;

	constructor(
		private plugin: OpenSyncHistoryPlugin,
		public app: App,
		private syncFile: string,
		private file: TFile,
		private warning: string
	) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.syncFile = syncFile;
		this.raw = false;
		this.comp = new Component();
		this.comp.load();
	}

	async onClose() {
		this.comp.unload();
	}

	async onOpen() {
		this.containerEl.addClass('version-display');

		const warning = this.contentEl.createDiv({
			text: this.warning,
		});
		this.contentEl.createEl('br');

		const restoreButton = this.contentEl.createEl('button', {
			cls: ['mod-cta', 'restore'],
			text: `Replace file content with the shown version`,
		});
		setTooltip(restoreButton, 'Click to replace with this version', {
			placement: 'top',
		});
		const switchButton = this.contentEl.createEl('button', {
			cls: ['mod-cta', 'switch'],
			text: 'Show raw text',
		});

		const el = this.contentEl.createDiv();

		switchButton.addEventListener('click', () => {
			if (!this.raw) {
				el.empty();
				const textArea = el.createEl('textarea', {
					text: this.syncFile,
					attr: { spellcheck: false },
					cls: 'plain-text-area',
				});
				this.raw = !this.raw;
				switchButton.innerText = 'Show Reading view';
			} else {
				this.raw = !this.raw;
				(async () => {
					el.empty();
					await MarkdownRenderer.render(
						this.app,
						this.syncFile,
						el,
						this.file.path,
						this.comp
					);
				})();
				switchButton.innerText = 'Show raw text';
			}
		});

		restoreButton.addEventListener('click', () => {
			(async () => {
				await this.app.vault.modify(this.file, this.syncFile);
			})();
			new Notice(
				`The ${this.file.basename} file has been overwritten with the selected version.`
			);
			this.close();
		});

		await MarkdownRenderer.render(
			this.app,
			this.syncFile,
			el,
			this.file.path,
			this.comp
		);
	}
}
