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
							items: [
								{
									deleted: boolean;
									device: string;
									folder: boolean;
									path: string;
									size: number;
									ts: number;
									uid: number;
								}
							];
							more: boolean;
						}>;
						showVersionHistory(path: string): Promise<void>;
					};
				};
			};
		};
	}
}
