export interface OpenSyncHistorySettings {}

declare module 'obsidian' {
	interface App {
		internalPlugins: {
			plugins: {
				sync: {
					instance: {
						getHistory(
							path: string,
							// use the UID of the last element in the array to get the next 30 versions
							uid?: null | number
						): Promise<{
							items:
								{
									deleted: boolean;
									device: string; // from which device that version is
									folder: boolean;
									path: string;
									size: number;
									ts: number; // `new Date(ts)` outputs the date
									uid: number; // unique UID for the whole vault
								}[];
							more: boolean; // whether there are more versions
						}>;
						showVersionHistory(path: string): Promise<void>;
					};
				};
			};
		};
	}
}
