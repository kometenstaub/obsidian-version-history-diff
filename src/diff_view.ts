import { html } from 'diff2html';
import { App, Modal, Notice, TFile } from 'obsidian';
import type { gHResult, vList } from './interfaces';
import type OpenSyncHistoryPlugin from './main';
import { createTwoFilesPatch } from 'diff';

export default class DiffView extends Modal {
	parser: DOMParser;
	leftVList: vList[];
	rightVList: vList[];
	leftActive: number;
	rightActive: number;
	rightContent: string;
	leftContent: string;
	syncHistoryContentContainer: HTMLElement;
	more: boolean;

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
		this.modalEl.addClasses(['mod-sync-history', 'diff']);
		this.leftVList = [];
		this.rightVList = [];
		this.rightActive = 0;
		this.leftActive = 1;
		this.rightContent = '';
		this.leftContent = '';
		this.more = false;
		// @ts-ignore
		this.syncHistoryContentContainer = this.contentEl.createDiv({
			cls: ['sync-history-content-container', 'diff'],
		});
		this.createHtml();
	}

	async createHtml() {
		// get first thirty versions
		const versions = await this.plugin.diff_utils.getVersions(this.file);
		this.more = versions.more
		// for initial display, initialise variables
		let [latestV, secondLatestV] = [0, 0];
		// only display if at least two versions
		if (versions.items.length > 1) {
			latestV = versions.items[0].uid;
			secondLatestV = versions.items[1].uid;
		} else {
			new Notice('There are not at least two versions.');
			this.close();
		}

		// set title
		this.titleEl.setText(this.file.basename);

		// get functions
		const getContent = this.plugin.diff_utils.getContent.bind(this);

		// choose two latest versions
		[this.leftContent, this.rightContent] = [
			await getContent(secondLatestV),
			await getContent(latestV),
		];

		// get diff
		const uDiff = createTwoFilesPatch(
			this.getDate(versions.items[1].ts),
			this.getDate(versions.items[0].ts),
			this.leftContent,
			this.rightContent
		);

		// create HTML from diff
		const diff = html(uDiff /*, {outputFormat: 'side-by-side'}*/);

		// create both history lists
		const leftHistory = this.createHistory(this.contentEl);
		const rightHistory = this.createHistory(this.contentEl);

		// create more button
		const leftMoreButton = leftHistory[0].createDiv({
			cls: ['sync-history-load-more-button', 'diff'],
			text: 'Load more'
		})
		const rightMoreButton = rightHistory[0].createDiv({
			cls: ['sync-history-load-more-button', 'diff'],
			text: 'Load more'
		})
		this.more ? leftMoreButton.style.display = 'block' : 'none'
		leftMoreButton.addEventListener('click', async () => {
			versions += await this.plugin.diff_utils.getVersions(this.file)
		})

		// add diff to container
		this.syncHistoryContentContainer.innerHTML = diff;

		// add history lists and diff to DOM
		this.contentEl.appendChild(leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer);
		this.contentEl.appendChild(rightHistory[0]);

		// add the inner HTML element (the sync list) and keep a record
		// of references to the elements
		this.leftVList.push(
			...this.appendVersions(leftHistory[1], versions, true)
		);
		this.rightVList.push(
			...this.appendVersions(rightHistory[1], versions, false)
		);

		// highlight initial two versions
		this.rightVList[0].html.addClass('is-active');
		this.leftVList[1].html.addClass('is-active');
		// keep track of highlighted versions
		this.rightActive = 0;
		this.leftActive = 1;
	}

	createHistory(el: HTMLElement): HTMLElement[] {
		const syncHistoryListContainer = el.createDiv({
			cls: 'sync-history-list-container',
		});
		const syncHistoryList = syncHistoryListContainer.createDiv({
			cls: 'sync-history-list',
		});
		return [syncHistoryListContainer, syncHistoryList];
	}

	appendVersions(
		el: HTMLElement,
		versions: gHResult,
		left: boolean
	): vList[] {
		const versionList: vList[] = [];
		for (let version of versions.items) {
			const div = el.createDiv({
				cls: 'sync-history-list-item',
				text: new Date(version.ts).toDateString(),
			});
			const infoDiv = div.createDiv({
				cls: ['u-small', 'u-muted'],
				text:
					(version.size / 1000).toString() +
					' [' +
					version.device +
					']',
			});
			versionList.push({
				html: div,
				v: version,
			});
			div.addEventListener('click', async () => {
				if (left) {
					// formerly active left version
					const leftOldVersion = this.leftVList[this.leftActive];
					// get the HTML of the new version to set it active
					// @ts-ignore
					const clickedEl: vList = this.leftVList.find((el) => {
						if (el.html === div) {
							return true;
						}
					});
					const idx = this.leftVList.findIndex((el) => {
						if (el.html === div) {
							return true;
						}
					});
					clickedEl.html.addClass('is-active');
					this.leftActive = idx;
					// make old not active
					leftOldVersion.html.classList.remove('is-active');
					// get the content for the clicked HTML element
					const getContent =
						this.plugin.diff_utils.getContent.bind(this);
					this.leftContent = await getContent(clickedEl.v.uid);
					const uDiff = createTwoFilesPatch(
						this.getDate(clickedEl.v.ts),
						this.getDate(this.rightVList[this.rightActive].v.ts),
						this.leftContent,
						this.rightContent
					);
					const diff = html(uDiff);
					this.syncHistoryContentContainer.innerHTML = diff;
				} else {
					// formerly active left version
					const rightOldVersion = this.rightVList[this.rightActive];
					// get the HTML of the new version to set it active
					// @ts-ignore
					const clickedEl: vList = this.rightVList.find((el) => {
						if (el.html === div) {
							return true;
						}
					});
					const idx = this.rightVList.findIndex((el) => {
						if (el.html === div) {
							return true;
						}
					});
					clickedEl.html.addClass('is-active');
					this.rightActive = idx;
					// make old not active
					rightOldVersion.html.classList.remove('is-active');
					// get the content for the clicked HTML element
					const getContent =
						this.plugin.diff_utils.getContent.bind(this);
					this.rightContent = await getContent(clickedEl.v.uid);
					const uDiff = createTwoFilesPatch(
						this.getDate(this.leftVList[this.leftActive].v.ts),
						this.getDate(clickedEl.v.ts),
						this.leftContent,
						this.rightContent
					);
					const diff = html(uDiff);
					this.syncHistoryContentContainer.innerHTML = diff;
				}
			});
		}
		return versionList;
	}

	getDate(ts: number): string {
		const date = new Date(ts);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}
}
