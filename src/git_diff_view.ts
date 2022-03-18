import { html } from 'diff2html';
import type { App, TFile } from 'obsidian';
import DiffView from './abstract_diff_view';
import { GIT_WARNING } from './constants';
import type { DefaultLogFields, vGitItem } from './interfaces';
import type OpenSyncHistoryPlugin from './main';

export default class GitDiffView extends DiffView {
	versions: DefaultLogFields[];
	leftVList: vGitItem[];
	rightVList: vGitItem[];

	constructor(plugin: OpenSyncHistoryPlugin, app: App, file: TFile) {
		super(plugin, app, file);
		this.versions = [];
		this.leftVList = [];
		this.rightVList = [];
	}

	async onOpen() {
		super.onOpen();
		await this.getInitialVersions();
		const gitDiff = await this.app.plugins.plugins[
			'obsidian-git'
		].gitManager.git.diff([this.versions[1].hash, '--', this.file.path])
		const diff = html(gitDiff)
		this.makeHistoryLists(GIT_WARNING);
		this.basicHtml(diff, 'Git Diff');
		this.appendVersions();
		this.makeMoreGeneralHtml();
	}

	async getDiff(): Promise<string> {
		const gitDiff = await this.app.plugins.plugins['obsidian-git'].gitManager.diff(
			this.file.path,
			this.versions[this.leftActive].hash,
			this.versions[this.rightActive].hash
		);
		return html(gitDiff)
	}

	async getInitialVersions(): Promise<void> {
		const { gitManager } = this.app.plugins.plugins['obsidian-git'];
		const gitVersions = await gitManager.log(this.file.path);
		// version on disk
		this.versions.push({
			author_email: '',
			author_name: '',
			body: '',
			date: new Date().toISOString(),
			hash: '',
			message: '',
			refs: '',
		});
		this.versions.push(...gitVersions);
		console.log(this.versions)
		const diskContent = await this.app.vault.read(this.file);
		const latestCommit = await gitManager.show(
			this.versions[1].hash,
			this.file.path
		);
		[this.leftContent, this.rightContent] = [latestCommit, diskContent];
		// normally done by .makeMoreGeneralHTML, but needed in .getDiff because the diffs
		// are generated from the hashes which need the active file already
		this.rightActive = 0;
		this.leftActive = 1;
	}

	appendVersions(): void {
		this.leftVList.push(...
			this.appendGitVersions(this.leftHistory[1], this.versions, true)
		);
		this.rightVList.push(...
			this.appendGitVersions(this.rightHistory[1], this.versions, false)
		);
	}

	appendGitVersions(
		el: HTMLElement,
		versions: DefaultLogFields[],
		left: boolean = false
	): vGitItem[] {
		const versionList: vGitItem[] = [];
		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			const div = el.createDiv({
				cls: 'sync-history-list-item',
				text: version.message,
			});
			const infoDiv = div.createDiv({
				cls: ['u-small', 'u-muted'],
			});
			const date = infoDiv.createDiv({
				text: version.date
			});
			const author = infoDiv.createDiv({
				text: version.author_name,
			});
			const hash = infoDiv.createDiv({
				text: version.hash.slice(0, 7),
			});
			hash.style.cursor = 'copy';
			hash.addEventListener('click', async () => {
				await navigator.clipboard.writeText(version.hash);
			});
			versionList.push({
				html: div,
				v: version,
			});
			div.addEventListener('click', async () => {
				if (left) {
					const clickedEl = (await this.generateVersionListener(
						div,
						this.leftVList,
						this.leftActive,
						left
					)) as vGitItem;
					// not really necessary, but currently how the abstract class works for other things
					this.leftContent = await this.app.plugins.plugins[
						'obsidian-git'
					].gitManager.show(clickedEl.v.hash, this.file.path);
					if (this.leftActive === 1 && this.rightActive === 0) {
						const gitDiff = await this.app.plugins.plugins[
							'obsidian-git'
							].gitManager.git.diff([this.versions[1].hash, '--', this.file.path])
						this.syncHistoryContentContainer.innerHTML = html(gitDiff)
					} else {
						this.syncHistoryContentContainer.innerHTML =
							await this.getDiff();
					}
				} else {
					const clickedEl = (await this.generateVersionListener(
						div,
						this.rightVList,
						this.rightActive
					)) as vGitItem;
					this.rightContent = await this.app.plugins.plugins[
						'obsidian-git'
					].gitManager.show(clickedEl.v.hash, this.file.path);
					this.syncHistoryContentContainer.innerHTML =
						await this.getDiff();
				}
			});
		}

		return versionList;
	}
}
