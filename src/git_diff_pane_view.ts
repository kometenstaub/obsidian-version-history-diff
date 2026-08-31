import { createTwoFilesPatch } from 'diff';
import { html } from 'diff2html';
import {
	ItemView,
	Notice,
	sanitizeHTMLToDom,
	setTooltip,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';
import { GIT_WARNING, ITEM_CLASS } from './constants';
import type { DefaultLogFields, vGitItem } from './interfaces';
import type OpenSyncHistoryPlugin from './main';

export const VIEW_TYPE_GIT_DIFF_PANE = 'git-diff-pane-view';

// ponytail: duplicates appendGitVersions()/getDiff() from GitDiffView instead of
// sharing a base with the Modal views. Modal and ItemView don't share a lifecycle
// (open/close vs. onOpen/onClose on a persistent leaf), so unifying them would mean
// reworking abstract_diff_view.ts for all three history types in one PR. Worth doing
// if a second ItemView (sync or recovery) is added later.
export default class GitDiffPaneView extends ItemView {
	plugin: OpenSyncHistoryPlugin;
	file: TFile | null = null;
	versions: DefaultLogFields[] = [];
	leftVList: vGitItem[] = [];
	rightVList: vGitItem[] = [];
	leftActive = 1;
	rightActive = 0;
	leftContent = '';
	rightContent = '';
	ids = { left: 0, right: 0 };
	diffContainer!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: OpenSyncHistoryPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_GIT_DIFF_PANE;
	}

	getDisplayText(): string {
		return 'Git diff';
	}

	getIcon(): string {
		return 'git-branch';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClasses(['diff', 'git-diff-pane-view']);
		if (this.plugin.settings.colorBlind) {
			this.contentEl.addClass('colorblind');
		}
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const active = this.app.workspace.getActiveFile();
				if (active && active !== this.file) {
					this.renderFile(active);
				}
			})
		);
		const active = this.app.workspace.getActiveFile();
		if (active) {
			await this.renderFile(active);
		} else {
			this.contentEl.setText('Open a note to see its Git diff.');
		}
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private async renderFile(file: TFile): Promise<void> {
		const gitPlugin = this.app.plugins.plugins['obsidian-git'];
		if (!gitPlugin) {
			this.contentEl.empty();
			this.contentEl.setText('Obsidian Git is not enabled.');
			return;
		}

		this.file = file;
		this.versions = [];
		this.ids = { left: 0, right: 0 };
		this.leftActive = 1;
		this.rightActive = 0;

		const gitVersions = await gitPlugin.gitManager.log(file.path);
		this.contentEl.empty();
		if (gitVersions.length === 0) {
			this.contentEl.setText(`There are no commits for ${file.basename}.`);
			return;
		}

		// version on disk, same convention as GitDiffView
		this.versions.push({
			author_email: '',
			author_name: '',
			body: '',
			date: new Date().toLocaleTimeString(),
			hash: '',
			message: '',
			refs: '',
			fileName: file.name,
		});
		this.versions.push(...gitVersions);

		const diskContent = await this.app.vault.read(file);
		const latestCommit = await gitPlugin.gitManager.show(
			this.versions[1].hash,
			file.path
		);
		this.leftContent = latestCommit;
		this.rightContent = diskContent;

		this.contentEl.createDiv({ cls: 'u-muted', text: GIT_WARNING });
		const leftHistory = this.contentEl
			.createDiv({ cls: 'sync-history-list-container' })
			.createDiv({ cls: 'sync-history-list' });
		this.diffContainer = this.contentEl.createDiv({
			cls: ['sync-history-content-container', 'diff'],
		});
		const rightHistory = this.contentEl
			.createDiv({ cls: 'sync-history-list-container' })
			.createDiv({ cls: 'sync-history-list' });

		this.leftVList = this.appendGitVersions(leftHistory, this.versions, true);
		this.rightVList = this.appendGitVersions(
			rightHistory,
			this.versions,
			false
		);
		this.leftVList[1].html.addClass('is-active');
		this.rightVList[0].html.addClass('is-active');

		this.renderDiff();
	}

	private renderDiff(): void {
		if (!this.file) {
			return;
		}
		const uDiff = createTwoFilesPatch(
			this.file.basename,
			this.file.basename,
			this.leftContent,
			this.rightContent
		);
		const diffHtml = html(uDiff, {
			diffStyle: this.plugin.settings.diffStyle,
			matchWordsThreshold: this.plugin.settings.matchWordsThreshold,
			outputFormat: this.plugin.settings.outputFormat,
		});
		this.diffContainer.replaceChildren(sanitizeHTMLToDom(diffHtml));
	}

	private appendGitVersions(
		el: HTMLElement,
		versions: DefaultLogFields[],
		left: boolean
	): vGitItem[] {
		const versionList: vGitItem[] = [];
		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			const div = el.createDiv({
				cls: ITEM_CLASS,
				attr: { id: left ? this.ids.left : this.ids.right },
			});
			left ? (this.ids.left += 1) : (this.ids.right += 1);
			const message = div.createDiv({
				text: i !== 0 ? version.message : 'State on disk',
			});
			setTooltip(message, version.body !== '' ? version.body : '', {
				placement: 'top',
			});
			const infoDiv = div.createDiv({ cls: ['u-muted'] });
			if (version.fileName !== this.file!.path && i !== 0) {
				infoDiv.createDiv({
					text: 'Old name: ' + version.fileName.slice(0, -3),
				});
			}
			infoDiv.createDiv({ text: version.date.split('T')[0] });
			infoDiv.createDiv({ text: version.date.split('T')[1] });
			infoDiv.createDiv({ text: version.author_name });
			const hash = infoDiv.createDiv({ text: version.hash.slice(0, 7) });
			if (version.refs !== '') {
				infoDiv.createDiv({ text: version.refs });
			}

			hash.style.cursor = 'copy';
			hash.addEventListener('click', async (mod) => {
				const text = mod.shiftKey
					? version.hash
					: version.hash.slice(0, 7);
				await navigator.clipboard.writeText(text);
			});

			versionList.push({ html: div, v: version });
			div.addEventListener('click', async () => {
				await this.selectVersion(div, i, left);
			});
		}
		return versionList;
	}

	private async selectVersion(
		div: HTMLDivElement,
		idx: number,
		left: boolean
	): Promise<void> {
		if (!this.file) {
			return;
		}
		const gitPlugin = this.app.plugins.plugins['obsidian-git'];
		if (!gitPlugin) {
			new Notice('Obsidian Git is not enabled');
			return;
		}
		const currentVList = left ? this.leftVList : this.rightVList;
		const currentActive = left ? this.leftActive : this.rightActive;
		currentVList[currentActive].html.removeClass('is-active');
		div.addClass('is-active');

		const content =
			idx === 0
				? await this.app.vault.read(this.file)
				: await gitPlugin.gitManager.show(
						currentVList[idx].v.hash,
						currentVList[idx].v.fileName
				  );

		if (left) {
			this.leftActive = idx;
			this.leftContent = content;
		} else {
			this.rightActive = idx;
			this.rightContent = content;
		}
		this.renderDiff();
	}
}
