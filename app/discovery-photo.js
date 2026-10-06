'use client';
import {useEffect,useState,useRef} from 'react';
import {db} from '../lib/supabase';
export default function DiscoveryPhoto({path,title,onOpen}){
 const [url,setUrl]=useState(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[expanded,setExpanded]=useState(false);
 const lightbox=useRef(null);
 useEffect(()=>{if(expanded)lightbox.current?.showModal();else lightbox.current?.close()},[expanded]);
 useEffect(()=>{let active=true;setUrl(null);setError(false);db.storage.from('discovery-photos').createSignedUrl(path,60).then(({data,error})=>{if(active){setUrl(data?.signedUrl||null);setError(!!error)}});return()=>{active=false}},[path,attempt]);
 return <><div className="discovery-image">{url?<button className="photo-open" aria-label={`View photo: ${title}`} onClick={()=>{if(onOpen){onOpen();return}setExpanded(true);setAttempt(x=>x+1)}}><img src={url} alt={title} loading="lazy" onError={()=>setError(true)}/></button>:<p className="muted">{error?'Photo unavailable.':'Loading photo…'}</p>}{error&&<button onClick={()=>setAttempt(x=>x+1)}>Retry photo</button>}</div><dialog ref={lightbox} className="photo-lightbox" aria-label={title} onClose={()=>setExpanded(false)}><button autoFocus className="close" aria-label="Close photo" onClick={()=>setExpanded(false)}>×</button>{url&&<img src={url} alt={title}/>}</dialog></>
}

