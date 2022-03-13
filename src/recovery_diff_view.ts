import DiffView from "./diff_view";
import type {Plugin, App, TFile} from 'obsidian';
import type OpenSyncHistoryPlugin from "./main";

export default class RecoveryDiffView extends DiffView {
	constructor(plugin: OpenSyncHistoryPlugin, app: App, file: TFile) {
		super(plugin, app, file);
	}
}
