import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {coverageQuery,coverageAssessment,publisherGroup,gdeltArticles,combineInterest,REFRESH_MS} from '../lib/interest-coverage.mjs';
import {interestAssessment} from '../lib/internet-interest.mjs';
const seeds=JSON.parse(readFileSync(new URL('../lib/interest-coverage.json',import.meta.url)));
const now=Date.parse('2026-10-20T02:00:00Z'),day=86400000;
const article=(host,title='Porsche Mission S reveal',date=now-day)=>({url:`https://${host}/story`,title,observedAt:new Date(date).toISOString()});
const assess=articles=>coverageAssessment({articles,query:'Porsche Mission S',sourceUrl:'https://newsroom.porsche.com/reveal',now});
test('specific independent coverage registers while brand-only and first-party mentions do not',()=>{
 const r=assess([article('arstechnica.com'),article('motortrend.com','Porsche Mission S design story'),article('wallpaper.com','Porsche Mission S concept details'),article('t3.com','Porsche Mission S supercar preview'),article('newsroom.porsche.com'),article('prnewswire.com'),article('other.com','Porsche reports earnings')]);
 assert.equal(r.publishers,3);assert.equal(r.level,3);assert.equal(r.sources.length,4);
 assert.equal(assess([article('newsroom.porsche.com')]).level,0);
});
test('duplicate stories, UTM links and publisher families cannot multiply a rating',()=>{
 const a=article('t3.com');assert.equal(assess([a,{...a,url:a.url+'?utm_source=x'},article('wallpaper.com','New Porsche Mission S unveiled'),article('another.com')]).publishers,1);
 assert.equal(publisherGroup('cincodias.elpais.com'),publisherGroup('elpais.com'));
});
test('coverage rises with new publishers and falls as evidence ages out',()=>{
 const items=Array.from({length:12},(_,i)=>article(`publisher${i}.com`,`Porsche Mission S report ${i}`));
 assert.equal(assess(items.slice(0,1)).level,1);assert.equal(assess(items.slice(0,2)).level,2);assert.equal(assess(items.slice(0,3)).level,3);assert.equal(assess(items.slice(0,6)).level,4);assert.equal(assess(items).level,5);
 assert.equal(coverageAssessment({articles:items,query:'Porsche Mission S',now:now+91*day}).level,0);
 assert.equal(assess([article('one.com',undefined,now+day)]).level,0);
});
test('Porsche verified evidence remains meaningful during a provider outage',()=>{
 const seed=seeds['a1f6b393-9c67-4a23-9151-7f2faedd9fd5'];assert.equal(assess(seed.sources).level,3);
 assert.equal(coverageQuery({title:'Porsche Mission S previews a mid-engine future'},seed),'Porsche Mission S');
 assert.equal(coverageQuery({title:'Tesla’s new Roadster takes its debut into the air'}),'Tesla Roadster');
});
test('malformed provider data and unsafe source links cannot become a rating',()=>{
 assert.throws(()=>gdeltArticles({error:'rate limited'}));
 assert.equal(assess([{...article('one.com'),url:'javascript:alert(1)'}]).level,0);
 assert.equal(gdeltArticles({articles:[{url:'https://example.com',title:'Porsche Mission S',seendate:'20261019T123000Z'}]})[0].observedAt,'2026-10-19T12:30:00Z');
});
function route({seedData=seeds,fetcher,publicItem=true,reading=null}={}){
 let time=now,calls=0;
 const source=readFileSync(new URL('../app/api/interest/[id]/route.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replaceAll('export const ','const ').replace('export async function GET','async function GET')+';GET';
 class Clock extends Date{static now(){return time}}
 const GET=vm.runInNewContext(source,{publicDiscovery:async id=>publicItem?{id,title:'Porsche Mission S previews a supercar',url:'https://newsroom.porsche.com/reveal'}:null,validDiscoveryId:id=>/^[a-f0-9-]{36}$/.test(id),seeds:seedData,reviewed:{},interestAssessment,coverageAssessment,coverageQuery,combineInterest,loadWikiReading:async()=>reading,gdeltArticles,REFRESH_MS,Date:Clock,Response,AbortSignal,URL,URLSearchParams,fetch:async()=>{calls++;return fetcher?fetcher(calls):new Response('busy',{status:429})}});
 return {get:async(id='a1f6b393-9c67-4a23-9151-7f2faedd9fd5')=>GET(new Request('https://test.invalid'),{params:Promise.resolve({id})}),advance:n=>time+=n,get calls(){return calls}};
}
test('route publication gate protects hidden discoveries and rejects malformed IDs',async()=>{
 const h=route({publicItem:false});assert.equal((await h.get()).status,404);assert.equal((await h.get('invalid')).status,404);assert.equal(h.calls,0);
});
test('rate-limited coverage is explicit, cached and backed by verified Porsche evidence',async()=>{
 const h=route(),first=await (await h.get()).json();assert.equal(first.level,3);assert.equal(first.status,'verified');
 await h.get();assert.equal(h.calls,1);h.advance(REFRESH_MS+1);const next=await (await h.get()).json();assert.equal(h.calls,2);assert.equal(next.level,3);assert.equal(next.status,'delayed');
});
test('provider failure without evidence is delayed, not a false low-interest result',async()=>{
 const h=route({seedData:{}}),r=await (await h.get()).json();assert.equal(r.label,'Coverage check delayed');assert.equal(r.status,'unavailable');
});

test('a refreshed provider snapshot can raise a rating and an outage retains it',async()=>{
 const h=route({seedData:{},fetcher:n=>n===3?new Response('busy',{status:429}):Response.json({articles:Array.from({length:n===1?1:6},(_,i)=>({url:`https://publication${i}.com/story`,domain:`publication${i}.com`,title:`Porsche Mission S report ${i}`,seendate:'20261019T123000Z'}))})});
 assert.equal((await (await h.get()).json()).level,1);h.advance(REFRESH_MS+1);
 const raised=await (await h.get()).json();assert.equal(raised.level,4);assert.equal(raised.status,'partial');h.advance(REFRESH_MS+1);
 const delayed=await (await h.get()).json();assert.equal(delayed.level,4);assert.equal(delayed.status,'delayed');assert.equal(delayed.checkedAt,raised.checkedAt);
});

test('readership keeps a broadly discussed discovery rated when news fails on a cold instance',async()=>{
 const reading={title:'Porsche Mission S',level:3,totalViews:952,days:4,through:'2026-10-19',url:'https://en.wikipedia.org/wiki/Porsche_Mission_S'};
 const h=route({seedData:{},reading}),result=await (await h.get()).json();assert.equal(result.level,3);assert.equal(result.status,'partial');assert.equal(result.reading.totalViews,952);
});
test('Jaguar has verified broad coverage and model-number aliases match without mixing Type 00',()=>{
 const seed=seeds['18aac5fd-cf94-438b-abf1-20620c8de223'];
 const r=coverageAssessment({articles:seed.sources,query:seed.query,sourceUrl:'https://media.jlr.com/jaguar',now});assert.equal(r.level,4);assert.equal(r.publishers,6);
 const match=coverageAssessment({articles:[{...article('one.com','Jaguar Type 1 revealed')}],query:'Jaguar Type 01',now});assert.equal(match.level,1);
 assert.equal(coverageAssessment({articles:[article('one.com','Jaguar Type 00 revealed')],query:'Jaguar Type 01',now}).level,0);
});
test('established coverage remains visible after the recent launch window ends',()=>{
 const items=Array.from({length:6},(_,i)=>article(`publisher${i}.com`,`Porsche Mission S report ${i}`,now-30*day));const r=assess(items);assert.equal(r.publishers,0);assert.equal(r.establishedPublishers,6);assert.equal(r.level,3);
});
