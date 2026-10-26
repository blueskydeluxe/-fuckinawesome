import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import * as previews from '../lib/preview-votes.mjs';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/bundle');
const {code}=babel.core().transformSync(readFileSync(new URL('../app/opening-deck.js',import.meta.url),'utf8'),{babelrc:false,configFile:false,presets:[[babel.presetReact(),{runtime:'automatic'}]],plugins:[babel.pluginTransformModulesCommonjs()]});
const rows=Array.from({length:8},(_,n)=>({id:`${n+1}2345678-abcd-1234-abcd-123456789abc`,title:'Extraordinary find '+n,category:'Art',description:'An original discovery worth exploring.',up_votes:1,down_votes:0,neutral_votes:0}));
function deck({member=null,storage=new Map(),reject=false,gate=null}={}){
 let cursor=0,dirty=true,tree,effects=[],user=member,calls=0,logins=0;const slots=[];
 const react={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;dirty=true}]},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial})},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((x,n)=>!Object.is(x,old[n]))){slots[i]=deps;effects.push(fn)}}};
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const exports={};vm.runInNewContext(code,{exports,require(name){if(name==='react')return react;if(name.startsWith('react/'))return require(name);if(name.includes('preview-votes'))return previews;if(name.includes('google-analytics'))return {trackWebEvent(){}};return {__esModule:true,default:()=>({className:'',drag:0,ref:{current:null},handlers:{}})}},localStorage,window:{addEventListener(){},removeEventListener(){}},Set});
 async function flush(){for(let n=0;n<8;n++){if(dirty){cursor=0;dirty=false;tree=exports.default({rows,user,onLogin:()=>logins++,onCount:async votes=>{calls++;if(gate)await gate;if(reject)throw Error('Network failed');return votes.map(v=>({submission_id:v.id,vote_value:v.value,outcome:'counted'}))},onVote:async()=>({confirmed:true,item:{up_votes:2}}),onOpen(){}});for(const effect of effects.splice(0))effect()}await Promise.resolve()}return tree}
 const all=(node=tree)=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(all)];
 const textOf=node=>typeof node==='string'||typeof node==='number'?String(node):React.Children.toArray(node?.props?.children).map(textOf).join('');
 const button=text=>all().find(x=>x.type==='button'&&textOf(x)===text);
 return {flush,all,button,storage,get calls(){return calls},get logins(){return logins},signin(){user={id:'member'};dirty=true}};
}
test('five guest previews make no vote writes and present an honest signup prompt',async()=>{
 const h=deck();await h.flush();
 for(let n=0;n<5;n++){await h.button('Awesome →').props.onClick();await h.flush()}
 assert.equal(h.calls,0);assert.ok(h.button('Lock in my votes'));assert.ok(h.button('Keep swiping (votes won’t count)'));
 const html=renderToStaticMarkup(h.all()[0]);assert.match(html,/5 finds/);assert.doesNotMatch(html,/4 out of 5|4\/5|Vote counted/);
 await h.button('Lock in my votes').props.onClick();await h.flush();assert.equal(h.logins,1);assert.equal(h.calls,0);
 h.signin();await h.flush();assert.equal(h.calls,0); // Authentication alone must not cast a vote.
 await h.button('Lock in my votes').props.onClick();await h.flush();assert.equal(h.calls,1);assert.equal(h.storage.has(previews.PREVIEW_KEY),false);
});
test('a failed commit keeps the draft and rapid confirmations produce one request',async()=>{
 const storage=new Map();previews.savePreviews(rows.slice(0,5).map(r=>({id:r.id,value:1})),{setItem:(k,v)=>storage.set(k,v)});
 const failed=deck({member:{id:'member'},storage,reject:true});await failed.flush();
 await failed.button('Lock in my votes').props.onClick();await failed.flush();assert.equal(previews.readPreviews(storage.get(previews.PREVIEW_KEY)).length,5);
 assert.ok(failed.all().some(x=>x.props?.role==='alert'&&x.props.children==='Network failed'));
 let release;const gate=new Promise(resolve=>{release=resolve}),h=deck({member:{id:'member'},storage,gate});await h.flush();
 const click=h.button('Lock in my votes').props.onClick;const pending=click();await click();assert.equal(h.calls,1);release();await pending;await h.flush();
});
