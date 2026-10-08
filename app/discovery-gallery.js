'use client';
import {useEffect,useLayoutEffect,useState,useRef} from 'react';
import {galleryPosition,galleryRelease} from '../lib/gallery-motion.mjs';
export default function DiscoveryGallery({id,title,cover,embed,loading,source}){
 const [images,setImages]=useState([]),[selected,setSelected]=useState('cover'),[playing,setPlaying]=useState(false),[coverFailed,setCoverFailed]=useState(false);
 const track=useRef(null),mouse=useRef(null),scrolling=useRef(false),settleTimer=useRef(null);
 useEffect(()=>{if(!source)return;let active=true;const controller=new AbortController(),pending=new Set();
  fetch(`/api/preview/${id}?gallery=1`,{signal:controller.signal}).then(r=>r.ok?r.json():{images:[]}).then(async data=>{
   const entries=Array.isArray(data.images)?data.images.slice(0,24):[];let cursor=0;
   async function worker(){while(active&&cursor<entries.length){const index=cursor++,entry=entries[index];if(!entry.src?.startsWith(`/api/preview/${id}?gallery=1&index=`))continue;
    await new Promise(resolve=>{const img=new Image();pending.add(img);img.onload=()=>{pending.delete(img);if(active)setImages(old=>[...old,{...entry,index}]);resolve()};img.onerror=()=>{pending.delete(img);resolve()};img.src=entry.src});
   }}await Promise.all([worker(),worker(),worker()]);
  }).catch(()=>{});
  return()=>{active=false;controller.abort();for(const img of pending){img.onload=null;img.onerror=null;img.src=''}};
 },[id,source]);
 const slides=[...(cover&&!coverFailed?[{key:'cover',src:cover,alt:title,source:null}]:[]),...images.map(x=>({...x,key:String(x.index)}))];
 const position=Math.max(0,slides.findIndex(x=>x.key===selected)),slide=slides[position];
 const layout=slides.map(x=>x.key).join(',');
 useLayoutEffect(()=>{const el=track.current;if(el&&!scrolling.current&&!mouse.current)el.scrollLeft=position*el.clientWidth},[layout]);
 useEffect(()=>{const el=track.current;if(!el)return;const observer=new ResizeObserver(()=>{if(!mouse.current&&!scrolling.current){const current=el.querySelector('[data-current="true"]');if(current)el.scrollLeft=current.offsetLeft}});observer.observe(el);return()=>{observer.disconnect();clearTimeout(settleTimer.current)}},[!!slide]);
 function finish(){scrolling.current=false;if(track.current&&!mouse.current){track.current.style.scrollSnapType='';track.current.style.scrollBehavior='';delete track.current.dataset.dragging}}
 function scroll(e){const el=e.currentTarget;scrolling.current=true;const index=galleryPosition(el.scrollLeft,el.clientWidth,slides.length);if(slides[index]&&slides[index].key!==selected){setSelected(slides[index].key);setPlaying(false)}clearTimeout(settleTimer.current);settleTimer.current=setTimeout(finish,160)}
 function go(index){const el=track.current;if(!el||!slides[index])return;setPlaying(false);el.scrollTo({left:index*el.clientWidth,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
 function release(e,cancel=false){const t=mouse.current;if(!t)return;mouse.current=null;const el=e.currentTarget;delete el.dataset.dragging;if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);const dx=e.clientX-t.x,next=cancel?t.start:galleryRelease(t.start,dx,t.velocity,el.clientWidth,slides.length);go(next);clearTimeout(settleTimer.current);settleTimer.current=setTimeout(finish,400)}
 return <>
  <div className="discovery-dialog-media" data-no-swipe={slides.length>1?'':undefined}>
   {slide?<div ref={track} className="gallery-track" role="region" aria-roledescription="carousel" aria-label={`${title} pictures`} tabIndex={slides.length>1?0:-1} onScroll={scroll} onDragStart={e=>e.preventDefault()} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();go(position+(e.key==='ArrowRight'?1:-1))}}}
    onPointerDown={e=>{if(e.pointerType!=='mouse'||e.button!==0||slides.length<2||e.target.closest('button,a,iframe'))return;const el=e.currentTarget;e.preventDefault();el.focus({preventScroll:true});el.setPointerCapture(e.pointerId);mouse.current={x:e.clientX,left:el.scrollLeft,start:position,lastX:e.clientX,lastTime:e.timeStamp,velocity:0};el.style.scrollSnapType='none';el.style.scrollBehavior='auto';el.dataset.dragging='true'}}
    onPointerMove={e=>{const t=mouse.current;if(!t)return;const elapsed=e.timeStamp-t.lastTime;if(elapsed>0)t.velocity=(e.clientX-t.lastX)/elapsed;t.lastX=e.clientX;t.lastTime=e.timeStamp;e.currentTarget.scrollLeft=t.left-(e.clientX-t.x)}} onPointerUp={e=>release(e)} onPointerCancel={e=>release(e,true)}>
    {slides.map(x=><div className="gallery-slide" key={x.key} data-current={x.key===slide.key?'true':undefined} aria-hidden={x.key!==slide.key}>
     {playing&&embed&&x.key==='cover'?<iframe src={embed} title={`Video: ${title}`} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<img src={x.src} alt={x.alt||title} draggable={false} onError={()=>{if(x.key==='cover')setCoverFailed(true);else setImages(old=>old.filter(image=>String(image.index)!==x.key));if(selected===x.key)setSelected('cover')}}/>}
     {embed&&x.key==='cover'&&!playing&&<button className="dialog-play" onClick={()=>setPlaying(true)}>▶ Watch video here</button>}
    </div>)}
   </div>:playing&&embed?<iframe src={embed} title={`Video: ${title}`} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className="dialog-media-missing"><p>{loading?'Loading discovery…':'This site doesn’t provide a viewable preview.'}</p>{embed&&<button onClick={()=>setPlaying(true)}>▶ Watch video here</button>}</div>}
  </div>
  {slides.length>1&&<div className="gallery-dots" role="img" aria-label={`Picture ${position+1} of ${slides.length}`}>{slides.map((x,i)=><span key={x.key} className={i===position?'is-current':''} aria-hidden="true"/>)}</div>}
  {slide?.source&&<a className="gallery-credit" href={slide.source} target="_blank" rel="noopener noreferrer">Image source & credits ↗</a>}
  <style jsx>{`
   .gallery-dots{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;padding:12px 8px;background:#101318;pointer-events:none}
   .gallery-dots span{width:6px;height:6px;border-radius:50%;background:#6f7680;transition:background 120ms,transform 120ms}
   .gallery-dots span.is-current{background:#ff8b32;transform:scale(1.2)}
   .discovery-dialog-media[data-no-swipe]{touch-action:pan-x pan-y}
   .gallery-track{position:relative;display:flex;width:100%;height:clamp(220px,50dvh,600px);overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;cursor:grab}
   .gallery-track::-webkit-scrollbar{display:none}.gallery-track[data-dragging]{cursor:grabbing;user-select:none}
   .gallery-slide{position:relative;flex:0 0 100%;width:100%;height:100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always}
   .gallery-slide img{display:block;width:100%;height:100%;max-height:none;object-fit:contain;-webkit-user-drag:none}
   .gallery-slide iframe{width:100%;height:100%;min-height:0;aspect-ratio:auto}
   .gallery-track:focus-visible{outline:2px solid #ff8b32;outline-offset:-2px}
   .gallery-credit{display:block;text-align:center;color:#aeb7c4;font-size:11px;padding:0 12px 10px;background:#101318}
  `}</style>
 </>;
}
