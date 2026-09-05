import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
let html = readFileSync(new URL("index.html", root), "utf8");
html = html.replace(
  /<!-- TEACHER WORKSPACE START -->[\s\S]*?<!-- TEACHER WORKSPACE END -->\s*/g,
  "",
);
html = html.replace(
  "window.__TB.boot();",
  "/* Boot runs after the offline workspace is registered. */",
);
html = html.replace(
  "window.__TB = {UI,I,svg,LS,",
  "window.__TB = {NAV,UI,I,svg,LS,",
);
const css = readFileSync(new URL("src/workspace.css", root), "utf8");
const js = readFileSync(new URL("src/workspace.js", root), "utf8");
if (/<\/script/i.test(js))
  throw new Error("Inline script closing tag in workspace source");
const block = `<!-- TEACHER WORKSPACE START -->\n<style>\n${css}\n</style>\n<script>\n${js}\nwindow.__TB.boot();\n</script>\n<!-- TEACHER WORKSPACE END -->\n`;
const closingBody = html.lastIndexOf("</body>");
if (closingBody < 0) throw new Error("Missing document body");
html = html.slice(0, closingBody) + block + html.slice(closingBody);
writeFileSync(new URL("index.html", root), html);
writeFileSync(new URL("TeacherBuddy.html", root), html);
const hash = createHash("sha256").update(html).digest("hex").slice(0, 12);
const worker = readFileSync(new URL("sw.js", root), "utf8").replace(
  /const CACHE = '[^']+';/,
  `const CACHE = 'teacherbuddy-v2-${hash}';`,
);
writeFileSync(new URL("sw.js", root), worker);
console.log("Built identical hosted and standalone offline pages.");
