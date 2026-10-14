// Shared by the editor and public runtime. Transform templates before React renders them.
(() => {
 const tags=/<(?:!--[\s\S]*?--|[^>"']|"[^"]*"|'[^']*')*>/g;
 const attr=(raw,name)=>raw.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1];
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function nodes(html){const stack=[],result=[];for(const m of html.matchAll(tags)){const tag=m[0].match(/^<\/?([\w-]+)/)?.[1]?.toLowerCase();if(!tag)continue;if(/^<\//.test(m[0])){const i=stack.map(n=>n.tag).lastIndexOf(tag);if(i>=0){const node=stack[i];node.end=m.index+m[0].length;stack.splice(i);}continue;}const node={tag,raw:m[0],start:m.index,openEnd:m.index+m[0].length,end:m.index+m[0].length,parent:stack.at(-1)};result.push(node);if(!/\/\s*>$/.test(m[0])&&!['img','input','br','hr','meta','link','area','base','source','wbr'].includes(tag))stack.push(node);}return result;}
 function suffix(id){return id.includes('--copy-')?id.slice(id.indexOf('--copy-')):'';}
 function href(link){if(link.type==='page')return link.page;if(link.type==='section')return link.page+'#ksa-section-'+link.section;return link.url;}
 function transform(html,doc){
  if(!doc)return html;
  const all=nodes(html),sections=all.filter(n=>attr(n.raw,'data-cms-section-template')),groups=new Map();
  for(const node of sections){const page=attr(node.raw,'data-cms-page'),group=attr(node.raw,'data-cms-group'),key=page+'|'+group;if(!groups.has(key))groups.set(key,{page,group,nodes:[]});groups.get(key).nodes.push(node);}
  const replacements=[];
  for(const {page,group,nodes:items}of groups.values()){
   const layout=doc.sections?.[page];if(!Array.isArray(layout))continue;
   const originals=new Map(items.map(n=>[attr(n.raw,'data-cms-section-template'),n]));
   const desired=layout.filter(item=>originals.has(item.source));let content='';
   for(const item of desired){const node=originals.get(item.source),tail=suffix(item.id);let value=html.slice(node.start,node.end);
    value=value.replace(/data-cms-section="[^"]*"/g,'data-cms-section="'+escape(item.id)+'"');
    if(tail){value=value.replace(/\b(data-cms-text|data-cms-link|id|data-gallery)="([^"]*)"/g,(m,k,v)=>k+'="'+v+tail+'"').replace(/\b(href|for|aria-controls|aria-labelledby)="([^"]*)"/g,(m,k,v)=>k+'="'+(k==='href'?(v.startsWith('#')?v+tail:v):v+tail)+'"');}
    content+=value+'\n';
   }
   // Replace only section ranges, preserving styles, imports and other surrounding content.
   items.forEach((node,i)=>replacements.push({start:node.start,end:node.end,text:i===0?content:''}));
  }
  for(const r of replacements.sort((a,b)=>b.start-a.start))html=html.slice(0,r.start)+r.text+html.slice(r.end);
  html=html.replace(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>/g,raw=>{const id=attr(raw,'data-cms-link'),link=doc.links?.[id];if(!link)return raw;raw=raw.replace(/\bhref="[^"]*"/,'href="'+escape(href(link))+'"');if(link.type!=='custom')raw=/\btarget="/.test(raw)?raw.replace(/\btarget="[^"]*"/,'target="_self"'):raw.replace(/>$/,' target="_self">');return raw;});
  return html;
 }
 window.KsaContentLayout={nodes,attr,suffix,href,transform};
})();

(() => {
  if(window.__ksaContentReady)return;
  window.__ksaSetContentText=(el,text)=>{
    const initial=el.querySelector(':scope > [data-cms-initial]'),rest=el.querySelector(':scope > [data-cms-rest]');
    if(initial&&rest){const first=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)[Symbol.iterator]().next().value?.segment||'':Array.from(text)[0]||'';
      const tail=el.hasAttribute('data-cms-leading-hidden')?text:text.slice(first.length);
      if(initial.textContent!==first)initial.textContent=first;if(rest.textContent!==tail)rest.textContent=tail;
    }else if(el.textContent!==text)el.textContent=text;
  };
  const endpoint='https://ksa-staff-database.reineaissance.workers.dev/api/site-content';
  window.__ksaContentEndpoint=endpoint;
  window.__ksaContentReady=(window.__ksaPreviewContent?Promise.resolve(window.__ksaPreviewContent):fetch(endpoint,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(3500)}).then(r=>r.ok?r.json():null).catch(()=>null)).then(doc=>{
    window.__ksaActiveContent=doc;
    if(Object.values(doc?.sections||{}).some(items=>items.some(item=>item.id.includes('--copy-')))){
      // Existing carousel handlers address their original IDs. Resolve those IDs in
      // the clicked copy, or in a surviving copy when the original was removed.
      const find=document.getElementById.bind(document);let activeSuffix='';
      document.getElementById=id=>{const name=String(id);return activeSuffix&&!name.includes('--copy-')&&find(name+activeSuffix)||find(name)||document.querySelector('[id^="'+CSS.escape(name)+'--copy-"]');};
      document.addEventListener('click',event=>{const section=event.composedPath().find(el=>el?.dataset?.cmsSection);activeSuffix=section?window.KsaContentLayout.suffix(section.dataset.cmsSection):'';queueMicrotask(()=>{activeSuffix='';});},true);
    }
    const values=doc?.texts||{};
    const apply=()=>{for(const el of document.querySelectorAll('[data-cms-text]')){const id=el.getAttribute('data-cms-text');if(typeof values[id]==='string')window.__ksaSetContentText(el,values[id]);}for(const el of document.querySelectorAll('[data-cms-link]')){const link=doc?.links?.[el.dataset.cmsLink];if(link){const url=window.KsaContentLayout.href(link);if(el.getAttribute('href')!==url)el.setAttribute('href',url);}}};
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply();});}).observe(document,{subtree:true,childList:true,characterData:true});
    apply();return doc;
  });
})();
