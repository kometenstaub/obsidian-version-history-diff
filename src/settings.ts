import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';

export default class OpenSyncHistorySettingTab extends PluginSettingTab {
	plugin: OpenSyncHistoryPlugin;

	constructor(app: App, plugin: OpenSyncHistoryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const { settings } = this.plugin;

		containerEl.empty();

		containerEl.createEl('h2', {
			text: 'Version History Diff (Sync & Publish)',
		});

		/*
		new Setting(containerEl)
			.setName('Context')
			.setDesc('How many lines of context shall be included')
			.addText((text) => {
				text.setPlaceholder('3')
					.setValue(settings.context)
					.onChange(async (value) => {
						const num = Number.parseInt(value.trim());
						if (Number.isInteger(num) && num >= 0) {
							settings.context = value.trim();
							await this.plugin.saveSettings();
						} else {
							new Notice(
								'Please enter an integer greater or equal to 0.'
							);
						}
					});
			});
		*/

		new Setting(containerEl)
			.setName('Diff style')
			.setDesc('What difference level shall be shown')
			.addDropdown((el) => {
				el.addOption('word', 'Word difference level')
					.addOption('char', 'Character difference level')
					.setValue(settings.diffStyle)
					.onChange(async (value) => {
						settings.diffStyle = value as 'word' | 'char';
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Match words threshold')
			.setDesc('Similarity threshold for word matching, default is 0.25')
			.addText((text) => {
				text.setPlaceholder('0.25')
					.setValue(settings.matchWordsThreshold.toString())
					.onChange(async (value) => {
						const newValue = value.trim();
						const num = Number.parseFloat(newValue);
						if (Number.isNumber(num) && 0 <= num && num <= 1) {
							settings.matchWordsThreshold =
								Number.parseFloat(newValue);
							await this.plugin.saveSettings();
						} else {
							new Notice('Please enter a float between 0 and 1.');
						}
					});
			});

		new Setting(containerEl)
			.setName('Colour blindness')
			.setDesc('Enable colour-blind mode')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.colorBlind)
					.onChange(async (state) => {
						this.plugin.settings.colorBlind = state;
						await this.plugin.saveSettings();
					});
			});
	}
}
