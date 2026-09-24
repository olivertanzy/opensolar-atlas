import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import documents from './document-pages.cjs';
const {renderDocument,documentSources}=documents;
test('Chinese guide renders as UTF-8 HTML with real tables, headings and escaped Vue examples',()=>{
 const source=fs.readFileSync(new URL('../docs/ADDING_A_MODEL.zh-CN.md',import.meta.url),'utf8');
 const html=renderDocument(source,'docs/ADDING_A_MODEL.zh-CN.md');
 assert(html.includes('<meta charset="utf-8">'));
 assert(html.includes('<h1>如何新增一个 3D 主题模块</h1>'));
 assert(html.includes('<table>'));assert(html.includes('&lt;ModelWorkbench'));
 assert(!html.includes('\uFFFD'));
 assert(html.includes('href="ADDING_A_MODEL.html"'));assert(html.includes('href="ARCHITECTURE.html"'));
});
test('document code cannot become HTML and unsafe links are not executed',()=>{
 const html=renderDocument('# Example\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n```html\n<img src=x onerror=alert(1)>\n```','README.md');
 assert(!html.includes('<script>'));assert(!html.includes('<img src=x'));assert(!html.includes('href="javascript:'));
 assert(html.includes('&lt;script&gt;'));assert(html.includes('&lt;img'));
});
test('published document links are rendered while source-file and remote links are preserved',()=>{
 for(const name of documentSources)assert(fs.existsSync(new URL('../'+name,import.meta.url)));
 const html=renderDocument('[Chinese](docs/ADDING_A_MODEL.zh-CN.md) [Source](src/App.vue) [Remote](https://example.com/README.md)','README.md');
 assert(html.includes('href="docs/ADDING_A_MODEL.zh-CN.html"'));
 assert(html.includes('href="src/App.vue"'));assert(html.includes('href="https://example.com/README.md"'));
});
