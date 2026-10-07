'use client';
import {useEffect,useState} from 'react';
import {db} from '../lib/supabase';
const providers=[['google','Google'],['apple','Apple'],['facebook','Facebook'],['azure','Microsoft'],['discord','Discord'],['github','GitHub'],['spotify','Spotify'],['linkedin_oidc','LinkedIn'],['x','X'],['twitch','Twitch']];
export default function SocialSignIn({busy,onError}){
 const [available,setAvailable]=useState(null),[pending,setPending]=useState(null);
 useEffect(()=>{const controller=new AbortController();fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(settings=>setAvailable(settings.external||{})).catch(()=>{if(!controller.signal.aborted)setAvailable({})});return()=>controller.abort()},[]);
 async function signIn(provider){setPending(provider);onError('');try{const {error}=await db.auth.signInWithOAuth({provider,options:{redirectTo:location.origin,...(provider==='azure'||provider==='facebook'?{scopes:'email'}:{})}});if(error)throw error}catch{onError('That sign-in service is unavailable. Try another option or an email sign-in link.');setPending(null)}}
 const enabled=providers.filter(([id])=>available?.[id]===true),main=enabled.filter(([id])=>['google','apple','facebook','azure'].includes(id)),more=enabled.filter(([id])=>!['google','apple','facebook','azure'].includes(id));
 if(!available)return <p className="muted">Checking sign-in options…</p>;
 if(!enabled.length)return null;
 const button=([id,name])=><button key={id} type="button" disabled={busy||Boolean(pending)} onClick={()=>signIn(id)}>{pending===id?'Opening '+name+'…':'Continue with '+name}</button>;
 return <div className="social-sign-in">{main.map(button)}{more.length>0&&<details><summary>More sign-in options</summary><div className="social-sign-in-more">{more.map(button)}</div></details>}<p className="muted">Already joined with email? Use the same verified email with your provider to keep your account, discoveries, and votes.</p><p className="muted">Or sign in with email</p></div>;
}
