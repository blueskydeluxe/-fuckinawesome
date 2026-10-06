'use client';
import {useEffect, useRef, useState} from 'react';

// Public widget identifier; the secret belongs only in Supabase Auth settings.
const sitekey = '0x4AAAAAAFO1m7AQeJpBfxjW';
let scriptReady;
function loadScript() {
  if(window.turnstile)return Promise.resolve();
  if(!scriptReady)scriptReady=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=resolve;
    script.onerror=()=>{script.remove();scriptReady=null;reject(Error('Could not load the security check.'))};
    document.head.appendChild(script);
  });
  return scriptReady;
}
export default function BotCheck({onToken}) {
  const container=useRef(null);
  const [attempt,setAttempt]=useState(0),[error,setError]=useState('');
  useEffect(()=>{
    let active=true,widget;
    onToken(null);setError('');
    loadScript().then(()=>{
      if(!active)return;
      widget=window.turnstile.render(container.current,{
        sitekey,theme:'dark',size:'flexible',
        callback:token=>{if(active){setError('');onToken(token)}},
        'expired-callback':()=>{if(active){onToken(null);window.turnstile.reset(widget)}},
        'error-callback':()=>{if(active){onToken(null);setError('Security check failed. Please retry.')}},
        'timeout-callback':()=>{if(active){onToken(null);setError('Security check timed out. Please retry.')}}
      });
    }).catch(()=>{if(active)setError('Could not load the security check. Please retry.')});
    return()=>{active=false;onToken(null);if(widget!==undefined)window.turnstile?.remove(widget)};
  },[attempt,onToken]);
  return <><div ref={container} aria-label="Sign-in security check"/>{error&&<p role="alert">{error} <button type="button" onClick={()=>setAttempt(x=>x+1)}>Retry security check</button></p>}</>;
}
