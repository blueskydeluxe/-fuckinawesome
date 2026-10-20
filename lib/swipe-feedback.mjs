const key='fa-swipe-feedback-v1';
let preferences,audio;
export function getSwipeFeedback(){
 if(preferences)return preferences;
 let saved;try{saved=JSON.parse(localStorage.getItem(key))}catch{}
 return preferences={sound:saved?.sound!==false,haptics:saved?.haptics!==false};
}
export function setSwipeFeedback(update){
 preferences={...getSwipeFeedback(),...update};
 try{localStorage.setItem(key,JSON.stringify(preferences))}catch{}
 if(!preferences.sound&&audio)for(const clip of Object.values(audio))try{clip.pause()}catch{}
 window.dispatchEvent(new Event('swipe-feedback-change'));return preferences;
}
// Use native media playback directly inside the gesture. Safari can leave a
// Web Audio context suspended/interrupted, dropping the first swipe effect.
export function prepareSwipeAudio(){
 if(!getSwipeFeedback().sound)return;
 try{if(!audio){if(!window.Audio)return;audio={};for(const [value,name] of [[1,'awesome'],[-1,'bullshit']]){const clip=new window.Audio(`/sounds/swipe-${name}.wav`);clip.preload='auto';audio[value]=clip}}}catch{audio=null}
}
export function playSwipeSound(value){
 if(!getSwipeFeedback().sound||(value!==1&&value!==-1))return Promise.resolve(false);
 prepareSwipeAudio();const clip=audio?.[value];if(!clip)return Promise.resolve(false);
 try{try{clip.currentTime=0}catch{}const playback=clip.play();return Promise.resolve(playback).then(()=>{if(!getSwipeFeedback().sound){clip.pause();return false}return true},()=>false)}catch{return Promise.resolve(false)}
}
// Gesture confirmation; server confirmation remains separate.
export function playSwipeFeedback(value){
 if(value!==1&&value!==-1)return Promise.resolve(false);
 if(getSwipeFeedback().haptics)try{navigator.vibrate?.(8)}catch{}
 return playSwipeSound(value);
}
