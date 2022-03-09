import type {Plugin} from 'obsidian';
export interface OpenSyncHistorySettings {}

declare module 'obsidian' {
	interface App {
		internalPlugins: {
			plugins: Record<string, Plugin>
		}
	}
}
