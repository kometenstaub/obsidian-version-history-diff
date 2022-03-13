import { Diff2HtmlConfig, html } from 'diff2html';
import { App, Modal, Notice, TFile } from 'obsidian';
import type { gHResult, rVList, vList, recResult } from './interfaces';
import type OpenSyncHistoryPlugin from './main';
import { createTwoFilesPatch } from 'diff';
import FileModal from './file_modal';

function getSize(size: number): string {
	if (size === 0) {
		return '0';
	} else {
		return (size / 1000).toString().slice(0, -1);
	}
}

export default class DiffView extends Modal {
	plugin: OpenSyncHistoryPlugin;
	app: App;
	file: TFile;
	leftVList: vList[]; // needs to be more general
	rightVList: vList[]; // needs to be more general
	leftActive: number;
	rightActive: number;
	rightContent: string;
	leftContent: string;
	syncHistoryContentContainer: HTMLElement;
	versions: gHResult;
	leftHistory: HTMLElement[];
	rightHistory: HTMLElement[];
	htmlConfig: Diff2HtmlConfig;

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
		//@ts-expect-error, will be filled with the correct data later
		this.versions = {};
		//@ts-expect-error, will be filled with the correct data later
		this.leftHistory = [null];
		//@ts-expect-error, will be filled with the correct data later
		this.rightHistory = [null];
		this.htmlConfig = {
			diffStyle: this.plugin.settings.diffStyle,
			matchWordsThreshold: this.plugin.settings.matchWordsThreshold,
		};
		// @ts-ignore
		this.syncHistoryContentContainer = this.contentEl.createDiv({
			cls: ['sync-history-content-container', 'diff'],
		});
		if (this.plugin.settings.colorBlind) {
			this.syncHistoryContentContainer.addClass('colorblind');
		}
	}

	async onOpen() {
		super.onOpen();
		await this.getInitialVersions();
		const diff = this.getDiff();
		this.makeHistoryLists();
		this.makeButtons();
		this.basicHtml(diff);
		this.appendSyncVersions();
		this.makeMoreGeneralHtml();
	}

	private async getInitialVersions() {
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
			return;
		}

		// get function
		const getContent = this.plugin.diff_utils.getContent.bind(this);

		// choose two latest versions
		[this.leftContent, this.rightContent] = [
			await getContent(secondLatestV),
			await getContent(latestV),
		];
	}

	public appendSyncVersions() {
		// add the inner HTML element (the sync list) and keep a record
		// of references to the elements
		this.leftVList.push(
			...this.appendVersions(this.leftHistory[1], this.versions, true)
		);
		this.rightVList.push(
			...this.appendVersions(this.rightHistory[1], this.versions, false)
		);
	}

	public basicHtml(diff: string) {
		// set title
		this.titleEl.setText(this.file.basename);
		// add diff to container
		this.syncHistoryContentContainer.innerHTML = diff;

		// add history lists and diff to DOM
		this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer);
		this.contentEl.appendChild(this.rightHistory[0]);
	}

	public makeMoreGeneralHtml() {
		// highlight initial two versions
		this.rightVList[0].html.addClass('is-active');
		this.leftVList[1].html.addClass('is-active');
		// keep track of highlighted versions
		this.rightActive = 0;
		this.leftActive = 1;
	}

	private makeButtons() {
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
				// gets one type of data
				this.versions.items.push(...newVersions.items);
			});
		}
	}

	public getDiff() {
		// get diff
		const uDiff = createTwoFilesPatch(
			this.file.basename,
			this.file.basename,
			this.leftContent,
			this.rightContent
		);

		// create HTML from diff
		const diff = html(uDiff, this.htmlConfig);
		return diff;
	}

	public makeHistoryLists() {
		// create both history lists
		this.leftHistory = this.createHistory(this.contentEl, true);
		this.rightHistory = this.createHistory(this.contentEl, false);
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

	public createHistory(el: HTMLElement, left: boolean): HTMLElement[] {
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
					this.file
				).open();
			});
		}
		const syncHistoryList = syncHistoryListContainer.createDiv({
			cls: 'sync-history-list',
		});
		return [syncHistoryListContainer, syncHistoryList];
	}

	private appendVersions(
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
				text: getSize(version.size) + ' KB [' + version.device + ']',
			});
			versionList.push({
				html: div,
				v: version,
			});
			div.addEventListener('click', async () => {
				if (left) {
					const clickedEl = await this.generateVersionListener(
						div,
						this.leftVList as vList[],
						this.leftActive,
						left
					);
					await this.getSyncContent(clickedEl, left);
					this.diffAndDiffHtml();
				} else {
					const clickedEl = await this.generateVersionListener(
						div,
						this.rightVList as vList[],
						this.rightActive
					);
					await this.getSyncContent(clickedEl);
					this.diffAndDiffHtml();
				}
			});
		}
		return versionList;
	}

	public async generateVersionListener(
		div: HTMLDivElement,
		currentVList: vList[], // needs to be more general, it only needs an html property
		currentActive: number,
		left: boolean = false
	) {
		// formerly active left/right version
		const currentSideOldVersion = currentVList[currentActive];
		// get the HTML of the new version to set it active
		// @ts-ignore
		const clickedEl: vList = currentVList.find((el) => {
			if (el.html === div) {
				return true;
			}
		});
		const idx = currentVList.findIndex((el) => {
			if (el.html === div) {
				return true;
			}
		});
		clickedEl.html.addClass('is-active');
		if (left) {
			this.leftActive = idx;
		} else {
			this.rightActive = idx;
		}
		// make old not active
		currentSideOldVersion.html.classList.remove('is-active');
		return clickedEl;
	}

	public diffAndDiffHtml() {
		const uDiff = createTwoFilesPatch(
			this.file.basename,
			this.file.basename,
			this.leftContent,
			this.rightContent
			/*
			undefined,
			undefined,
			{
				context: Number.parseInt(
					this.plugin.settings.context
				),
			}
			 */
		);
		const diff = html(uDiff, this.htmlConfig);
		this.syncHistoryContentContainer.innerHTML = diff;
	}

	private async getSyncContent(clickedEl: vList, left: boolean = false) {
		// get the content for the clicked HTML element
		const getContent = this.plugin.diff_utils.getContent.bind(this);
		if (left) {
			this.leftContent = await getContent(clickedEl.v.uid);
		} else {
			this.rightContent = await getContent(clickedEl.v.uid);
		}
	}
}
