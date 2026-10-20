const key='fa-swipe-feedback-v1';
let preferences,audio;
export function getSwipeFeedback(){
 if(preferences)return preferences;
 let saved;try{saved=JSON.parse(localStorage.getItem(key))}catch{}
 return preferences={sound:saved?.sound===true,haptics:saved?.haptics!==false};
}
export function setSwipeFeedback(update){
 preferences={...getSwipeFeedback(),...update};
 try{localStorage.setItem(key,JSON.stringify(preferences))}catch{}
 window.dispatchEvent(new Event('swipe-feedback-change'));return preferences;
}
export function prepareSwipeAudio(){
 if(!getSwipeFeedback().sound)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 audio??=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
 }catch{}
}
// Gesture confirmation; server confirmation remains separate.
export function playSwipeFeedback(value){
 if(value!==1&&value!==-1)return;
 const prefs=getSwipeFeedback();
 if(prefs.haptics)try{navigator.vibrate?.(8)}catch{}
 if(!prefs.sound)return;
 prepareSwipeAudio();if(!audio||audio.state!=='running')return;
 try{const start=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
 osc.type='sine';osc.frequency.setValueAtTime(value===1?740:300,start);
 osc.frequency.exponentialRampToValueAtTime(value===1?420:160,start+.075);
 gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.004);
 gain.gain.exponentialRampToValueAtTime(.0001,start+.085);
 osc.connect(gain);gain.connect(audio.destination);osc.onended=()=>{osc.disconnect();gain.disconnect()};osc.start(start);osc.stop(start+.09);
 }catch{}
}
