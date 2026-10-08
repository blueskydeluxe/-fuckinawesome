'use client';
import {useRef,useState} from 'react';
import {db} from '../lib/supabase';

export default function DiscoveryModeration({item,onChanged}){
 const [review,setReview]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const locked=useRef(false);
 async function moderate(status){
  if(locked.current||(status==='approved'&&!confirmed))return;
  locked.current=true;setBusy(true);setMessage(status==='approved'?'Publishing your reviewed discovery…':'Updating discovery…');
  try{
   const {error}=await db.rpc(status==='approved'?'approve_discovery_as_moderator':'moderate_discovery',status==='approved'?{discovery_id:item.id,review_confirmed:confirmed}:{discovery_id:item.id,new_status:status});if(error)throw error;
   setMessage(status==='approved'?'Approved and published.':'Discovery '+status+'.');setReview(false);setConfirmed(false);
   try{await onChanged(item.id)}catch{setMessage('Update saved. Refresh to update the queue.');}
  }catch(error){setMessage(error.name==='TimeoutError'?'Image screening took too long. Nothing was approved. Please retry.':error.message||'Could not update this discovery. Please retry.');}
  finally{locked.current=false;setBusy(false);}
 }
 return <div className="content-screen" onClick={event=>event.stopPropagation()}>
  {!review?<button disabled={busy||!item.image_path} onClick={()=>{setReview(true);setMessage('');}}>Approve</button>:<div>
   <p>Review the cover, description, linked page and any video or music before publishing. Your confirmed review overrides automated image screening and is recorded.</p>
   <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/> I reviewed the full discovery. It contains no nudity, pornography, sexual exploitation or prohibited content.</label>
   <button disabled={busy||!confirmed} onClick={()=>moderate('approved')}>{busy?'Approving…':'Confirm approval'}</button>
   <button disabled={busy} onClick={()=>setReview(false)}>Cancel</button>
  </div>}
  {!item.image_path&&<p>A cover is required before approval.</p>}
  <button disabled={busy} onClick={()=>moderate('rejected')}>Reject</button>
  <button disabled={busy} onClick={()=>moderate('hidden')}>Hide</button>
  {message&&<p role="status" aria-live="polite">{message}</p>}
 </div>
}
