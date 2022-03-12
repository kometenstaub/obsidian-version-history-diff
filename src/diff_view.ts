import { html } from 'diff2html';
import { App, Modal, Notice, TFile } from 'obsidian';
import type { gHResult, vList } from './interfaces';
import type OpenSyncHistoryPlugin from './main';
import { createTwoFilesPatch } from 'diff';

export default class DiffView extends Modal {
	leftVList: vList[];
	rightVList: vList[];
	leftActive: number;
	rightActive: number;
	rightContent: string;
	leftContent: string;
	syncHistoryContentContainer: HTMLElement;
	//more: boolean;
	versions: gHResult;
	leftHistory: HTMLElement[];
	rightHistory: HTMLElement[];

	constructor(
		private plugin: OpenSyncHistoryPlugin,
		public app: App,
		private file: TFile
	) {
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
		//@ts-expect-error, it will be filled later
		this.versions = [];
		//@ts-expect-error
		this.leftHistory = [null];
		//@ts-expect-error
		this.rightHistory = [null];
		// @ts-ignore
		this.syncHistoryContentContainer = this.contentEl.createDiv({
			cls: ['sync-history-content-container', 'diff'],
		});
		this.createHtml();
	}

	async createHtml() {
		// get first thirty versions
		this.versions = await this.plugin.diff_utils.getVersions(this.file);
		// for initial display, initialise variables
		let [latestV, secondLatestV] = [0, 0];
		// only display if at least two versions
		if (this.versions.items.length > 1) {
			latestV = this.versions.items[0].uid;
			secondLatestV = this.versions.items[1].uid;
		} else {
			this.close();
			new Notice('There are not at least two versions.');
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
			this.getDate(this.versions.items[1].ts),
			this.getDate(this.versions.items[0].ts),
			this.leftContent,
			this.rightContent
		);

		// create HTML from diff
		const diff = html(uDiff /*, {outputFormat: 'side-by-side'}*/);

		// create both history lists
		this.leftHistory = this.createHistory(this.contentEl);
		this.rightHistory = this.createHistory(this.contentEl);

		// create more button
		const leftMoreButton = this.leftHistory[0].createDiv({
			cls: ['sync-history-load-more-button', 'diff'],
			text: 'Load more',
		});
		const rightMoreButton = this.rightHistory[0].createDiv({
			cls: ['sync-history-load-more-button', 'diff'],
			text: 'Load more',
		});
		this.setMoreButtonStyle(leftMoreButton, rightMoreButton);

		for (const el of [leftMoreButton, rightMoreButton]) {
			el.addEventListener('click', async () => {
				const newVersions = await this.plugin.diff_utils.getVersions(
					this.file,
					this.versions.items.last()?.uid
				);
				this.versions.more = newVersions.more;
				this.setMoreButtonStyle(leftMoreButton, rightMoreButton);

				// append new versions to sync list
				this.leftVList.push(
					...this.appendVersions(
						this.leftHistory[1],
						newVersions,
						true
					)
				);
				this.rightVList.push(
					...this.appendVersions(
						this.rightHistory[1],
						newVersions,
						false
					)
				);
				// add new versions to version list
				this.versions.items.push(...newVersions.items);
			});
		}

		// add diff to container
		this.syncHistoryContentContainer.innerHTML = diff;

		// add history lists and diff to DOM
		this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer);
		this.contentEl.appendChild(this.rightHistory[0]);

		// add the inner HTML element (the sync list) and keep a record
		// of references to the elements
		this.leftVList.push(
			...this.appendVersions(this.leftHistory[1], this.versions, true)
		);
		this.rightVList.push(
			...this.appendVersions(this.rightHistory[1], this.versions, false)
		);

		// highlight initial two versions
		this.rightVList[0].html.addClass('is-active');
		this.leftVList[1].html.addClass('is-active');
		// keep track of highlighted versions
		this.rightActive = 0;
		this.leftActive = 1;
	}

	private setMoreButtonStyle(
		leftMoreButton: HTMLDivElement,
		rightMoreButton: HTMLDivElement
	) {
		if (this.versions.more) {
			leftMoreButton.style.display = 'block';
			rightMoreButton.style.display = 'block';
		} else {
			leftMoreButton.style.display = 'none';
			rightMoreButton.style.display = 'none';
		}
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
			const date = new Date(version.ts);
			const div = el.createDiv({
				cls: 'sync-history-list-item',
				text: date.toDateString() + ', ' + date.toLocaleTimeString(),
			});
			const infoDiv = div.createDiv({
				cls: ['u-small', 'u-muted'],
				text:
					(version.size / 1000).toString().slice(0, -1) +
					' KB [' +
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
					// formerly active right version
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
