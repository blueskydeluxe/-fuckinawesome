import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lib/swipe-feedback.mjs',import.meta.url),'utf8').replaceAll('export function','function')+';({getSwipeFeedback,setSwipeFeedback,prepareSwipeAudio,playSwipeFeedback})';
function setup(saved=null,unsupported=false){
 const pulses=[],tones=[],writes=[];
 class Audio{state='running';currentTime=0;destination={};createOscillator(){const osc={frequency:{setValueAtTime:v=>tones.push(v),exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};return osc}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}}
 const api=vm.runInNewContext(source,{window:{AudioContext:unsupported?undefined:Audio,dispatchEvent(){}},Event,localStorage:{getItem:()=>saved,setItem:(k,v)=>writes.push(v)},navigator:unsupported?{}:{vibrate:n=>pulses.push(n)}});
 return {...api,pulses,tones,writes};
}
test('sound is opt-in; haptics use one brief pulse per committed swipe',()=>{
 const h=setup();h.playSwipeFeedback(1);assert.deepEqual(h.pulses,[8]);assert.equal(h.tones.length,0);
 h.setSwipeFeedback({sound:true,haptics:false});h.playSwipeFeedback(-1);assert.deepEqual(h.pulses,[8]);assert.deepEqual(h.tones,[300]);
 h.playSwipeFeedback(1);assert.deepEqual(h.tones,[300,740]);assert.equal(JSON.parse(h.writes[0]).sound,true);
});
test('malformed preferences, unsupported devices and neutral outcomes are safe',()=>{
 const h=setup('invalid',true);h.setSwipeFeedback({sound:true});assert.doesNotThrow(()=>h.playSwipeFeedback(1));h.playSwipeFeedback(2);h.playSwipeFeedback(0);assert.equal(h.tones.length,0);
});
test('remembered opt-out remains quiet',()=>{
 const h=setup('{"sound":false,"haptics":false}');h.playSwipeFeedback(-1);assert.equal(h.pulses.length,0);assert.equal(h.tones.length,0);
});
