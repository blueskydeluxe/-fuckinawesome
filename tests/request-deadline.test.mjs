import test from 'node:test';
import assert from 'node:assert/strict';
import {withDeadline,previewJSON} from '../lib/request-deadline.mjs';

test('a permanently stalled request releases the UI with a retryable error',async()=>{
  await assert.rejects(withDeadline(()=>new Promise(()=>{}),15),/took too long/);
});
test('successful and failed requests settle without changing the result',async()=>{
  assert.equal(await withDeadline(()=>Promise.resolve('ready'),100),'ready');
  await assert.rejects(withDeadline(()=>Promise.reject(new Error('offline')),100),/offline/);
});
test('preview deadline covers a stalled response body and aborts the fetch',async()=>{
  const original=globalThis.fetch;let signal;
  globalThis.fetch=async(_,options)=>{signal=options.signal;return {ok:true,json:()=>new Promise(()=>{})}};
  try{await assert.rejects(previewJSON('/preview',{timeout:15}),/took too long/);assert.equal(signal.aborted,true)}finally{globalThis.fetch=original}
});
test('preview fetch safely handles non-OK responses',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>({ok:false});
  try{assert.deepEqual(await previewJSON('/preview'),{})}finally{globalThis.fetch=original}
});
test('closing a card cancels its preview request',async()=>{
  const original=globalThis.fetch;const caller=new AbortController();let signal;
  globalThis.fetch=async(_,options)=>{signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))};
  try{const pending=previewJSON('/preview',{signal:caller.signal});await new Promise(resolve=>setTimeout(resolve,0));caller.abort();await assert.rejects(pending,/aborted/);assert.equal(signal.aborted,true)}finally{globalThis.fetch=original}
});

import {verdictFeedback} from '../lib/vote-summary.mjs';
import {dailyCollectionRows,collectionBySlug} from '../lib/themed-collections.mjs';
import {cachedPreview} from '../lib/request-deadline.mjs';
test('crowd feedback excludes the current voter and treats ties and sparse votes honestly',()=>{
 assert.match(verdictFeedback(1,0,0,1),/helping set/);
 assert.match(verdictFeedback(6,0,0,1),/with the crowd/);
 assert.match(verdictFeedback(5,1,0,-1),/against the grain/);
 assert.match(verdictFeedback(4,3,0,1),/split/);
 assert.match(verdictFeedback(0,0,6,2),/with the crowd/);
});
test('daily surprise selection varies categories and skips all three vote types and hidden media',()=>{
 const rows=Array.from({length:15},(_,i)=>({id:String(i),category:['Food','Art','Machines','Technology','Adventure'][i%5],url:`https://brand${i}.example/`,status:'approved',image_path:'photo',description:'A useful and detailed description for this discovery.'}));
 const votes={'0':1,'1':-1,'2':2};
 const day=new Date('2026-10-14T12:00:00Z'),picks=dailyCollectionRows(rows,votes,day);
 assert.equal(picks.length,5);assert.equal(new Set(picks.map(x=>x.category)).size,5);
 assert.ok(picks.every(x=>!votes[x.id]));
 assert.deepEqual(picks,dailyCollectionRows(rows,votes,new Date('2026-10-14T23:59:00Z')));
 assert.notDeepEqual(picks,dailyCollectionRows(rows,votes,new Date('2026-10-15T12:00:00Z')));
 assert.deepEqual(dailyCollectionRows(rows.map(x=>({...x,status:'hidden'}))),[]);
 assert.equal(collectionBySlug('surprise-me').slug,'surprise-me');
});
test('prewarmed previews are reused and unsuccessful responses remain retryable',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({available:true,description:'Verified source'})}};
 try{await previewJSON('/cache-test-unique');assert.equal(cachedPreview('/cache-test-unique').available,true);await previewJSON('/cache-test-unique');assert.equal(calls,1);
 globalThis.fetch=async()=>{calls++;return {ok:false}};await previewJSON('/retry-test-unique');await previewJSON('/retry-test-unique');assert.equal(calls,3);
 }finally{globalThis.fetch=original}
});
