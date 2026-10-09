'use client';
import {useEffect,useRef,useState} from 'react';
import {db} from '../lib/supabase';
import {withDeadline} from '../lib/request-deadline.mjs';
import {eligibleCollectionRows} from '../lib/themed-collections.mjs';
import {cardImageUrl} from '../lib/card-image.mjs';
export function CollectionTile({collection,onOpen}){
 const [rows,setRows]=useState([]);
 useEffect(()=>{setRows([]);if(!collection||!db)return;let active=true;withDeadline(()=>db.from('discoveries').select('*').in('id',collection.ids).eq('status','approved'),8000).then(({data,error})=>{if(active&&!error)setRows(eligibleCollectionRows(collection,data||[]))}).catch(()=>{});return()=>{active=false}},[collection?.slug]);
 if(rows.length<3)return null;
 return <article className="collection-tile"><button onClick={()=>onOpen({...collection,rows})} aria-label={'Try collection: '+collection.title}><span className="collection-collage" aria-hidden="true">{rows.slice(0,3).map(x=><img key={x.id} src={cardImageUrl(x.id,320)} alt="" loading="lazy" onError={()=>setRows(current=>current.filter(row=>row.id!==x.id))}/>)}</span><span className="collection-tile-copy"><small>TRY A COLLECTION</small><strong>{collection.title}</strong><span>Judge these {rows.length} →</span></span></button></article>;
}
export function CollectionPreview({collection,busy,onStart,onClose,onShare}){
 const dialog=useRef(null);
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previous?.focus()}},[]);
 return <dialog ref={dialog} className="discovery-dialog collection-preview" onClose={onClose} aria-labelledby="collection-title"><div className="viewer-navigation"><button autoFocus className="close" aria-label="Close collection" onClick={onClose}>×</button></div><div className="discovery-dialog-copy"><span className="eyebrow">A COLLECTION. YOUR VERDICT.</span><h2 id="collection-title">{collection.title}</h2><p>{collection.description}</p><div className="collection-preview-grid">{collection.rows.map(x=><figure key={x.id}><img src={cardImageUrl(x.id,320)} alt=""/><figcaption>{x.title}</figcaption></figure>)}</div><p>Swipe right for Awesome, left for Bullshit, or tap Meh. Your votes count on the original discoveries. Anything you already voted on is skipped.</p><div className="actions"><button className="primary" disabled={busy} onClick={onStart}>Start swiping</button><button disabled={busy} onClick={onShare}>Share collection ↗</button></div></div></dialog>;
}
export async function readyCovers(rows){
 const outcomes=await Promise.all(rows.map(async item=>{const image=new Image();try{await withDeadline(()=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=cardImageUrl(item.id,640)}),5000);return item}catch{return null}finally{image.onload=null;image.onerror=null}}));return outcomes.filter(Boolean);
}
