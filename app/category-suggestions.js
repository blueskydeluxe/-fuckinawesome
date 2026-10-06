'use client';
import {useEffect,useState} from 'react';
import {db} from '../lib/supabase';
export default function CategorySuggestions({moderator=false,onChanged}){
 const [rows,setRows]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const {data,error}=await db.from('category_suggestions').select('id,name,reason,status').order('created_at',{ascending:false}).limit(50);if(error)setMessage('Could not load category requests.');else setRows(data||[])}
 useEffect(()=>{if(db)load()},[]);
 async function submit(e){e.preventDefault();const form=e.currentTarget,f=new FormData(form);setBusy(true);setMessage('');const {error}=await db.rpc('suggest_category',{category_name:f.get('name'),category_reason:f.get('reason')});setBusy(false);if(error)setMessage(error.message);else{form.reset();setMessage('Suggestion sent. A moderator will review it.');load()}}
 async function review(id,approved){setBusy(true);const {error}=await db.rpc('review_category',{suggestion_id:id,approved});setBusy(false);if(error)setMessage(error.message);else{await load();onChanged?.()}}
 return <section className="category-requests"><h3>{moderator?'Category requests':'Suggest a category'}</h3>{!moderator&&<><p>Missing a broad category? Suggest it here. For specific subjects, use tags.</p><form onSubmit={submit}><label>Category name<input name="name" required minLength={2} maxLength={32}/></label><label>Why would it help?<textarea name="reason" required minLength={10} maxLength={300}/></label><button disabled={busy} className="primary">Send suggestion</button></form></>}<div role="status">{message}</div>{rows.map(x=><div className="notice" key={x.id}><strong>{x.name}</strong><p>{x.reason}</p><span>{x.status}</span>{moderator&&x.status==='pending'&&<div className="actions"><button disabled={busy} onClick={()=>review(x.id,true)}>Approve category</button><button disabled={busy} onClick={()=>review(x.id,false)}>Decline</button></div>}</div>)}</section>
}
