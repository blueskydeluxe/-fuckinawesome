'use client';
import {useEffect,useState,useRef} from 'react';
import {discoveryPhotoUrl} from '../lib/discovery-photo-url';
export default function DiscoveryPhoto({path,title,onOpen,discoveryId,sourceUrl}){
 const imageRef=useRef(null),[nearby,setNearby]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){setNearby(true);observer.disconnect()}},{rootMargin:'500px'});if(imageRef.current)observer.observe(imageRef.current);return()=>observer.disconnect()},[]);
 const [video,setVideo]=useState(false);
 useEffect(()=>{if(!nearby||!sourceUrl||!discoveryId)return;const controller=new AbortController();fetch(`/api/preview/${discoveryId}`,{signal:controller.signal}).then(r=>r.ok?r.json():{}).then(data=>setVideo(!!data.video)).catch(()=>{});return()=>controller.abort()},[nearby,sourceUrl,discoveryId]);
 const [url,setUrl]=useState(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[expanded,setExpanded]=useState(false);
 const lightbox=useRef(null);
 useEffect(()=>{if(expanded)lightbox.current?.showModal();else lightbox.current?.close()},[expanded]);
 useEffect(()=>{if(!nearby)return;let active=true;setError(false);discoveryPhotoUrl(path,attempt>0).then(url=>{if(active){setUrl(url);setError(!url)}}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[nearby,path,attempt]);
 return <><div className="discovery-image" ref={imageRef}>{url?<button className="photo-open" aria-label={`View photo: ${title}`} onClick={()=>{if(onOpen){onOpen();return}setExpanded(true);setAttempt(x=>x+1)}}><img src={url} alt={title} loading="lazy" decoding="async" onError={()=>setError(true)}/>{video&&<span className="preview-play" aria-hidden="true">▶</span>}</button>:<p className="muted">{error?'Photo unavailable.':'Loading photo…'}</p>}{error&&<button onClick={()=>setAttempt(x=>x+1)}>Retry photo</button>}</div><dialog ref={lightbox} className="photo-lightbox" aria-label={title} onClose={()=>setExpanded(false)}><button autoFocus className="close" aria-label="Close photo" onClick={()=>setExpanded(false)}>×</button>{url&&<img src={url} alt={title}/>}</dialog></>
}


