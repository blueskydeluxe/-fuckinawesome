import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {swipeIntent,swipeVote} from '../lib/swipe.mjs';

// Exercise the real touch handlers with deterministic hook, frame and timer scheduling.
function harness(){
 let slots=[],cursor=0,dirty=false,effects=[],pending=[],timers=new Map(),frames=new Map(),sequence=0;
 const node={style:{},clientWidth:390,listeners:{},addEventListener(k,f){this.listeners[k]=f},removeEventListener(k,f){if(this.listeners[k]===f)delete this.listeners[k]}};
 const ref=v=>{const i=cursor++;return slots[i]??=(i===0?{current:node}:{current:v})};
 const state=v=>{const i=cursor++;slots[i]??=v;return [slots[i],n=>{if(slots[i]!==n){slots[i]=n;dirty=true}}]};
 const effect=(fn,deps)=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})};
 const context={useRef:ref,useState:state,useLayoutEffect:effect,useEffect:(fn,deps)=>effects.push(()=>effect(fn,deps)),swipeIntent,swipeVote,Date,window:{innerWidth:390,matchMedia:()=>({matches:false})},requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)};
 const source=readFileSync(new URL('../app/use-card-swipe.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace('export default function','function')+'\nuseCardSwipe';
 const hook=vm.runInNewContext(source,context);let props,result;
 function render(next=props){props=next;do{dirty=false;cursor=0;result=hook(props);let tasks=pending.splice(0);for(const f of tasks)f()}while(dirty);return result}
 function event(type,x){const finger={identifier:1,clientX:x,clientY:100},e={type,target:{closest:()=>null},touches:type==='touchend'?[]:[finger],changedTouches:[finger],timeStamp:type==='touchstart'?0:type==='touchmove'?40:50,cancelable:true,preventDefault(){}};node.listeners[type](e);for(const f of frames.values())f();frames.clear();render();}
 function touchEvent(type,touches,target){node.listeners[type]({type,touches,target,changedTouches:[],cancelable:true,preventDefault(){}});render()}
 return {node,render,event,touchEvent,get result(){return result},runTimer(){const [id,fn]=timers.entries().next().value;timers.delete(id);return fn()}};
}
for(const direction of [-1,1])test('next discovery has no previous verdict before paint ('+direction+')',async()=>{
 const h=harness();let release;const vote=new Promise(r=>release=r);const onVote=()=>vote;
 h.render({id:'first',enabled:true,busy:false,onVote});h.event('touchstart',190);h.event('touchmove',190+direction*120);assert.equal(h.result.drag,direction);h.event('touchend',190+direction*160);const settling=h.runTimer();
 const next=h.render({id:'second',enabled:true,busy:false,onVote});assert.equal(next.drag,0);assert.doesNotMatch(next.className,/is-held|is-dragging|swipe-awesome|swipe-bullshit/);assert.equal(h.node.style.transform,'');assert.equal(h.node.style.transition,'');
 // A late completion from the previous vote must not reset the next gesture.
 h.event('touchstart',190);h.event('touchmove',190-direction*100);const transform=h.node.style.transform;release();await settling;h.render();assert.equal(h.result.drag,-direction);assert.equal(h.node.style.transform,transform);
});
test('an unsuccessful vote restores the same card without feedback',async()=>{
 const h=harness();h.render({id:'first',enabled:true,busy:false,onVote:async()=>{throw Error('offline')}});h.event('touchstart',190);h.event('touchmove',320);h.event('touchend',350);await assert.rejects(h.runTimer(),/offline/);h.render();assert.equal(h.result.drag,0);assert.equal(h.node.style.transform,'');
});
test('disabling voting clears an in-progress drag before paint',()=>{
 const h=harness(),onVote=async()=>{};h.render({id:'first',enabled:true,busy:false,onVote});h.event('touchstart',190);h.event('touchmove',60);h.render({id:'first',enabled:false,busy:false,onVote});assert.equal(h.result.drag,0);assert.doesNotMatch(h.result.className,/is-held|is-dragging|swipe-bullshit/);assert.equal(h.node.style.transform,'');
});

for(const remaining of [0,1])test('pinch transitions to either remaining finger without jumping or voting ('+remaining+')',()=>{
 const h=harness();let votes=0;h.render({id:'first',enabled:true,busy:false,onVote:()=>votes++});
 const classes=new Set(),frame={classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),remove:k=>classes.delete(k)}};
 const img={style:{},clientWidth:400,clientHeight:400,closest:selector=>selector==='img'?img:frame};
 const finger=(identifier,x,y=100)=>({identifier,clientX:x,clientY:y});
 h.touchEvent('touchstart',[finger(1,100),finger(2,200)],img);
 h.touchEvent('touchmove',[finger(1,50),finger(2,250)],img);
 assert.equal(img.style.transform,'translate3d(0px,0px,0) scale(2)');
 const x=remaining===0?50:250,id=remaining+1;
 h.touchEvent('touchend',[finger(id,x)],img);
 assert.equal(img.style.transform,'translate3d(0px,0px,0) scale(2)');
 h.touchEvent('touchmove',[finger(id,x+30,120)],img);
 assert.equal(img.style.transform,'translate3d(30px,20px,0) scale(2)');
 // A second finger can rejoin and continue zooming from the current position.
 h.touchEvent('touchstart',[finger(id,x+30,120),finger(3,x+130,120)],img);
 h.touchEvent('touchmove',[finger(id,x-20,120),finger(3,x+180,120)],img);
 assert.equal(img.style.transform,'translate3d(30px,20px,0) scale(4)');
 h.touchEvent('touchend',[],img);
 assert.equal(img.style.transform,'');assert.equal(classes.size,0);assert.equal(votes,0);assert.equal(h.node.style.transform,'');
 let blocked=false;h.result.handlers.onClickCapture({detail:1,preventDefault(){blocked=true},stopPropagation(){}});assert.equal(blocked,true);
});

test('a canceled pinch resets even when a finger remains',()=>{
 const h=harness();h.render({id:'first',enabled:true,busy:false,onVote:()=>assert.fail('zoom must not vote')});
 const frame={classList:{toggle(){},remove(){}}},img={style:{},clientWidth:400,clientHeight:400,closest:s=>s==='img'?img:frame};
 const a={clientX:0,clientY:0},b={clientX:100,clientY:0};
 h.touchEvent('touchstart',[a,b],img);h.touchEvent('touchmove',[a,{...b,clientX:200}],img);
 h.touchEvent('touchcancel',[a],img);assert.equal(img.style.transform,'');
});
