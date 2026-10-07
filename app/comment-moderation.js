'use client';
import {useEffect,useState} from 'react';
import {db} from '../lib/supabase';
export default function CommentModeration(){
 const [rows,setRows]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;db.from('comment_reports').select('id,reason,created_at,comment_id,discovery_comments(body,submission_id)').is('resolved_at',null).order('created_at').limit(100).then(r=>{if(active){if(r.error)setMessage('Comment reports could not load.');else setRows(r.data||[])}});return()=>{active=false}},[revision]);
 async function handle(r,hide){setBusy(true);setMessage('');try{const result=hide?await db.rpc('hide_discovery_comment',{comment_id:r.comment_id}):await db.rpc('resolve_comment_report',{report_id:r.id});if(result.error)throw result.error;setRevision(x=>x+1)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <section className="comment-moderation"><h3>Reported comments</h3>{message&&<p role="status">{message}</p>}{!rows.length&&<p>No open comment reports.</p>}{rows.map(r=><div className="notice" key={r.id}><strong>{r.reason}</strong><p>{r.discovery_comments?.body}</p><a href={'/?discovery='+r.discovery_comments?.submission_id}>View discovery</a><div className="actions"><button disabled={busy} onClick={()=>handle(r,true)}>Hide comment</button><button disabled={busy} onClick={()=>handle(r,false)}>Mark handled</button></div></div>)}</section>;
}
