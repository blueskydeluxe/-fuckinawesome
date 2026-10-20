import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lib/swipe-feedback.mjs',import.meta.url),'utf8').replaceAll('export function','function')+';({getSwipeFeedback,setSwipeFeedback,prepareSwipeAudio,playSwipeSound,playSwipeFeedback,supportsSwipeHaptics})';
function setup(saved=null,{unsupported=false,reject=false,seekFails=false,deferred=false}={}){
 const pulses=[],plays=[],clips=[],writes=[];let release;
 class Audio{constructor(src){this.src=src;this.paused=true;clips.push(this)}set currentTime(value){if(seekFails)throw Error('metadata not loaded')}play(){plays.push(this.src);this.paused=false;return reject?Promise.reject(Error('NotAllowedError')):deferred?new Promise(r=>release=r):Promise.resolve()}pause(){this.paused=true}}
 const api=vm.runInNewContext(source,{window:{Audio:unsupported?undefined:Audio,dispatchEvent(){}},Event,localStorage:{getItem:()=>saved,setItem:(k,v)=>writes.push(v)},navigator:unsupported?{}:{vibrate:n=>pulses.push(n)}});
 return {...api,pulses,plays,clips,writes,release:()=>release()};
}
test('sound defaults on; haptics use one brief pulse per committed swipe',async()=>{
 const h=setup();await h.playSwipeFeedback(1);assert.deepEqual(h.pulses,[8]);assert.deepEqual(h.plays,['/sounds/swipe-awesome.wav']);
 h.setSwipeFeedback({sound:true,haptics:false});const playing=h.playSwipeFeedback(-1);
 // play() must run inside the gesture, before any promise or timer boundary.
 assert.deepEqual(h.plays,['/sounds/swipe-awesome.wav','/sounds/swipe-bullshit.wav']);assert.equal(await playing,true);assert.deepEqual(h.pulses,[8]);
 await h.playSwipeFeedback(1);assert.deepEqual(h.plays,['/sounds/swipe-awesome.wav','/sounds/swipe-bullshit.wav','/sounds/swipe-awesome.wav']);assert.equal(JSON.parse(h.writes[0]).sound,true);
});
test('malformed preferences, unsupported devices and neutral outcomes are safe',async()=>{
 const h=setup('invalid',{unsupported:true});h.setSwipeFeedback({sound:true});assert.equal(await h.playSwipeFeedback(1),false);await h.playSwipeFeedback(2);await h.playSwipeFeedback(0);assert.equal(h.plays.length,0);
});
test('remembered opt-out remains quiet',async()=>{
 const h=setup('{"sound":false,"haptics":false}');await h.playSwipeFeedback(-1);assert.equal(h.pulses.length,0);assert.equal(h.plays.length,0);
});
test('Safari playback rejection resolves safely instead of breaking voting',async()=>{
 const h=setup('{"sound":true}',{reject:true});assert.equal(await h.playSwipeFeedback(1),false);
});
test('first playback still starts when Safari cannot seek before metadata loads',async()=>{
 const h=setup('{"sound":true}',{seekFails:true});assert.equal(await h.playSwipeSound(1),true);assert.equal(h.plays.length,1);
});
test('muting stops a pending effect and prevents delayed playback after opt-out',async()=>{
 const h=setup('{"sound":true}',{deferred:true});const playing=h.playSwipeSound(1);h.setSwipeFeedback({sound:false});h.release();assert.equal(await playing,false);assert.ok(h.clips.every(x=>x.paused));
});

test('haptic availability reflects the browser API, including Safari-style absence',()=>{
 assert.equal(setup().supportsSwipeHaptics(),true);
 assert.equal(setup(null,{unsupported:true}).supportsSwipeHaptics(),false);
});
