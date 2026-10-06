'use client';
import {useRef,useState,useEffect} from 'react';
import {preparePhoto} from '../lib/photo';
export default function PhotoPicker({onPhoto,disabled,photo}){
 const camera=useRef(null),gallery=useRef(null),version=useRef(0);
 const [preview,setPreview]=useState(null),[error,setError]=useState(''),[processing,setProcessing]=useState(false);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 useEffect(()=>{if(photo!==undefined)setPreview(photo?URL.createObjectURL(photo):null)},[photo]);
 useEffect(()=>()=>{version.current++},[]);
 async function choose(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;const attempt=++version.current;setProcessing(true);setError('');onPhoto(null);setPreview(null);try{const photo=await preparePhoto(file);if(version.current!==attempt)return;setPreview(URL.createObjectURL(photo));onPhoto(photo)}catch(e){if(version.current===attempt)setError(e.message)}finally{if(version.current===attempt)setProcessing(false)}}
 return <div className="photo-picker"><p>Take a photo or choose one from your phone. We resize it and remove embedded location data before uploading.</p><div className="actions"><button type="button" disabled={disabled||processing} onClick={()=>camera.current.click()}>Take a photo</button><button type="button" disabled={disabled||processing} onClick={()=>gallery.current.click()}>Choose from photos</button></div><input hidden ref={camera} aria-label="Camera photo" type="file" accept="image/*" capture="environment" onChange={choose}/><input hidden ref={gallery} aria-label="Photo library" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={choose}/>{processing&&<p role="status">Preparing your photo…</p>}{error&&<p role="alert">{error}</p>}{preview&&<><img className="photo-preview" src={preview} alt="Your photo before submission"/><button type="button" disabled={disabled} onClick={()=>{version.current++;setPreview(null);onPhoto(null)}}>Remove photo</button></>}<p className="muted">Up to 20 MB before resizing. If your phone photo can’t be opened, choose a JPG or PNG. Only submit photos you have permission to share.</p></div>
}
