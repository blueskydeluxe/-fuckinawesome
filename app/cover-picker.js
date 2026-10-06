'use client';
import {useEffect,useRef,useState} from 'react';
import PhotoPicker from './photo-picker';
import {preparePhoto} from '../lib/photo';
import {db} from '../lib/supabase';
import {safeLink} from '../lib/ranking.mjs';
export default function CoverPicker({url,photo,onPhoto,disabled}){
 const [checking,setChecking]=useState(false),[message,setMessage]=useState('');const version=useRef(0);
 async function find(){const attempt=++version.current;const link=safeLink(url);if(!link)return;setChecking(true);setMessage('');try{const {data}=await db.auth.getSession();const response=await fetch('/api/preview',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify({url:link})});if(!response.ok)throw Error('This site won’t provide a cover. Upload a photo you have permission to share.');const blob=await response.blob();const prepared=await preparePhoto(new File([blob],'cover.jpg',{type:blob.type}));if(version.current===attempt){onPhoto(prepared);setMessage('Cover found. Check it below before submitting.')}}catch(error){if(version.current===attempt)setMessage(error.message)}finally{if(version.current===attempt)setChecking(false)}}
 useEffect(()=>{version.current++;setChecking(false);setMessage('');if(safeLink(url))find();return()=>{version.current++}},[url]);
 function choose(file){version.current++;setChecking(false);setMessage('');onPhoto(file)}
 return <section className="cover-picker"><h3>Cover photo</h3><p>Every discovery needs a real cover. We’ll try the link first; if it’s blocked, add your own photo.</p>{checking&&<p role="status">Finding a cover…</p>}{message&&<p role="status">{message}</p>}<button type="button" disabled={disabled||checking||!safeLink(url)} onClick={find}>Find cover automatically</button><PhotoPicker photo={photo} onPhoto={choose} disabled={disabled}/></section>;
}
