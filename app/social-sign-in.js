'use client';
import {useEffect,useState} from 'react';
import {db} from '../lib/supabase';
const providers=[['google','Google'],['azure','Microsoft'],['apple','Apple']];
export default function SocialSignIn({busy,onError}){
 const [available,setAvailable]=useState(null),[pending,setPending]=useState(null);
 useEffect(()=>{const controller=new AbortController();fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(settings=>setAvailable(settings.external||{})).catch(()=>{if(!controller.signal.aborted)setAvailable({})});return()=>controller.abort()},[]);
 async function signIn(provider){setPending(provider);onError('');try{const {error}=await db.auth.signInWithOAuth({provider,options:{redirectTo:location.origin, ...(provider==='azure'?{scopes:'email'}:{})}});if(error)throw error}catch{onError('That sign-in service is unavailable. Please use an email sign-in link.');setPending(null)}}
 const enabled=providers.filter(([id])=>available?.[id]===true);
 if(!available)return <p className="muted">Checking sign-in options…</p>;
 if(!enabled.length)return null;
 return <div className="social-sign-in">{enabled.map(([id,name])=><button key={id} type="button" disabled={busy||Boolean(pending)} onClick={()=>signIn(id)}>{pending===id?'Opening '+name+'…':'Continue with '+name}</button>)}<p className="muted">Or sign in with email</p></div>;
}
