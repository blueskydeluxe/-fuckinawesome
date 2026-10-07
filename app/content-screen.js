'use client';
import {useState} from 'react';import {db} from '../lib/supabase';
export default function ContentScreen({id,kind}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function check(){setBusy(true);setMessage('Screening image…');try{const {data}=await db.auth.getSession();const r=await fetch('/api/moderation/screen',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session?.access_token},body:JSON.stringify({id,kind})});const result=await r.json();if(!r.ok)throw Error(result.error);setMessage(result.verdict==='passed'?'Image screening passed. Review the full content before approving.':result.verdict==='blocked'?'Adult-content screening blocked this image. Reject it.':'Flagged for review. Approval is blocked; request a suitable replacement.')}catch(e){setMessage(e.message||'Screening unavailable. Content stays pending.')}finally{setBusy(false)}}
 return <div className="content-screen"><button type="button" disabled={busy} onClick={check}>Check image safety</button>{message&&<p role="status">{message}</p>}</div>
}
