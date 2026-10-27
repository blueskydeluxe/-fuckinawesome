'use client';
import {useEffect,useRef,useState} from 'react';
import useCardSwipe from './use-card-swipe';
import {trackWebEvent} from './google-analytics';
import {PREVIEW_KEY,PREVIEW_LIMIT,readPreviews,savePreviews,withoutCommitted,agreementReveal} from '../lib/preview-votes.mjs';
export default function OpeningDeck({rows=[],user,onLogin,onCount,onVote,onOpen}){
 const [previews,setPreviews]=useState([]),[prompt,setPrompt]=useState(false),[reveal,setReveal]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const pending=useRef([]),lock=useRef(false),started=useRef(false);
 const available=rows.filter(row=>!previews.some(v=>v.id===row.id));
 const item=available[0];
 useEffect(()=>{
  const sync=event=>{if(event&&event.key!==PREVIEW_KEY&&event.key!==null)return;let votes=[];try{votes=readPreviews(localStorage.getItem(PREVIEW_KEY))}catch{}pending.current=votes;setPreviews(votes);setPrompt(votes.length>=5);setReady(true)};
  sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
 },[]);
 const signupTracked=useRef(false);
 useEffect(()=>{if(user&&previews.length&&!signupTracked.current){signupTracked.current=true;trackWebEvent('preview_signin')}if(!user)signupTracked.current=false},[user?.id,previews.length]);
 function persist(votes){pending.current=savePreviews(votes,localStorage);setPreviews(pending.current)}
 async function choose(id,value){
  if(lock.current||!ready||!item||item.id!==id)return;
  if(!started.current){started.current=true;trackWebEvent('first_swipe')}
  lock.current=true;setBusy(true);setError('');
  try{
   if(user){const result=await onVote(id,value);if(result?.confirmed)setReveal(agreementReveal(result.item,value,{counted:true}));else setError('Your vote was not confirmed. Try again.');return}
   if(pending.current.length>=PREVIEW_LIMIT){setPrompt(true);return}
   const next=[...pending.current.filter(v=>v.id!==id),{id,value}];persist(next);setReveal(agreementReveal(item,value));
   if(next.length%5===0){setPrompt(true);trackWebEvent('five_previews')}
  }catch(e){setError(e.message||'Your choice could not be saved. Please try again.')}finally{lock.current=false;setBusy(false)}
 }
 async function commit(){
  if(!user){trackWebEvent('preview_signup');onLogin();return}
  if(lock.current||!previews.length)return;
  lock.current=true;setBusy(true);setError('');const submitted=[...pending.current];
  try{
   const result=await onCount(submitted);
   if(!result)return;
   // A newer choice made in another tab must survive completion of this request.
   let current=pending.current;try{current=readPreviews(localStorage.getItem(PREVIEW_KEY))}catch{}
   const unavailable=new Set(result.filter(r=>r.outcome==='unavailable').map(r=>r.submission_id));
   const accepted=submitted.filter(v=>!unavailable.has(v.id));persist(withoutCommitted(current,accepted));
   const counted=result.filter(r=>r.outcome==='counted').length,existing=result.filter(r=>r.outcome==='existing').length;
   setReveal(`${counted} ${counted===1?'vote':'votes'} counted.${existing?` ${existing} existing account ${existing===1?'vote kept':'votes kept'}.`:''}`);
   setPrompt(unavailable.size>0);
   if(unavailable.size)setError('Some finds are no longer published. Their previews were not counted. You can discard them below.');
   if(counted)trackWebEvent('preview_votes_counted');
  }catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}
 }
 const swipe=useCardSwipe({id:item?.id,enabled:!!item&&ready&&!prompt,busy,onVote:choose});
 const showPrompt=prompt||!item&&previews.length>0;
 return <div className={"opening-experience"+(!item&&!showPrompt?" opening-without-card":"")}>
  <div className="opening-intro"><span className="eyebrow">The internet’s hall of awesome</span><h1><span className="opening-headline-accent">Swipe right</span> on the<br className="opening-headline-break"/> internet’s best finds.</h1><p>Real people. Real discoveries.<br/>You decide what’s awesome and what’s bullshit.</p></div>
  {(item||showPrompt)&&<div className="opening-stage" id="first-discovery" tabIndex={-1}>
   {!user&&<p className="preview-label">Preview mode · Votes don’t count yet</p>}
   {item&&!showPrompt?<article className={'opening-card '+swipe.className} ref={swipe.ref} {...swipe.handlers} aria-label="Swipe discovery">
    <div className="opening-swipe-hint" aria-label="Swipe left for Bullshit or right for Awesome">Swipe it. Make your call.</div>
    {swipe.drag!==0&&<div className="swipe-verdict" aria-hidden="true">{swipe.drag>0?'FUCKIN AWESOME':'IT’S BULLSHIT'}</div>}
    <div className="opening-media">
     <button className="photo-open opening-photo" aria-label={'Explore '+item.title} onClick={()=>onOpen(item)}><img src={'/discovery/'+item.id+'/cover'} alt={item.title} width="640" height="480" fetchPriority="high"/></button>
     <div className="opening-votes" data-no-swipe aria-label="Make your call"><button className="opening-bullshit" disabled={busy||!ready} onClick={()=>choose(item.id,-1)}>← Bullshit</button><button className="opening-meh" disabled={busy||!ready} onClick={()=>choose(item.id,2)}>Meh</button><button className="opening-awesome" disabled={busy||!ready} onClick={()=>choose(item.id,1)}>Awesome →</button></div>
    </div>
    <div className="opening-copy"><span className="tag">{item.category}</span><h2><a href={'/discovery/'+item.id}>{item.title}</a></h2><p>{item.description}</p></div>
   </article>:showPrompt?<section className="preview-recap"><span className="eyebrow">YOUR VERDICTS, READY</span><h2>{previews.length} {previews.length===1?'find':'finds'}. You made your call.</h2><p>{user?'Your preview votes are ready to count. Existing account votes will be kept.':'Those votes don’t count yet. Sign up to lock them in and help decide what makes the Hall.'}</p><button className="primary" disabled={busy||!ready} onClick={commit}>{busy?'Counting your votes…':'Lock in my votes'}</button>{available.length>0&&previews.length<PREVIEW_LIMIT&&<button className="text-action" onClick={()=>setPrompt(false)}>Keep swiping {user?'':'(votes won’t count)'}</button>}<p className="muted">Free. One account, one vote per discovery. Keeps the Hall honest.</p><button className="text-action" disabled={busy} onClick={()=>{persist([]);setPrompt(false);setReveal('Previews discarded.');setError('')}}>Discard preview votes</button></section>:null}
   <p className="opening-reveal" role="status" aria-live="polite">{reveal}</p>{error&&<p className="notice" role="alert">{error}</p>}
   {previews.length>0&&!showPrompt&&<button className="text-action" disabled={busy} onClick={()=>setPrompt(true)}>{previews.length} preview {previews.length===1?'vote':'votes'} saved · {user?'Count them':'Sign in to count them'}</button>}
  </div>}
 </div>;
}
