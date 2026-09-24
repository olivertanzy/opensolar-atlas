const fs=require('node:fs');
const path=require('node:path');
const MarkdownIt=require('markdown-it');

const documentSources=['README.md','README.zh-CN.md','CONTRIBUTING.md','THIRD_PARTY.md','docs/DATA.md','docs/ARCHITECTURE.md','docs/OPEN_SOURCE.md','docs/EARTH.md','docs/ADDING_A_MODEL.md','docs/ADDING_A_MODEL.zh-CN.md'];
documentSources.push('src/modules/human-anatomy/README.md');

function renderDocument(source,name){
 const md=new MarkdownIt({html:false,linkify:false});
 const escape=md.utils.escapeHtml,zh=name.includes('zh-CN'),lang=zh?'zh-CN':'en';
 const depth=name.split('/').length-1,base=depth?'../'.repeat(depth):'./';
 const tokens=md.parse(source,{}),headings=[];let title='OpenSolar Atlas',section=0;
 for(let i=0;i<tokens.length;i++){
  if(tokens[i].type==='heading_open'){
   const text=tokens[i+1].content;
   if(tokens[i].tag==='h1')title=text;
   if(tokens[i].tag==='h2'){const id=`section-${++section}`;tokens[i].attrSet('id',id);headings.push({id,text});}
  }
 }
 // Rewrite only links whose Markdown targets are actually published by this build.
 const linkOpen=md.renderer.rules.link_open||((tokens,index,options,env,self)=>self.renderToken(tokens,index,options));
 md.renderer.rules.link_open=(tokens,index,options,env,self)=>{
  const token=tokens[index],href=token.attrGet('href')||'',match=href.match(/^([^?#]+\.md)([?#].*)?$/);
  if(match&&!/^(?:[a-z]+:|\/)/i.test(href)){
   const target=path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1]));
   if(documentSources.includes(target))token.attrSet('href',match[1].replace(/\.md$/,'.html')+(match[2]||''));
  }
  return linkOpen(tokens,index,options,env,self);
 };
 const body=md.renderer.render(tokens,md.options,{});
 const languageLinks=name.startsWith('docs/ADDING_A_MODEL')?'<a href="ADDING_A_MODEL.html" lang="en">English</a><a href="ADDING_A_MODEL.zh-CN.html" lang="zh-CN">简体中文</a>':'';
 return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · OpenSolar Atlas</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#09121b;color:#dce7ee;font:15px/1.85 system-ui,'Microsoft YaHei',sans-serif}a{color:#a0e1d0;text-decoration:none}a:hover{text-decoration:underline}a:focus-visible,summary:focus-visible{outline:2px solid #a0e1d0;outline-offset:5px}.doc-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px max(24px,calc((100% - 1180px)/2));border-bottom:1px solid #2b3b48;background:#0c1823}.doc-header>a{font-size:18px;font-weight:600;white-space:nowrap}.doc-header nav{display:flex;gap:20px;flex-wrap:wrap;font-size:12px}.doc-layout{max-width:1180px;margin:42px auto;padding:0 24px;display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:60px}article{min-width:0}h1{font-size:34px;line-height:1.4;letter-spacing:-.6px;font-weight:600;margin:0 0 24px;color:#f0f7f6}h2{font-size:23px;margin:42px 0 18px;padding-top:18px;border-top:1px solid #2b3b48;scroll-margin-top:20px}h3{font-size:18px;margin-top:28px}p{margin:14px 0}ul,ol{padding-left:24px}li{margin:7px 0}strong{color:#eef7f5}code{font:13px/1.8 Consolas,'Cascadia Code',monospace;overflow-wrap:anywhere;background:#162936;padding:2px 5px;border-radius:4px;color:#bfe8dc}pre{background:#061019;border:1px solid #2b4351;padding:19px 21px;border-radius:9px;overflow-x:auto;line-height:1.8}pre code{padding:0;background:none;overflow-wrap:normal;white-space:pre;border-radius:0}table{display:block;width:100%;overflow-x:auto;border-collapse:collapse;font-size:13px;margin:22px 0}th,td{border:1px solid #2d4351;padding:11px 14px;text-align:left;vertical-align:top}th{background:#152735;color:#eaf4f2}td{background:#0d1c28}img{max-width:100%;height:auto;border-radius:9px}blockquote{border-left:3px solid #699c90;padding-left:20px;color:#b7cad2}.doc-toc{position:sticky;top:26px;align-self:start;font-size:12px;border-left:1px solid #304651;padding-left:20px}.doc-toc strong{display:block;font-size:13px;margin-bottom:14px}.doc-toc a{display:block;margin:10px 0;color:#a8beca}.source-link{display:block;margin-top:35px;padding-top:18px;border-top:1px solid #2b3b48;font-size:12px;color:#9ab6c1}article>p:first-of-type{font-size:12px;color:#8ca6b4}.doc-footer{font-size:12px;color:#86a3b4;border-top:1px solid #2b3b48;margin-top:45px;padding-top:20px}
@media(max-width:800px){.doc-layout{display:block;margin:26px auto;padding:0 20px}.doc-toc{position:static;border-left:0;border-top:1px solid #304651;padding:20px 0;margin-top:30px}.doc-header{padding:16px 20px;flex-wrap:wrap;gap:10px}.doc-header nav{gap:16px}h1{font-size:27px}h2{font-size:21px}body{font-size:14px}pre{padding:14px}th,td{padding:9px 11px}}
</style></head><body>
<header class="doc-header"><a href="${base}?view=library&lang=${lang}">OpenSolar Atlas</a><nav aria-label="${zh?'文档导航':'Document navigation'}"><a href="${base}?view=guide&lang=${lang}">${zh?'贡献指南':'Contributor guide'}</a>${languageLinks}</nav></header>
<div class="doc-layout"><article>${body}<a class="source-link" href="${escape(path.posix.basename(name))}" download>${zh?'下载 Markdown 源文件':'Download Markdown source'}</a><p class="doc-footer">OpenSolar Atlas · ${zh?'开源 3D 模型文档':'Open-source 3D model documentation'}</p></article><nav class="doc-toc" aria-label="${zh?'目录':'On this page'}"><strong>${zh?'本页目录':'On this page'}</strong>${headings.map(({id,text})=>`<a href="#${id}">${escape(text)}</a>`).join('')}</nav></div>
</body></html>`;
}

function writeDocumentPages(root,out){
 for(const name of documentSources){
  const source=fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,'');
  const target=path.join(out,name.replace(/\.md$/,'.html'));fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,renderDocument(source,name),'utf8');
  // Old direct .md URLs must also decode correctly on static hosts without a charset header.
  fs.writeFileSync(path.join(out,name),'\uFEFF'+source,'utf8');
 }
}

function documentMiddleware(root){
 return (req,res,next)=>{
  const pathname=new URL(req.url,'http://localhost').pathname.slice(1);
  const name=pathname.replace(/\.html$/,'.md');
  if(!documentSources.includes(name)||!(/\.(html|md)$/.test(pathname)))return next();
  const source=fs.readFileSync(path.join(root,name),'utf8');
  res.setHeader('Content-Type',pathname.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8');
  res.end(pathname.endsWith('.html')?renderDocument(source,name):source);
 };
}
module.exports={documentSources,renderDocument,writeDocumentPages,documentMiddleware};
