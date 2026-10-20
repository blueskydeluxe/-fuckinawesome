'use client';
import {useEffect,useState} from 'react';
import {getSwipeFeedback,setSwipeFeedback,prepareSwipeAudio} from '../lib/swipe-feedback.mjs';
export default function SwipeFeedbackControls(){
 const [prefs,setPrefs]=useState({sound:false,haptics:true});
 useEffect(()=>{const refresh=()=>setPrefs({...getSwipeFeedback()});refresh();window.addEventListener('swipe-feedback-change',refresh);return()=>window.removeEventListener('swipe-feedback-change',refresh)},[]);
 function toggle(name){const next=setSwipeFeedback({[name]:!prefs[name]});setPrefs({...next});if(next.sound)prepareSwipeAudio()}
 return <details className="swipe-feedback-settings" data-no-swipe><summary>Swipe feel</summary><div><button type="button" aria-pressed={prefs.sound} onClick={()=>toggle('sound')}>Sound: {prefs.sound?'On':'Off'}</button><button type="button" aria-pressed={prefs.haptics} onClick={()=>toggle('haptics')}>Haptics: {prefs.haptics?'On':'Off'}</button><small>Haptics on supported devices. Saved on this browser.</small></div></details>;
}
