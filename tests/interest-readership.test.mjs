import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingArticle,readershipAssessment,loadWikiReading} from '../lib/interest-readership.mjs';
const now=Date.parse('2026-10-20T05:00:00Z');
const rows=(count=14,views=400)=>Array.from({length:count},(_,i)=>({timestamp:'202610'+String(6+i).padStart(2,'0')+'00',views,article:'Jaguar_Type_01',agent:'user',granularity:'daily'}));
test('subject matching accepts Type 1 aliases but never brand-wide pages or the wrong car',()=>{
 assert.equal(matchingArticle('Jaguar Type 1',[{title:'Jaguar Cars'},{title:'Jaguar Type 00'},{title:'Jaguar Type 01'}]),'Jaguar Type 01');
 assert.equal(matchingArticle('Jaguar Type 01',[{title:'Jaguar Cars'},{title:'Jaguar Type 00'}]),null);
 assert.equal(matchingArticle('Tesla Roadster',[{title:'Tesla Roadster (first generation)'}]),null);
});
test('readership uses real completed-day counts and changes with activity',()=>{
 const r=readershipAssessment({items:rows()},'Jaguar Type 01',now);assert.equal(r.level,3);assert.equal(r.totalViews,5600);assert.equal(r.through,'2026-10-19');
 assert.equal(readershipAssessment({items:rows(14,1500)},'Jaguar Type 01',now).level,4);
 assert.equal(readershipAssessment({items:rows(14,5)},'Jaguar Type 01',now).level,0);
});
test('duplicate dates, other articles, bots, future and malformed readings cannot inflate the score',()=>{
 const valid=rows(),bad={...valid[0],views:100000};const items=[...valid,valid[0],{...bad,article:'Jaguar_Cars'},{...bad,agent:'spider'},{...bad,timestamp:'2026102100'},{...bad,views:-2}];
 assert.equal(readershipAssessment({items},'Jaguar Type 01',now).totalViews,5600);
 assert.equal(readershipAssessment({items:'invalid'},'Jaguar Type 01',now),null);
 assert.equal(readershipAssessment({items:rows(3)},'Jaguar Type 01',now),null);
});
test('lookup failures return no measurement rather than manufactured interest',async()=>{
 assert.equal(await loadWikiReading('Jaguar Type 01',null,async()=>new Response('unavailable',{status:503}),now),null);
});

test('automatic lookup works without a hand-entered per-discovery rating',async()=>{
 const calls=[];const reading=await loadWikiReading('Jaguar Type 1',null,async url=>{calls.push(String(url));return calls.length===1?Response.json({query:{search:[{title:'Jaguar Cars'},{title:'Jaguar Type 01'}]}}):Response.json({items:rows()})},now);
 assert.equal(reading.level,3);assert.equal(calls.length,2);assert.match(calls[1],/Jaguar_Type_01/);
});
test('a broad brand result never gets borrowed for a specific launch',async()=>{
 let calls=0;const reading=await loadWikiReading('Jaguar Type 01',null,async()=>{calls++;return Response.json({query:{search:[{title:'Jaguar Cars'}]}})},now);
 assert.equal(reading,null);assert.equal(calls,1);
});
