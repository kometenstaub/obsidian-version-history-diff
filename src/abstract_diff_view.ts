import { createTwoFilesPatch, diffArrays } from 'diff';
import { Diff2HtmlConfig, html } from 'diff2html';
import { App, Modal, TFile, Component, MarkdownRenderer } from 'obsidian';
import FileModal from './file_modal';
import type { vItem } from './interfaces';
import type OpenSyncHistoryPlugin from './main';

export default abstract class DiffView extends Modal {
	plugin: OpenSyncHistoryPlugin;
	app: App;
	file: TFile;
	leftVList: vItem[];
	rightVList: vItem[];
	leftActive: number;
	rightActive: number;
	rightContent: string | Uint8Array;
	leftContent: string | Uint8Array;
	syncHistoryContentContainer: HTMLElement;
	diffContentEl: HTMLElement;
	leftHistory: HTMLElement[];
	rightHistory: HTMLElement[];
	htmlConfig: Diff2HtmlConfig;
	ids: { left: number; right: number };
	comp: Component;
	viewMode: 'raw' | 'rendered';
	private blobUrls: string[] = [];

	constructor(plugin: OpenSyncHistoryPlugin, app: App, file: TFile) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.modalEl.addClasses(['mod-sync-history', 'diff']);
		this.leftVList = [];
		this.rightVList = [];
		this.rightActive = 0;
		this.leftActive = 1;
		this.rightContent = '';
		this.leftContent = '';
		this.ids = { left: 0, right: 0 };
		//@ts-expect-error, will be filled with the correct data later
		this.leftHistory = [null];
		//@ts-expect-error, will be filled with the correct data later
		this.rightHistory = [null];
		this.htmlConfig = {
			diffStyle: this.plugin.settings.diffStyle,
			matchWordsThreshold: this.plugin.settings.matchWordsThreshold,
			outputFormat: this.plugin.settings.outputFormat,
		};
		this.containerEl.addClass('diff');
		this.syncHistoryContentContainer = this.contentEl.createDiv({
			cls: ['sync-history-content-container', 'diff'],
		});
		if (this.plugin.settings.colorBlind) {
			this.syncHistoryContentContainer.addClass('colorblind');
		}
		this.viewMode = 'rendered';
		this.comp = new Component();
		this.comp.load();
		this.diffContentEl = this.syncHistoryContentContainer.createDiv({
			cls: 'diff-content-container-inner',
		});
	}

	onOpen() {
		super.onOpen();
		this.createToggleBar();
		// in onOpen() of the child classes these calls need to be implemented

		// initial versions are different
		//

		// same
		// const diff = this.getDiff();
		// this.makeHistoryLists(FILE_REC_WARNING);

		// // Sync needs to make buttons as well
		// //

		// // same
		// this.basicHtml(diff);

		// // appending the versions is different
		// //

		// // same
		// this.makeMoreGeneralHtml();
	}

	abstract getInitialVersions(): Promise<void | boolean>;

	abstract appendVersions(): void;

	protected isBinaryFile(): boolean {
		return this.plugin.diff_utils.isBinaryFile(this.file.name);
	}

	protected getBinaryPreview(): string {
		const toUint8Array = (
			content: string | Uint8Array | ArrayBuffer
		): Uint8Array => {
			if (content instanceof Uint8Array) return content;
			if (content instanceof ArrayBuffer) return new Uint8Array(content);
			if (typeof content === 'string')
				return new TextEncoder().encode(content);
			return new Uint8Array();
		};

		const leftUint8 = toUint8Array(this.leftContent);
		const rightUint8 = toUint8Array(this.rightContent);

		const isImage = [
			'png',
			'jpg',
			'jpeg',
			'gif',
			'bmp',
			'webp',
		].includes(this.file.extension.toLowerCase());

		if (isImage) {
			const leftBlob = new Blob([leftUint8 as BlobPart]);
			const rightBlob = new Blob([rightUint8 as BlobPart]);
			const leftUrl = URL.createObjectURL(leftBlob);
			const rightUrl = URL.createObjectURL(rightBlob);
			this.blobUrls.push(leftUrl, rightUrl);

			return `<div class="binary-diff">
				<div class="binary-side">
					<h4>Old Version</h4>
					<img src="${leftUrl}" style="max-width: 100%;" />
				</div>
				<div class="binary-side">
					<h4>New Version</h4>
					<img src="${rightUrl}" style="max-width: 100%;" />
				</div>
			</div>`;
		} else {
			return `<div class="binary-diff">
				<div class="binary-side">
					<h4>Old Version</h4>
					<div class="binary-fallback-msg">Visual diff not available for this binary format.</div>
					<div class="u-muted">Size: ${(leftUint8.length / 1024).toFixed(2)} KB</div>
				</div>
				<div class="binary-side">
					<h4>New Version</h4>
					<div class="binary-fallback-msg">Visual diff not available for this binary format.</div>
					<div class="u-muted">Size: ${(rightUint8.length / 1024).toFixed(2)} KB</div>
				</div>
			</div>`;
		}
	}

	public getDiff(): string {
		if (this.isBinaryFile()) {
			return this.getBinaryPreview();
		}

		const decoder = new TextDecoder('utf-8');
		const leftStr =
			this.leftContent instanceof Uint8Array
				? decoder.decode(this.leftContent)
				: this.leftContent;
		const rightStr =
			this.rightContent instanceof Uint8Array
				? decoder.decode(this.rightContent)
				: this.rightContent;

		// the second type is needed for the Git view, it reimplements getDiff
		// get diff
		const uDiff = createTwoFilesPatch(
			this.file.basename,
			this.file.basename,
			leftStr as string,
			rightStr as string
		);

		// create HTML from diff
		const diff = html(uDiff, this.htmlConfig);
		return diff;
	}

	public makeHistoryLists(warning: string): void {
		// create both history lists
		this.leftHistory = this.createHistory(this.contentEl, true, warning);
		this.rightHistory = this.createHistory(this.contentEl, false, warning);
	}

	private createHistory(
		el: HTMLElement,
		left = false,
		warning: string
	): HTMLElement[] {
		const syncHistoryListContainer = el.createDiv({
			cls: 'sync-history-list-container',
		});
		if (left) {
			const showFile = syncHistoryListContainer.createEl('button', {
				cls: 'mod-cta',
				text: 'Render this version',
			});
			showFile.addEventListener('click', () => {
				new FileModal(
					this.plugin,
					this.app,
					this.leftContent,
					this.file,
					warning
				).open();
			});
		}
		const syncHistoryList = syncHistoryListContainer.createDiv({
			cls: 'sync-history-list',
		});
		return [syncHistoryListContainer, syncHistoryList];
	}

	onClose() {
		super.onClose();
		this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
		this.comp.unload();
	}

	private createToggleBar(): void {
		if (this.isBinaryFile()) {
			return;
		}

		const toggleBar = this.syncHistoryContentContainer.createDiv({
			cls: 'diff-toggle-bar',
		});

		const rawButton = toggleBar.createEl('button', {
			cls: ['diff-toggle-btn'],
			text: 'Raw Diff',
		});

		const renderButton = toggleBar.createEl('button', {
			cls: ['diff-toggle-btn', 'is-active'],
			text: 'Rendered',
		});

		rawButton.addEventListener('click', () => {
			if (this.viewMode !== 'raw') {
				this.viewMode = 'raw';
				rawButton.addClass('is-active');
				renderButton.removeClass('is-active');
				this.updateDiffView();
			}
		});

		renderButton.addEventListener('click', () => {
			if (this.viewMode !== 'rendered') {
				this.viewMode = 'rendered';
				renderButton.addClass('is-active');
				rawButton.removeClass('is-active');
				this.updateDiffView();
			}
		});
	}

	public async updateDiffView(): Promise<void> {
		this.diffContentEl.empty();
		this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
		this.blobUrls = [];

		if (this.isBinaryFile()) {
			this.diffContentEl.innerHTML = this.getDiff();
			return;
		}

		if (this.viewMode === 'raw') {
			const rawHeader = this.diffContentEl.createDiv({
				cls: 'raw-diff-header',
				attr: { style: 'display: flex; gap: 1.5rem; padding: 0 1.5rem; margin-bottom: 1rem;' },
			});
			if (this.htmlConfig.outputFormat === 'side-by-side') {
				const leftSide = rawHeader.createDiv({ attr: { style: 'flex: 1;' } });
				leftSide.createEl('h4', {
					text: 'Old Version (Raw)',
					attr: { style: 'margin: 0; font-weight: 600; color: var(--text-normal);' },
				});
				const rightSide = rawHeader.createDiv({ attr: { style: 'flex: 1;' } });
				rightSide.createEl('h4', {
					text: 'New Version (Raw)',
					attr: { style: 'margin: 0; font-weight: 600; color: var(--text-normal);' },
				});
			} else {
				rawHeader.createEl('h4', {
					text: 'Raw Diff',
					attr: { style: 'margin: 0; font-weight: 600; color: var(--text-normal);' },
				});
			}
			const diffContainer = this.diffContentEl.createDiv();
			diffContainer.innerHTML = this.getDiff();
		} else {
			const decoder = new TextDecoder('utf-8');
			const leftStr =
				this.leftContent instanceof Uint8Array
					? decoder.decode(this.leftContent)
					: this.leftContent;
			const rightStr =
				this.rightContent instanceof Uint8Array
					? decoder.decode(this.rightContent)
					: this.rightContent;

			// Render both markdowns to temporary containers
			const tempLeftDiv = document.createElement('div');
			const tempRightDiv = document.createElement('div');

			await MarkdownRenderer.render(
				this.app,
				leftStr,
				tempLeftDiv,
				this.file.path,
				this.comp
			);

			await MarkdownRenderer.render(
				this.app,
				rightStr,
				tempRightDiv,
				this.file.path,
				this.comp
			);

			const leftHtml = tempLeftDiv.innerHTML;
			const rightHtml = tempRightDiv.innerHTML;

			// Tokenize HTML: keep tags intact, split text into words/whitespace/punctuation
			const tokenizeHtml = (htmlStr: string): string[] => {
				const tokens: string[] = [];
				const regex = /(<[^>]+>|[^<]+)/g;
				let match;
				while ((match = regex.exec(htmlStr)) !== null) {
					const token = match[0];
					if (token.startsWith('<')) {
						tokens.push(token);
					} else {
						const textRegex = /(\w+|[^\w\s]+|\s+)/g;
						let textMatch;
						while ((textMatch = textRegex.exec(token)) !== null) {
							tokens.push(textMatch[0]);
						}
					}
				}
				return tokens;
			};

			const leftTokens = tokenizeHtml(leftHtml);
			const rightTokens = tokenizeHtml(rightHtml);

			const diffResult = diffArrays(leftTokens, rightTokens);

			const addClassToTag = (tag: string, className: string): string => {
				if (tag.startsWith('</')) {
					return tag;
				}
				const classMatch = tag.match(/class=["']([^"']*)["']/);
				if (classMatch) {
					const existingClasses = classMatch[1];
					const newClasses = existingClasses
						? `${existingClasses} ${className}`
						: className;
					return tag.replace(
						/class=["']([^"']*)["']/,
						`class="${newClasses}"`
					);
				} else {
					const tagNameMatch = tag.match(/^<\w+/);
					if (tagNameMatch) {
						const tagName = tagNameMatch[0];
						return tag.replace(
							tagName,
							`${tagName} class="${className}"`
						);
					}
				}
				return tag;
			};

			const leftDiffHtmlParts: string[] = [];
			const rightDiffHtmlParts: string[] = [];

			for (const change of diffResult) {
				if (change.added) {
					for (const token of change.value) {
						if (token.startsWith('<')) {
							rightDiffHtmlParts.push(
								addClassToTag(token, 'diff-rendered-added')
							);
						} else {
							rightDiffHtmlParts.push(
								`<ins class="diff-rendered-added">${token}</ins>`
							);
						}
					}
				} else if (change.removed) {
					for (const token of change.value) {
						if (token.startsWith('<')) {
							leftDiffHtmlParts.push(
								addClassToTag(token, 'diff-rendered-deleted')
							);
						} else {
							leftDiffHtmlParts.push(
								`<del class="diff-rendered-deleted">${token}</del>`
							);
						}
					}
				} else {
					for (const token of change.value) {
						leftDiffHtmlParts.push(token);
						rightDiffHtmlParts.push(token);
					}
				}
			}

			const finalLeftHtml = leftDiffHtmlParts.join('');
			const finalRightHtml = rightDiffHtmlParts.join('');

			const renderedContainer = this.diffContentEl.createDiv({
				cls: 'markdown-rendered-diff',
			});

			const leftSide = renderedContainer.createDiv({
				cls: 'markdown-side',
			});
			leftSide.createEl('h4', { text: 'Old Version (Rendered)' });
			const leftContentEl = leftSide.createDiv({
				cls: 'rendered-content',
			});
			leftContentEl.innerHTML = finalLeftHtml;

			const rightSide = renderedContainer.createDiv({
				cls: 'markdown-side',
			});
			rightSide.createEl('h4', { text: 'New Version (Rendered)' });
			const rightContentEl = rightSide.createDiv({
				cls: 'rendered-content',
			});
			rightContentEl.innerHTML = finalRightHtml;

			let scrollLocked = false;
			leftSide.addEventListener('scroll', () => {
				if (!scrollLocked) {
					scrollLocked = true;
					rightSide.scrollTop = leftSide.scrollTop;
					rightSide.scrollLeft = leftSide.scrollLeft;
					requestAnimationFrame(() => {
						scrollLocked = false;
					});
				}
			});

			rightSide.addEventListener('scroll', () => {
				if (!scrollLocked) {
					scrollLocked = true;
					leftSide.scrollTop = rightSide.scrollTop;
					leftSide.scrollLeft = rightSide.scrollLeft;
					requestAnimationFrame(() => {
						scrollLocked = false;
					});
				}
			});
		}
	}

	public async basicHtml(diffType: string): Promise<void> {
		// set title
		this.titleEl.setText(diffType);

		// add history lists and diff to DOM
		this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer);
		this.contentEl.appendChild(this.rightHistory[0]);

		await this.updateDiffView();
	}

	public makeMoreGeneralHtml(): void {
		// highlight initial two versions
		this.rightVList[0].html.addClass('is-active');
		this.leftVList[1].html.addClass('is-active');
		// keep track of highlighted versions
		this.rightActive = 0;
		this.leftActive = 1;
	}

	public async generateVersionListener(
		div: HTMLDivElement,
		currentVList: vItem[],
		currentActive: number,
		left = false
	): Promise<vItem> {
		// the exact return type depends on the type of currentVList, it is either vSyncItem or vRecoveryItem
		// formerly active left/right version
		const currentSideOldVersion = currentVList[currentActive];
		// get the HTML of the new version to set it active
		const idx = Number(div.id);
		const clickedEl: vItem = currentVList[idx];
		div.addClass('is-active');
		if (left) {
			this.leftActive = idx;
		} else {
			this.rightActive = idx;
		}
		// make old not active
		if (Number.parseInt(currentSideOldVersion.html.id) !== idx) {
			currentSideOldVersion.html.classList.remove('is-active');
		}
		return clickedEl;
	}
}
