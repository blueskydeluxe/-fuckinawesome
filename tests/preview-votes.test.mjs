import test from 'node:test';
import assert from 'node:assert/strict';
import {PREVIEW_KEY,PREVIEW_TTL,readPreviews,savePreviews,withoutCommitted,agreementReveal,countPreviews} from '../lib/preview-votes.mjs';
const id='12345678-abcd-1234-abcd-123456789abc',other='22345678-abcd-1234-abcd-123456789abc';
test('previews are bounded, expiring choices and tolerate blocked browser storage',()=>{
 const storage={setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 assert.deepEqual(savePreviews([{id,value:1}],storage,100),[{id,value:1}]);
 const payload=JSON.stringify({version:1,created:100,votes:[{id,value:1},{id,value:2},{id:'private',value:1},{id:other,value:0}]});
 assert.deepEqual(readPreviews(payload,100),[{id,value:2}]);
 assert.deepEqual(readPreviews(payload,100+PREVIEW_TTL),[]);assert.deepEqual(readPreviews(payload,99),[]);
 assert.deepEqual(readPreviews('not json'),[]);
 assert.equal(PREVIEW_KEY,'fna-preview-votes-v1');
});
test('completion preserves newer choices made in another tab',()=>{
 assert.deepEqual(withoutCommitted([{id,value:2},{id:other,value:1}],[{id,value:1}]),[{id,value:2},{id:other,value:1}]);
});
test('agreement uses actual samples, excludes a counted self-vote and avoids tiny percentages',()=>{
 assert.doesNotMatch(agreementReveal({up_votes:1},1),/%/);
 assert.equal(agreementReveal({up_votes:8,down_votes:2},1),'80% of 10 other people agreed with your preview.');
 assert.equal(agreementReveal({up_votes:9,down_votes:2},1,{counted:true}),'80% of 10 other voters agreed with you.');
 assert.doesNotMatch(agreementReveal({up_votes:1},1,{counted:true}),/%/);
});
test('commit sends only validated IDs and choices through the authenticated batch endpoint',async()=>{
 let args;const client={rpc:async(...input)=>{args=input;return {data:[{submission_id:id,outcome:'counted',vote_value:1}]}}};
 await countPreviews(client,[{id,value:1,token:'never send'}]);
 assert.deepEqual(args,['commit_preview_votes',{preview_votes:[{id,value:1}]}]);
 await assert.rejects(countPreviews({rpc:async()=>({error:{code:'PGRST202'}})},[{id,value:1}]),/previews are saved/);
 await assert.rejects(countPreviews({rpc:async()=>({data:[]})},[{id,value:1}]),/retry safely/);
});
