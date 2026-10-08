'use client';
import {useEffect,useState,useRef} from 'react';
export default function DiscoveryGallery({id,title,cover,embed,loading,source}){
 const [images,setImages]=useState([]),[selected,setSelected]=useState('cover'),[playing,setPlaying]=useState(false),[coverFailed,setCoverFailed]=useState(false);
 const touch=useRef(null);
 useEffect(()=>{if(!source)return;let active=true;const controller=new AbortController(),pending=new Set();
  fetch(`/api/preview/${id}?gallery=1`,{signal:controller.signal}).then(r=>r.ok?r.json():{images:[]}).then(async data=>{
   const entries=Array.isArray(data.images)?data.images.slice(0,24):[];let cursor=0;
   async function worker(){while(active&&cursor<entries.length){const index=cursor++,entry=entries[index];if(!entry.src?.startsWith(`/api/preview/${id}?gallery=1&index=`))continue;
    await new Promise(resolve=>{const img=new Image();pending.add(img);img.onload=()=>{pending.delete(img);if(active)setImages(old=>[...old,{...entry,index}].sort((a,b)=>a.index-b.index));resolve()};img.onerror=()=>{pending.delete(img);resolve()};img.src=entry.src});
   }}await Promise.all([worker(),worker(),worker()]);
  }).catch(()=>{});
  return()=>{active=false;controller.abort();for(const img of pending){img.onload=null;img.onerror=null;img.src=''}};
 },[id,source]);
 const slides=[...(cover&&!coverFailed?[{key:'cover',src:cover,alt:title,source:null}]:[]),...images.map(x=>({...x,key:String(x.index)}))];
 const position=Math.max(0,slides.findIndex(x=>x.key===selected)),slide=slides[position];
 function choose(key){setSelected(key);setPlaying(false)}
 return <>
  <div className="discovery-dialog-media" data-no-swipe={slides.length>1?'':undefined} onTouchStart={e=>{touch.current=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null}} onTouchCancel={()=>{touch.current=null}} onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start||e.touches.length||slides.length<2||playing)return;const finger=e.changedTouches[0],dx=finger.clientX-start.x,dy=finger.clientY-start.y;if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy)*1.5)return;const next=position+(dx<0?1:-1);if(slides[next])choose(slides[next].key)}}>
   {playing&&embed?<iframe src={embed} title={`Video: ${title}`} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:slide?<>
    <img key={slide.key} src={slide.src} alt={slide.alt||title} onError={()=>{if(slide.key==='cover')setCoverFailed(true);else setImages(old=>old.filter(x=>String(x.index)!==slide.key));setSelected('cover')}}/>
    {embed&&slide.key==='cover'&&<button className="dialog-play" onClick={()=>setPlaying(true)}>▶ Watch video here</button>}
    {slides.length>1&&<><button className="gallery-arrow gallery-back" aria-label="Previous picture" disabled={position===0} onClick={()=>choose(slides[position-1].key)}>‹</button><button className="gallery-arrow gallery-forward" aria-label="Next picture" disabled={position===slides.length-1} onClick={()=>choose(slides[position+1].key)}>›</button></>}
   </>:<div className="dialog-media-missing"><p>{loading?'Loading discovery…':'This site doesn’t provide a viewable preview.'}</p>{embed&&<button onClick={()=>setPlaying(true)}>▶ Watch video here</button>}</div>}
  </div>
  {slides.length>1&&<div className="gallery-dots" role="img" aria-label={`Picture ${position+1} of ${slides.length}`}>{slides.map((x,i)=><span key={x.key} className={i===position?'is-current':''} aria-hidden="true"/>)}</div>}
  {slide?.source&&<a className="gallery-credit" href={slide.source} target="_blank" rel="noopener noreferrer">Image source & credits ↗</a>}
  <style jsx>{`
   .gallery-dots{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;padding:12px 8px;background:#101318;pointer-events:none}
   .gallery-dots span{width:6px;height:6px;border-radius:50%;background:#6f7680;transition:background 120ms,transform 120ms}
   .gallery-dots span.is-current{background:#ff8b32;transform:scale(1.2)}
   .discovery-dialog-media[data-no-swipe]{touch-action:pan-y pinch-zoom}
   .gallery-arrow{position:absolute;top:50%;transform:translateY(-50%);display:grid;place-items:center;min-width:44px;height:44px;padding:0;border:1px solid #ffffff40;border-radius:50%;background:#0009;color:white;font-size:30px;line-height:1;box-shadow:none}
   .gallery-back{left:8px}.gallery-forward{right:8px}.gallery-arrow:disabled{visibility:hidden}
   .gallery-credit{display:block;text-align:center;color:#aeb7c4;font-size:11px;padding:0 12px 10px;background:#101318}
  `}</style>
 </>;
}
