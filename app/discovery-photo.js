'use client';
import {useEffect,useState,useRef} from 'react';
import {discoveryPhotoUrl} from '../lib/discovery-photo-url';
import {cardImageUrl,videoSource} from '../lib/card-image.mjs';
export default function DiscoveryPhoto({path,title,onOpen,discoveryId,sourceUrl}){
 const imageRef=useRef(null),[nearby,setNearby]=useState(false),[frameWidth,setFrameWidth]=useState(380),[url,setUrl]=useState(null),[error,setError]=useState(false),[fallback,setFallback]=useState(false),[attempt,setAttempt]=useState(0),[expanded,setExpanded]=useState(false);
 const lightbox=useRef(null);
 useEffect(()=>{const size=new ResizeObserver(entries=>{const width=entries[0]?.contentRect.width;if(width)setFrameWidth(Math.ceil(width))});if(imageRef.current)size.observe(imageRef.current);return()=>size.disconnect()},[]);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){setNearby(true);observer.disconnect()}},{rootMargin:'700px'});if(imageRef.current)observer.observe(imageRef.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{setFallback(false);setError(false)},[path,discoveryId]);
 useEffect(()=>{if(expanded)lightbox.current?.showModal();else lightbox.current?.close()},[expanded]);
 useEffect(()=>{if(!nearby)return;let active=true;setError(false);if(discoveryId&&!fallback){setUrl(cardImageUrl(discoveryId));return;}discoveryPhotoUrl(path,attempt>0).then(next=>{if(active){setUrl(next);setError(!next)}}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[nearby,path,discoveryId,fallback,attempt]);
 function failed(){if(discoveryId&&!fallback){setFallback(true);setUrl(null)}else setError(true)}
 return <><div className="discovery-image" ref={imageRef}>{url?<button className="photo-open" aria-label={'View photo: '+title} onClick={()=>{if(onOpen){onOpen();return}setExpanded(true)}}><img src={url} srcSet={discoveryId&&!fallback?cardImageUrl(discoveryId,320)+' 320w, '+cardImageUrl(discoveryId,640)+' 640w, '+cardImageUrl(discoveryId,960)+' 960w':undefined} sizes={frameWidth+'px'} alt={title} loading="eager" decoding="async" onError={failed}/>{videoSource(sourceUrl)&&<span className="preview-play" aria-hidden="true">▶</span>}</button>:<p className="muted">{error?'Photo unavailable.':'Loading photo…'}</p>}{error&&<button onClick={()=>setAttempt(x=>x+1)}>Retry photo</button>}</div><dialog ref={lightbox} className="photo-lightbox" aria-label={title} onClose={()=>setExpanded(false)}><button autoFocus className="close" aria-label="Close photo" onClick={()=>setExpanded(false)}>×</button>{url&&<img src={url} alt={title}/>}</dialog></>
}
