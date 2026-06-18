import {
	App,
	Component,
	MarkdownRenderer,
	Modal,
	Notice,
	setTooltip,
	TFile,
} from 'obsidian';
import type OpenSyncHistoryPlugin from './main';

export default class FileModal extends Modal {
	raw: boolean;
	comp: Component;
	private blobUrl: string | null = null;

	constructor(
		private plugin: OpenSyncHistoryPlugin,
		public app: App,
		private syncFile: string | Uint8Array,
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
		if (this.blobUrl) {
			URL.revokeObjectURL(this.blobUrl);
		}
		this.comp.unload();
	}

	async onOpen() {
		this.containerEl.addClass('version-display');

		this.contentEl.createDiv({
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

		if (this.syncFile instanceof Uint8Array) {
			const blob = new Blob([this.syncFile]);
			this.blobUrl = URL.createObjectURL(blob);
			el.createEl('img', {
				attr: { src: this.blobUrl, style: 'max-width: 100%;' },
			});
			switchButton.hide();
		} else {
			switchButton.addEventListener('click', () => {
				if (!this.raw) {
					el.empty();
					el.createEl('textarea', {
						text: this.syncFile as string,
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
							this.syncFile as string,
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
					await this.app.vault.modify(
						this.file,
						this.syncFile as string
					);
				})();
				new Notice(
					`The ${this.file.basename} file has been overwritten with the selected version.`
				);
				this.close();
			});

			await MarkdownRenderer.render(
				this.app,
				this.syncFile as string,
				el,
				this.file.path,
				this.comp
			);
		}
	}
}
