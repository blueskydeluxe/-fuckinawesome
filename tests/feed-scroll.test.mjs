import test from 'node:test';
import assert from 'node:assert/strict';
import {readFeedBatch,mergeDiscoveries} from '../lib/feed-scroll.mjs';
const records=Array.from({length:123},(_,id)=>({id}));
test('look-ahead is not skipped between appended batches',async()=>{
  const offsets=[];
  const fetchPage=async offset=>{offsets.push(offset);return {data:records.slice(offset,offset+51)}};
  const first=await readFeedBatch(fetchPage);
  const second=await readFeedBatch(fetchPage,{offset:first.data.length});
  const last=await readFeedBatch(fetchPage,{offset:100});
  assert.deepEqual(offsets,[0,50,100]);
  assert.equal(first.more,true);assert.equal(second.more,true);assert.equal(last.more,false);
  assert.deepEqual(mergeDiscoveries(mergeDiscoveries(first.data,second.data),last.data),records);
});
test('background refresh keeps the loaded extent after unvoted rows disappear',async()=>{
  const remaining=records.slice(1);
  const result=await readFeedBatch(async offset=>({data:remaining.slice(offset,offset+51)}),{count:99});
  assert.deepEqual(result.data,remaining.slice(0,100));assert.equal(result.more,true);
});
test('duplicates update existing records without moving them',()=>{
  assert.deepEqual(mergeDiscoveries([{id:1},{id:2}],[{id:2,title:'Updated'},{id:3}]),[{id:1},{id:2,title:'Updated'},{id:3}]);
});
test('a failed later page does not return a partial replacement',async()=>{
  const error=new Error('offline');
  const result=await readFeedBatch(async offset=>offset?{error}:{data:records.slice(0,51)},{count:100});
  assert.equal(result.error,error);assert.deepEqual(result.data,[]);
});
