import type { Plugin, App} from 'obsidian';
import type OpenSyncHistoryPlugin from './main'

export default class DiffUtils {

	constructor(private plugin: OpenSyncHistoryPlugin, private app: App) {
		this.plugin = plugin;
		this.app = app
	}
}
