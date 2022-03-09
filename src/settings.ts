import { App, PluginSettingTab, Setting } from 'obsidian';
import type OpenSyncHistoryPlugin from './main';

export default class OpenSyncHistorySettingTab extends PluginSettingTab {
	plugin: OpenSyncHistoryPlugin;

	constructor(app: App, plugin: OpenSyncHistoryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		//const { settings } = this.plugin;

		containerEl.empty();

		containerEl.createEl('h2', {
			text: ' ... Settings',
		});

		//new Setting(containerEl)
		//	.setName('')
		//	.setDesc('')
		//	.addText((text) => {
		//		text.setPlaceholder('')
		//			.setValue(settings.homeNote)
		//			.onChange(async (value) => {
		//				settings.homeNote = value.trim();
		//				await this.plugin.saveSettings();
		//			});
		//	});
	}
}
