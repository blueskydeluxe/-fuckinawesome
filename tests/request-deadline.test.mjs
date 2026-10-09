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
