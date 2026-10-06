'use client';
import {useEffect,useRef,useState} from 'react';
import {safeLink} from '../lib/ranking.mjs';
export default function LinkPreview({id,url,title}){
 const ref=useRef(null),[preview,setPreview]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const controller=new AbortController();let started=false;const observer=new IntersectionObserver(entries=>{if(started||!entries.some(x=>x.isIntersecting))return;started=true;fetch(`/api/preview/${id}`,{signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>setPreview(data||{available:false})).catch(()=>{if(!controller.signal.aborted)setFailed(true)});observer.disconnect()},{rootMargin:'300px'});observer.observe(ref.current);return()=>{observer.disconnect();controller.abort()}},[id]);
 const available=preview?.available&&!failed;
 return <a ref={ref} className="tile-preview" href={safeLink(url)||'#'} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title}`}>
 {available?<><img src={`/api/preview/${id}?image=1`} alt={title} loading="lazy" onError={()=>setFailed(true)}/>{preview.video&&<span className="preview-play" aria-hidden="true">▶</span>}<span className="preview-source">{preview.video?'Watch video':'View discovery'} ↗</span></>:<span className="preview-missing"><strong>{preview===null&&!failed?'Loading preview…':'Preview unavailable'}</strong><span>{new URL(safeLink(url)||'https://example.com').hostname.replace(/^www\./,'')}</span><span>Open original ↗</span></span>}
 </a>;
}
