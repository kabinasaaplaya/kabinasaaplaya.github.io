const installed=new WeakSet();
export function initReviews(){
 const install=()=>{for(const section of document.querySelectorAll('.guest-reviews')){
  if(installed.has(section))continue;const row=section.querySelector('.guest-reviews-row'),previous=section.querySelector('[data-reviews-previous]'),next=section.querySelector('[data-reviews-next]');if(!row||!previous||!next)continue;installed.add(section);
  const update=()=>{previous.disabled=row.scrollLeft<2;next.disabled=row.scrollLeft>=row.scrollWidth-row.clientWidth-2;};
  const left=card=>card.getBoundingClientRect().left-row.getBoundingClientRect().left+row.scrollLeft;
  const move=direction=>{const cards=Array.from(row.children),target=direction>0?cards.find(card=>left(card)>row.scrollLeft+4):cards.slice().reverse().find(card=>left(card)<row.scrollLeft-4);if(target)row.scrollTo({left:left(target),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};
  previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  row.addEventListener('scroll',update,{passive:true});row.addEventListener('keydown',event=>{if(event.target!==row||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();if(event.key==='Home'||event.key==='End')row.scrollTo({left:event.key==='Home'?0:row.scrollWidth,behavior:'instant'});else move(event.key==='ArrowRight'?1:-1);});
  new ResizeObserver(update).observe(row);update();
 }};
 install();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;install();});}).observe(document,{childList:true,subtree:true});
}
