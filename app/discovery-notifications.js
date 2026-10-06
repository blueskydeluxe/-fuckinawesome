'use client';
import {useEffect,useState} from 'react';
import {db} from '../lib/supabase';
export default function DiscoveryNotifications({userId,onRead}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;db.from('discovery_notifications').select('id,submission_id,event,created_at,read_at').order('created_at',{ascending:false}).limit(50).then(({data,error})=>{if(active){setItems(data||[]);setError(error?'Notifications couldn’t load. Try again later.':'');setLoading(false)}});return()=>{active=false}},[userId]);
 async function markRead(){setBusy(true);const {error}=await db.rpc('read_discovery_notifications');if(error)setError('Couldn’t mark notifications as read. Try again.');else {setItems(xs=>xs.map(x=>({...x,read_at:new Date().toISOString()})));onRead?.();}setBusy(false)}
 function label(event){if(event==='approved')return 'Your discovery got approved. Fuckin awesome.';if(event==='hall_of_fame')return 'You made the Hall of Fame!';return 'Your discovery hit '+event.replace('awesome_','')+' awesome votes.'}
 return <section className="notifications"><h2>Your notifications</h2><p className="muted">Approval, awesome vote milestones, and Hall of Fame moments appear here. Notifications start with new activity.</p>{loading?<p>Loading notifications…</p>:<>{error&&<p role="alert">{error}</p>}{items.some(x=>!x.read_at)&&<button disabled={busy} onClick={markRead}>Mark all as read</button>}{!error&&!items.length&&<p>Your next fuckin awesome moment starts with a discovery.</p>}<ul>{items.map(x=><li key={x.id} className={x.read_at?'':'unread'}><a href={'/?discovery='+x.submission_id}>{label(x.event)}</a><time dateTime={x.created_at}>{new Date(x.created_at).toLocaleDateString()}</time></li>)}</ul></>}</section>;
}

