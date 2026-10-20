'use client';
import {useEffect,useState,useRef} from 'react';
import {getSwipeFeedback,setSwipeFeedback,prepareSwipeAudio,playSwipeSound,supportsSwipeHaptics} from '../lib/swipe-feedback.mjs';
export default function SwipeFeedbackControls({compact=false}){
 const root=useRef(null);
 const [prefs,setPrefs]=useState({sound:true,haptics:true}),[soundStatus,setSoundStatus]=useState(''),[hapticsSupported,setHapticsSupported]=useState(false);
 useEffect(()=>{setHapticsSupported(supportsSwipeHaptics());const refresh=()=>setPrefs({...getSwipeFeedback()});refresh();window.addEventListener('swipe-feedback-change',refresh);return()=>window.removeEventListener('swipe-feedback-change',refresh)},[]);
 useEffect(()=>{if(!compact)return;const node=root.current;
 function outside(e){if(node.open&&!node.contains(e.target))node.open=false}
 function escape(e){if(node.open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();node.open=false;node.querySelector('summary')?.focus()}}
 document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true)};
 },[compact]);
 function toggle(name){const next=setSwipeFeedback({[name]:!prefs[name]});setPrefs({...next});setSoundStatus('');if(name==='sound'&&next.sound)testSound()}
 function testSound(value=1){setPrefs({...setSwipeFeedback({sound:true})});prepareSwipeAudio();playSwipeSound(value).then(played=>setSoundStatus(played?(value===1?'Awesome':'Bullshit')+' test played. If silent, check your media volume and iPhone Silent Mode.':'Sound could not start. Tap Test sound again and check your media volume.'))}
 return <details ref={root} className={'swipe-feedback-settings'+(compact?' is-compact':'')} data-no-swipe><summary aria-label={compact?'Swipe feel':undefined} title={compact?'Swipe feel':undefined}>{compact?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M3 6h6m4 0h8M3 12h12m4 0h2M3 18h2m4 0h12"/><circle cx="11" cy="6" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="18" r="2"/></svg>:'Swipe feel'}</summary><div role="group" aria-label="Swipe feel settings"><button type="button" aria-pressed={prefs.sound} onClick={()=>toggle('sound')}>Sound: {prefs.sound?'On':'Off'}</button>{hapticsSupported&&<button type="button" aria-pressed={prefs.haptics} onClick={()=>toggle('haptics')}>Haptics: {prefs.haptics?'On':'Off'}</button>}<button type="button" onClick={()=>testSound(1)}>Test Awesome</button><button type="button" onClick={()=>testSound(-1)}>Test Bullshit</button><small>{hapticsSupported?'Haptics on supported devices.':'Haptics aren’t available in this browser.'} Saved on this browser.</small>{soundStatus&&<small role="status">{soundStatus}</small>}</div></details>;
}
