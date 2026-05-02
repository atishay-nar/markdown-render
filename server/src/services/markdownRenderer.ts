import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
// @ts-ignore – no types shipped with this plugin
import taskLists from "markdown-it-task-lists";

const md = new MarkdownIt({
  html: false,       // block raw HTML pass-through (security)
  linkify: true,     // auto-link bare URLs
  typographer: true, // smart quotes, dashes
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
  },
}).use(taskLists, { enabled: true, label: true });

export function renderMarkdown(source: string): string {
  return md.render(source);
}
