'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import Script from 'next/script';
import {analyticsAllowed,CONSENT_KEY,createWebAnalytics,MEASUREMENT_ID} from '../lib/web-analytics.mjs';
let tracker;
export function trackWebEvent(name){tracker?.event(name);}
export default function GoogleAnalytics(){
 const [choice,setChoice]=useState(null),[open,setOpen]=useState(false),[ready,setReady]=useState(false),[production,setProduction]=useState(false);
 const path=usePathname(),landing=useRef(null);
 const blocked=()=>!analyticsAllowed('granted',navigator);
 useEffect(()=>{
  if(!['fuckinawesome.com','www.fuckinawesome.com'].includes(location.hostname))return;
  setProduction(true);
  tracker=tracker||createWebAnalytics(window);
  landing.current=landing.current||{url:location.href,referrer:document.referrer};
  const sync=()=>{let value=null;try{value=localStorage.getItem(CONSENT_KEY)}catch{}if(blocked())value='denied';tracker.setConsent(value);setChoice(value);setOpen(value!=='granted'&&value!=='denied')};
  sync();window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[]);
 useEffect(()=>{if(ready&&choice==='granted')tracker.start(location.href,document.referrer)},[path,ready,choice]);
 function choose(value){if(blocked())value='denied';try{localStorage.setItem(CONSENT_KEY,value)}catch{}tracker.setConsent(value);setChoice(value);setOpen(false);if(value==='denied'){
  for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(/^_ga(?:_|$)/.test(name))for(const domain of ['',location.hostname,'.'+location.hostname,'.fuckinawesome.com'])document.cookie=name+'=; Max-Age=0; path=/'+(domain?'; domain='+domain:'');}
 }}
 const allowed=choice==='granted';
 if(!production)return null;
 return <>
  {allowed&&<Script id="fna-google-tag" src={'https://www.googletagmanager.com/gtag/js?id='+MEASUREMENT_ID} strategy="afterInteractive" onReady={()=>{tracker.start(landing.current?.url||location.href,landing.current?.referrer||'');setReady(true)}}/>}
  <aside className="analytics-choice" aria-label="Analytics preferences">
   {open?<><p><strong>Help make this site better?</strong> Allow Google Analytics to measure visits and actions. No advertising tracking. <a href="/privacy">Privacy details</a></p><div><button onClick={()=>choose('granted')}>Allow analytics</button><button onClick={()=>choose('denied')}>No thanks</button></div></>:<button className="analytics-settings" onClick={()=>setOpen(true)}>Analytics preferences</button>}
   {open&&blocked()&&<p>Your browser privacy signal blocks collection even if you select Allow.</p>}
  </aside>
 </>;
}
