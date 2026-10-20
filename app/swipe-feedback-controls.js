'use client';
import {useEffect,useState} from 'react';
import {getSwipeFeedback,setSwipeFeedback,prepareSwipeAudio,playSwipeSound,supportsSwipeHaptics} from '../lib/swipe-feedback.mjs';
export default function SwipeFeedbackControls(){
 const [prefs,setPrefs]=useState({sound:true,haptics:true}),[soundStatus,setSoundStatus]=useState(''),[hapticsSupported,setHapticsSupported]=useState(false);
 useEffect(()=>{setHapticsSupported(supportsSwipeHaptics());const refresh=()=>setPrefs({...getSwipeFeedback()});refresh();window.addEventListener('swipe-feedback-change',refresh);return()=>window.removeEventListener('swipe-feedback-change',refresh)},[]);
 function toggle(name){const next=setSwipeFeedback({[name]:!prefs[name]});setPrefs({...next});setSoundStatus('');if(name==='sound'&&next.sound)testSound()}
 function testSound(){setPrefs({...setSwipeFeedback({sound:true})});prepareSwipeAudio();playSwipeSound(1).then(played=>setSoundStatus(played?'Test played. If silent, check your media volume and iPhone Silent Mode.':'Sound could not start. Tap Test sound again and check your media volume.'))}
 return <details className="swipe-feedback-settings" data-no-swipe><summary>Swipe feel</summary><div><button type="button" aria-pressed={prefs.sound} onClick={()=>toggle('sound')}>Sound: {prefs.sound?'On':'Off'}</button>{hapticsSupported&&<button type="button" aria-pressed={prefs.haptics} onClick={()=>toggle('haptics')}>Haptics: {prefs.haptics?'On':'Off'}</button>}<button type="button" onClick={testSound}>{prefs.sound?'Test sound':'Enable & test sound'}</button><small>{hapticsSupported?'Haptics on supported devices.':'Haptics aren’t available in this browser.'} Saved on this browser.</small>{soundStatus&&<small role="status">{soundStatus}</small>}</div></details>;
}
