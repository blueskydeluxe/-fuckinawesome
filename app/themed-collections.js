'use client';
import {useEffect,useRef,useState} from 'react';
import {db} from '../lib/supabase';
import {withDeadline} from '../lib/request-deadline.mjs';
import {eligibleCollectionRows} from '../lib/themed-collections.mjs';
import {cardImageUrl} from '../lib/card-image.mjs';
export function CollectionTile({collection,onOpen,userId,votes={}}){
 const [rows,setRows]=useState([]),[cast,setCast]=useState({});
 useEffect(()=>{setRows([]);setCast({});if(!collection||!db)return;let active=true;withDeadline(()=>Promise.all([db.from('discoveries').select('*').in('id',collection.ids).eq('status','approved'),userId?db.from('votes').select('submission_id,value').eq('user_id',userId).in('submission_id',collection.ids):Promise.resolve({data:[]})]),8000).then(([finds,judged])=>{if(active&&!finds.error&&!judged.error){setRows(finds.data||[]);setCast(Object.fromEntries((judged.data||[]).map(x=>[x.submission_id,x.value])))}}).catch(()=>{});return()=>{active=false}},[collection?.slug,userId]);
 const fresh=eligibleCollectionRows(collection,rows,{...cast,...votes});
 if(fresh.length<3)return null;
 return <article className="collection-tile"><button onClick={()=>onOpen({...collection,rows:fresh})} aria-label={'Try collection: '+collection.title}><span className="collection-collage" aria-hidden="true">{fresh.slice(0,3).map(x=><img key={x.id} src={cardImageUrl(x.id,320)} alt="" loading="lazy" onError={()=>setRows(current=>current.filter(row=>row.id!==x.id))}/>)}</span><span className="collection-tile-copy"><small>NEW VERDICTS TO MAKE</small><strong>{collection.title}</strong><span>Judge these {fresh.length} →</span></span></button></article>;
}

export function CollectionPreview({collection,busy,message,onOpen,onStart,onClose,onShare}){
 const dialog=useRef(null);
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previous?.focus()}},[]);
 return <dialog ref={dialog} className="discovery-dialog collection-preview" onClose={onClose} aria-labelledby="collection-title"><div className="viewer-navigation"><button autoFocus className="close" aria-label="Close collection" onClick={onClose}>×</button></div><div className="discovery-dialog-copy"><span className="eyebrow">A COLLECTION. YOUR VERDICT.</span><h2 id="collection-title">{collection.title}</h2><p>{collection.description}</p><div className="collection-preview-grid">{collection.rows.map(x=><figure key={x.id}><button className="collection-discovery" onClick={()=>onOpen(x)} aria-label={'Open discovery: '+x.title}><img src={cardImageUrl(x.id,320)} alt=""/><span>{x.title}</span></button></figure>)}</div><p>Swipe right for Awesome, left for Bullshit, or tap Meh. Your votes count on the original discoveries. Anything you already voted on is skipped.</p><p role="status" aria-live="polite">{message}</p><div className="actions"><button className="primary" disabled={busy} onClick={onStart}>{busy?'Opening discoveries…':'Start swiping'}</button><button disabled={busy} onClick={onShare}>Share collection ↗</button></div></div><style jsx>{`.collection-discovery{display:block;width:100%;padding:0;background:none;border:0;text-align:left;color:#d9dfe7;border-radius:6px}.collection-discovery span{display:block;font-size:12px;line-height:1.35;margin-top:6px}.collection-discovery:focus-visible{outline:2px solid #ff8b32;outline-offset:4px}`}</style></dialog>;
}
export async function readyCovers(rows){
 const outcomes=await Promise.all(rows.map(async item=>{const image=new Image();try{await withDeadline(()=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=cardImageUrl(item.id,640)}),5000);return item}catch{return null}finally{image.onload=null;image.onerror=null}}));return outcomes.filter(Boolean);
}
