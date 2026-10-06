'use client';
import {useEffect,useRef,useState} from 'react';
import {db} from '../lib/supabase';
import {safeLink} from '../lib/ranking.mjs';
export default function DiscoveryDialog({item,onClose}){
 const dialog=useRef(null),[preview,setPreview]=useState(null),[photo,setPhoto]=useState(null),[playing,setPlaying]=useState(false),[imageFailed,setImageFailed]=useState(false);
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previous?.focus()}},[]);
 useEffect(()=>{let active=true;const controller=new AbortController();if(item.image_path){db.storage.from('discovery-photos').createSignedUrl(item.image_path,60).then(({data})=>{if(active){setPhoto(data?.signedUrl||null);if(!item.url)setPreview({})}})}if(item.url)fetch(`/api/preview/${item.id}`,{signal:controller.signal}).then(r=>r.ok?r.json():{}).then(data=>{if(active)setPreview(data)}).catch(()=>{if(active)setPreview({})});return()=>{active=false;controller.abort()}},[item.id,item.image_path,item.url]);
 const image=item.image_path?photo:preview?.available?`/api/preview/${item.id}?image=1`:null;
 const source=safeLink(item.url);
 return <dialog ref={dialog} className="discovery-dialog" aria-labelledby="discovery-dialog-title" onClose={onClose} onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
  <button autoFocus className="close" aria-label="Close discovery" onClick={onClose}>×</button>
  <div className="discovery-dialog-media">{playing&&preview?.embed?<iframe src={preview.embed} title={`Video: ${item.title}`} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:image&&!imageFailed?<><img src={image} alt={item.title} onError={()=>setImageFailed(true)}/>{preview?.embed&&<button className="dialog-play" onClick={()=>setPlaying(true)}>▶ Watch video here</button>}</>:<div className="dialog-media-missing"><p>{preview===null?'Loading discovery…':'This site doesn’t provide a viewable preview.'}</p>{preview?.embed&&<button onClick={()=>setPlaying(true)}>▶ Watch video here</button>}</div>}</div>
  <div className="discovery-dialog-copy"><div className="tag">{item.category}</div><h2 id="discovery-dialog-title">{item.title}</h2>{preview?.description&&<><h3>From the linked page</h3><p>{preview.description}</p></>}<h3>Why it’s fuckin awesome</h3><p>{item.description}</p>{source&&<><a className="button-link primary" href={source} target="_blank" rel="noopener noreferrer">Visit full site ↗</a>{preview?.video&&!preview?.embed&&<p className="muted">This source doesn’t support playback here. Watch on the full site.</p>}{playing&&<p className="muted">If the creator restricts playback, use Visit full site to watch.</p>}</>}<button className="dialog-back" onClick={onClose}>Back to the hall</button></div>
 </dialog>;
}

