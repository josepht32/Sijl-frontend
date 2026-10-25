/// <reference types="vite/client" />
/// <reference types="jquery" />

interface Window {
  jQuery: JQueryStatic;
  $: JQueryStatic;
}

interface JQuery {
  summernote(options?: Record<string, unknown>): JQuery;
  summernote(command: string, ...args: unknown[]): unknown;
}

declare module 'summernote/dist/summernote-lite.js';
declare module 'summernote/dist/lang/summernote-ar-AR.js';
