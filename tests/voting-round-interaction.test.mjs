import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
import React from 'react';import * as moments from '../lib/hall-moments.mjs';import * as feed from '../lib/feed-scroll.mjs';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/bundle');
const {code}=babel.core().transformSync(readFileSync(new URL('../app/hall.js',import.meta.url),'utf8'),{babelrc:false,configFile:false,presets:[[babel.presetReact(),{runtime:'automatic'}]],plugins:[babel.pluginTransformModulesCommonjs()]});
// Deterministic hook host exercises the real Hall handlers with isolated network fixtures.
function host({reject=false,moderator=false,gate=null}={}){
 let cursor=0,dirty=true,tree,effects=[],calls=0;const slots=[],timers=new Map();let timerId=0;
 const rows=Array.from({length:5},(_,i)=>({id:'find-'+i,author_id:'author',title:'Discovery '+i,category:'Art',status:'approved',image_path:'cover-'+i,up_votes:1,down_votes:0,neutral_votes:0}));
 const stateVotes={};const member={id:'member'};
 function value(table){return table==='profiles'?{id:'member',display_name:'Tester',is_moderator:moderator}:table==='discovery_categories'?[{name:'Art'}]:table==='votes'?Object.entries(stateVotes).map(([submission_id,value])=>({submission_id,value})):table==='discovery_preferences'?null:[]}
 function query(table){const q={then(resolve){return Promise.resolve({data:value(table),error:null}).then(resolve)}};for(const method of ['select','eq','not','order','limit','in','is','single','maybeSingle'])q[method]=()=>q;return q}
 const db={from:query,auth:{getUser:async()=>({data:{user:member}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async(name,args)=>{
  if(name==='opening_discoveries')return {data:rows.filter(x=>!stateVotes[x.id]).map(x=>({...x})),error:null};
  if(name==='search_discovery_feed')return {data:rows.map(x=>({...x})),error:null};
  if(name==='voter_levels')return {data:[{member_id:'member',total_votes:Object.keys(stateVotes).length}],error:null};
  if(name==='cast_vote_with_result'){
   calls++;if(reject)return {data:null,error:{message:'Vote rejected'}};
   const item=rows.find(x=>x.id===args.discovery_id),previous=stateVotes[item.id]||0;
   for(const [choice,key] of [[1,'up_votes'],[-1,'down_votes'],[2,'neutral_votes']])item[key]+=(args.vote_value===choice?1:0)-(previous===choice?1:0);
   if(args.vote_value)stateVotes[item.id]=args.vote_value;else delete stateVotes[item.id];
   if(gate)await gate;
   return {data:[{...item,entered_hall:false}],error:null};
  }return {data:[],error:null};
 }};
 const mockReact={...React,useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],next=>{slots[index]=typeof next==='function'?next(slots[index]):next;dirty=true}]},useRef(initial){const index=cursor++;return slots[index]??(slots[index]={current:initial})},useEffect(effect,deps){const index=cursor++,old=slots[index];if(!old||!deps||deps.some((x,i)=>!Object.is(x,old.deps?.[i]))){effects.push(()=>{old?.cleanup?.();slots[index]={deps,cleanup:effect()}})}}};
 const noop=()=>{},window={addEventListener:noop,removeEventListener:noop,matchMedia:()=>({matches:false})};
 const exports={};vm.runInNewContext(code,{exports,require(name){if(name==='react')return mockReact;if(name.startsWith('react/'))return require(name);if(name.includes('hall-moments'))return moments;if(name.includes('feed-scroll'))return feed;return {__esModule:true,default:({children})=>children,FollowButton:()=>null,LevelBadge:()=>null,configured:true,db,defaultPreferences:{approvals:true,comments:true,rewards:true,measurement:false},canonicalTag:x=>x,sharedDraft:async()=>null,discoveryPhotoUrl:async()=>null,trackUsage:noop}},URLSearchParams,AbortController,window,location:{search:'',pathname:'/',origin:'https://example.com'},history:{replaceState:noop},localStorage:{getItem:()=>null,setItem:noop},document:{activeElement:null,addEventListener:noop,removeEventListener:noop},fetch:async()=>({ok:true,json:async()=>[]}),Image:class{},IntersectionObserver:class{observe(){}disconnect(){}},setTimeout(fn){const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}});
 async function flush(){for(let n=0;n<12;n++){if(dirty){dirty=false;cursor=0;tree=exports.default({});const pending=effects;effects=[];for(const effect of pending)effect()}await Promise.resolve()}return tree}
 function all(node=tree){if(!node||typeof node!=='object')return [];return [node,...React.Children.toArray(node.props?.children).flatMap(x=>all(x))]}
 function button(label){return all().find(x=>x.type==='button'&&x.props.children===label)}
 function viewer(){return all().find(x=>x.props?.item&&typeof x.props.onVote==='function')}
 function recap(){return all().find(x=>x.props?.round&&typeof x.props.onAgain==='function')}
 async function advance(){for(const [id,fn] of [...timers]){timers.delete(id);await fn()}await flush()}
 return {flush,button,viewer,recap,advance,all,get calls(){return calls}};
}
test('five confirmed votes produce one recap with the actual picks and next-card reset',async()=>{
 const h=host();await h.flush();await h.button('Start a five-card round').props.onClick();await h.flush();
 for(const [i,choice] of [1,2,-1,1,1].entries()){
  const viewer=h.viewer();assert.equal(viewer.props.item.id,'find-'+i);assert.equal(viewer.props.vote,undefined);
  await viewer.props.onVote(viewer.props.item.id,choice);await h.flush();assert.equal(h.viewer().props.moment.item.id,'find-'+i);
  await h.advance();
 }
 assert.equal(h.calls,5);assert.equal(h.viewer(),undefined);
 const round=h.recap().props.round;assert.equal(round.results.length,5);assert.equal(round.results.filter(x=>x.choice===1).length,3);assert.equal(round.phase,'recap');
});
test('a failed vote never counts, advances, or celebrates',async()=>{
 const h=host({reject:true});await h.flush();await h.button('Start a five-card round').props.onClick();await h.flush();
 await h.viewer().props.onVote('find-0',1);await h.flush();await h.advance();
 assert.equal(h.viewer().props.item.id,'find-0');assert.equal(h.viewer().props.roundProgress.done,0);assert.equal(h.viewer().props.moment,null);assert.equal(h.recap(),undefined);
});
test('rapid taps are serialized and undo returns the previous card without a counted verdict',async()=>{
 const h=host();await h.flush();await h.button('Start a five-card round').props.onClick();await h.flush();
 const vote=h.viewer().props.onVote;await Promise.all([vote('find-0',1),vote('find-0',1)]);await h.flush();await h.advance();assert.equal(h.calls,1);
 await h.viewer().props.onUndo();await h.flush();assert.equal(h.viewer().props.item.id,'find-0');assert.equal(h.viewer().props.roundProgress.done,0);assert.equal(h.viewer().props.vote,0);
});
test('closing during confirmation never resurrects or advances the closed card',async()=>{
 let resolve;const gate=new Promise(done=>{resolve=done}),h=host({gate});await h.flush();await h.button('Start a five-card round').props.onClick();await h.flush();
 const pending=h.viewer().props.onVote('find-0',1);h.viewer().props.onClose();await h.flush();resolve();await pending;await h.flush();await h.advance();
 assert.equal(h.viewer(),undefined);assert.equal(h.recap(),undefined);assert.equal(h.calls,1);
});
test('moderators have no delete controls on gallery images, but retain the opened-card action',async()=>{
 const h=host({moderator:true});await h.flush();assert.equal(h.button('Delete'),undefined);
 await h.button('Start a five-card round').props.onClick();await h.flush();
 assert.equal(h.viewer().props.moderator,true);assert.equal(typeof h.viewer().props.onDelete,'function');
});
