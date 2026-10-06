'use client';
import {useEffect,useRef,useState} from 'react';
import PhotoPicker from './photo-picker';
import {preparePhoto} from '../lib/photo';
import {safeLink} from '../lib/ranking.mjs';
import {db} from '../lib/supabase';
const categories=['Other','Architecture','Technology','Adventure','Food','Machines','Art'];
export default function QuickDiscovery({photo,onPhoto,onKind,onSubmit,busy}){
 const [url,setUrl]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[checking,setChecking]=useState(false),[message,setMessage]=useState('');
 const version=useRef(0),timer=useRef(null),edited=useRef({title:false,description:false});
 const link=safeLink(url),fallback=link?'Discovery from '+new URL(link).hostname.replace(/^www\./,''):'A fuckin awesome find';
 useEffect(()=>{const attempt=++version.current;setChecking(false);setMessage('');setTitle('');setDescription('');edited.current={title:false,description:false};
  if(link)timer.current=setTimeout(async()=>{setChecking(true);try{const {data}=await db.auth.getSession();const options={method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(data.session?.access_token||'')},body:JSON.stringify({url:link,mode:'details'})};const response=await fetch('/api/preview',options);if(!response.ok)throw Error(response.status===401?'Sign in again to check this link.':response.status===429?'Preview checks are busy. Add a screenshot to keep going.':'We couldn’t read this link. Add a screenshot to keep going.');const metadata=await response.json();if(version.current!==attempt)return;
   if(!edited.current.title&&metadata.title)setTitle(metadata.title);if(!edited.current.description&&metadata.description)setDescription(metadata.description);
   if(!metadata.hasImage){setMessage('This site keeps its preview private. Add a screenshot or photo—no description needed.');return}
   const image=await fetch('/api/preview',{...options,body:JSON.stringify({url:link})});if(!image.ok)throw Error('The cover couldn’t load. Add a screenshot or photo—no description needed.');const blob=await image.blob();const prepared=await preparePhoto(new File([blob],'cover.jpg',{type:blob.type}));if(version.current===attempt){onPhoto(prepared);setMessage('Preview ready. Looks good? Share it.');}
  }catch(error){if(version.current===attempt)setMessage(error.message)}finally{if(version.current===attempt)setChecking(false)}},800);
  return()=>{clearTimeout(timer.current);version.current++};
 },[url]);
 function choosePhoto(file){clearTimeout(timer.current);version.current++;setChecking(false);setMessage('');onPhoto(file);onKind(link?'link':'photo')}
 async function pastePhoto(file){const attempt=++version.current;clearTimeout(timer.current);setChecking(true);setMessage('');try{const prepared=await preparePhoto(file);if(version.current===attempt){onPhoto(prepared);onKind(link?'link':'photo');}}catch(error){if(version.current===attempt)setMessage(error.message)}finally{if(version.current===attempt)setChecking(false)}}
 function changeLink(value){version.current++;setUrl(value);onPhoto(null);onKind(value.trim()?'link':'photo')}
 return <form className="quick-discovery" onSubmit={onSubmit} onPaste={e=>{const file=[...(e.clipboardData?.files||[])].find(x=>x.type.startsWith('image/'));if(file&&!busy){e.preventDefault();pastePhoto(file)}}} onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={e=>{const file=[...e.dataTransfer.files].find(x=>x.type.startsWith('image/'));if(file){e.preventDefault();if(!busy)pastePhoto(file)}}}>
  <p>Paste a link. We’ll do the rest. Or share a photo.</p><label>Link<input autoFocus name="url" type="url" value={url} maxLength={2048} placeholder="Paste what you found…" disabled={busy} onChange={e=>changeLink(e.target.value)}/></label>
  {checking&&<p role="status">Building your preview…</p>}{message&&<p className="quick-status" role="status">{message}</p>}
  <PhotoPicker compact photo={photo} onPhoto={choosePhoto} disabled={busy}/>
  {photo&&<label>Title <span className="muted">— edit if you like</span><input name="title" value={title||fallback} onChange={e=>{edited.current.title=true;setTitle(e.target.value)}} required minLength={5} maxLength={140} disabled={busy}/></label>}
  <details className="quick-details"><summary>Add a description or category <span className="muted">(optional)</span></summary><label>Description<textarea name="description" value={description} maxLength={1000} disabled={busy} onChange={e=>{edited.current.description=true;setDescription(e.target.value)}}/></label><label>Category<select name="category" disabled={busy}>{categories.map(x=><option key={x}>{x}</option>)}</select></label></details>
  <p className="muted quick-note">Share the original source and images you have permission to share. Reviewed before going live.</p><button className="primary quick-submit" disabled={busy||checking||!photo||!!url.trim()&&!link}>{busy?'Sharing…':'Share this discovery'} ↗</button>
 </form>;
}
