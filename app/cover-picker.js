'use client';
import {useEffect,useRef,useState} from 'react';
import PhotoPicker from './photo-picker';
import {preparePhoto} from '../lib/photo';
import {db} from '../lib/supabase';
import {safeLink} from '../lib/ranking.mjs';
export default function CoverPicker({url,photo,onPhoto,disabled}){
 const [checking,setChecking]=useState(false),[message,setMessage]=useState('');const version=useRef(0),timer=useRef(null);
 async function find(){clearTimeout(timer.current);const attempt=++version.current;const link=safeLink(url);if(!link)return;setChecking(true);setMessage('');try{const {data}=await db.auth.getSession();const response=await fetch('/api/preview',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify({url:link})});if(response.status===404)throw Error("Your submitted link doesn't share shit with anyone. Upload a cover photo and description to make sure it gets approved.");if(response.status===401)throw Error('Sign in again to check this link.');if(response.status===429)throw Error('Too many cover checks. Try again later, or upload your own cover.');if(!response.ok)throw Error('We couldn’t check this link. Try again, or upload your own cover photo.');const blob=await response.blob();const prepared=await preparePhoto(new File([blob],'cover.jpg',{type:blob.type}));if(version.current===attempt){onPhoto(prepared);setMessage('Cover found. Check it below before submitting.')}}catch(error){if(version.current===attempt)setMessage(error.message)}finally{if(version.current===attempt)setChecking(false)}}
 useEffect(()=>{version.current++;setChecking(false);setMessage('');timer.current=safeLink(url)?setTimeout(find,800):null;return()=>{clearTimeout(timer.current);version.current++}},[url]);
 function choose(file){clearTimeout(timer.current);version.current++;setChecking(false);setMessage('');onPhoto(file)}
 return <section className="cover-picker"><h3>Cover photo</h3><p>We check your link for a cover as you type. If its site blocks previews or doesn’t share an image, you’ll need to upload a cover photo and write a description before submitting.</p>{checking&&<p role="status">Finding a cover…</p>}{message&&<p role="status">{message}</p>}<button type="button" disabled={disabled||checking||!safeLink(url)} onClick={find}>Find cover automatically</button><PhotoPicker photo={photo} onPhoto={choose} disabled={disabled}/></section>;
}
