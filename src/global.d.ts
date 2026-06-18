declare module 'hogan.js' {
	export class Template {}
	export class Context {}
	export interface Partials {
		[key: string]: Template;
	}
}
