'use client';
import {useEffect,useRef} from 'react';
export default function DeleteDiscoveryDialog({item,busy,message,onClose,onDelete}){
 const dialog=useRef(null);useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();return()=>previous?.focus()},[]);
 return <dialog ref={dialog} className="discovery-dialog delete-discovery-dialog" aria-labelledby="delete-discovery-title" onCancel={e=>{if(busy)e.preventDefault()}} onClose={onClose}><div className="discovery-dialog-copy"><h2 id="delete-discovery-title">Delete this discovery?</h2><p><strong>{item.title}</strong></p><p>It will disappear from the hall, your public profile, and shared discovery links. Its photo will become private. You can restore it from Deleted discoveries in My discoveries; restored items go back for review.</p><div className="actions"><button autoFocus disabled={busy} onClick={onClose}>Keep discovery</button><button className="primary" disabled={busy} onClick={onDelete}>{busy?'Deleting…':'Delete discovery'}</button></div>{message&&<p role="alert">{message}</p>}</div></dialog>;
}

