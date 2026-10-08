'use client';
import {useRef,useState} from 'react';
import {db} from '../lib/supabase';

export default function DiscoveryModeration({item,onChanged}){
 const [review,setReview]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const locked=useRef(false);
 async function moderate(status){
  if(locked.current)return;
  locked.current=true;setBusy(true);setMessage(status==='approved'?'Checking image safety…':'Updating discovery…');
  try{
   if(status==='approved'){
    const {data,error}=await db.auth.getSession();if(error)throw error;
    if(!data.session)throw Error('Your session expired. Sign in again to approve.');
    const response=await fetch('/api/moderation/screen',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({id:item.id,kind:'discovery'}),signal:AbortSignal.timeout(30000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Image screening is unavailable. Please retry.');
    if(result.verdict!=='passed')throw Error(result.verdict==='blocked'?'Image safety screening blocked this cover. Reject the discovery or replace its cover.':'This cover needs a suitable replacement before approval.');
    setMessage('Safety check passed. Publishing…');
   }
   const {error}=await db.rpc('moderate_discovery',{discovery_id:item.id,new_status:status});if(error)throw error;
   setMessage(status==='approved'?'Approved and published.':'Discovery '+status+'.');setReview(false);setConfirmed(false);
   try{await onChanged(item.id)}catch{setMessage('Update saved. Refresh to update the queue.');}
  }catch(error){setMessage(error.name==='TimeoutError'?'Image screening took too long. Nothing was approved. Please retry.':error.message||'Could not update this discovery. Please retry.');}
  finally{locked.current=false;setBusy(false);}
 }
 return <div className="content-screen" onClick={event=>event.stopPropagation()}>
  {!review?<button disabled={busy||!item.image_path} onClick={()=>{setReview(true);setMessage('');}}>Approve</button>:<div>
   <p>Review the cover, description, linked page and any video or music before publishing.</p>
   <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/> I reviewed the full discovery. It contains no nudity, pornography, sexual exploitation or prohibited content.</label>
   <button disabled={busy||!confirmed} onClick={()=>moderate('approved')}>{busy?'Checking and approving…':'Confirm approval'}</button>
   <button disabled={busy} onClick={()=>setReview(false)}>Cancel</button>
  </div>}
  {!item.image_path&&<p>A cover is required before approval.</p>}
  <button disabled={busy} onClick={()=>moderate('rejected')}>Reject</button>
  <button disabled={busy} onClick={()=>moderate('hidden')}>Hide</button>
  {message&&<p role="status" aria-live="polite">{message}</p>}
 </div>
}
