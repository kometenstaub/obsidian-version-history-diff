export interface OpenSyncHistorySettings {
	//context: string;
	diffStyle: 'word' | 'char';
}

declare module 'obsidian' {
	interface App {
		internalPlugins: {
			plugins: {
				sync: {
					instance: syncInstance;
				};
			};
		};
	}
}

export interface syncInstance {
	getHistory(
		path: string,
		// use the UID of the last element in the array to get the next 30 versions
		uid?: null | number
	): Promise<gHResult>;
	showVersionHistory(path: string): Promise<void>;
	getContentForVersion(uid: number): Promise<ArrayBuffer>;
}

export interface gHResult {
	items: item[];
	more: boolean; // whether there are more versions
}

export interface item {
	deleted: boolean;
	device: string; // from which device that version is
	folder: boolean;
	path: string;
	size: number;
	ts: number; // `new Date(ts)` outputs the date
	uid: number; // unique UID for the whole vault
}

export interface vList {
	html: HTMLElement;
	v: item;
}
