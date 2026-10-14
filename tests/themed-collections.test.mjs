import test from 'node:test';import assert from 'node:assert/strict';
import {collections,collectionBySlug,featuredCollection,eligibleCollectionRows,selectOpeningRows,discoveryMixRows} from '../lib/themed-collections.mjs';
import {voteMoment} from '../lib/hall-moments.mjs';
const row=(id,category='Art',url='https://'+id+'.example/')=>({id,title:id,category,url,status:'approved',image_path:'cover',description:'A sufficiently useful discovery description.'});
test('collections rotate on a stable weekly schedule and respect interests',()=>{const week=new Date('2026-10-09T14:00:00Z');assert.deepEqual(featuredCollection('All',null,week),featuredCollection('All',null,new Date('2026-10-10T14:00:00Z')));assert.notEqual(featuredCollection('All',null,week).slug,featuredCollection('All',null,new Date('2026-10-16T14:00:00Z')).slug);assert.equal(featuredCollection('Machines','watchmaking',week).slug,'watches-worth-the-hype');assert.equal(featuredCollection('Music',null,week),null);assert.equal(collectionBySlug('not-a-collection'),null)});
test('withdrawn, uncovered, unrelated and empty discoveries cannot enter a collection',()=>{const c=collections[0],valid=row(c.ids[0]);const rows=[valid,{...row(c.ids[1]),status:'hidden'},{...row(c.ids[2]),image_path:null},{...row(c.ids[3]),description:''},row('outside')];assert.deepEqual(eligibleCollectionRows(c,rows),[valid])});
test('opening picks favor category and manufacturer variety over repeat products',()=>{const rows=[row('a','Technology','https://same.example/a'),row('b','Technology','https://same.example/b'),row('c','Adventure'),row('d','Food'),row('e','Art'),row('f','Technology')];const picks=selectOpeningRows(rows,5);assert.equal(new Set(picks.map(x=>x.category)).size,4);assert.equal(picks.filter(x=>x.url.startsWith('https://same.example')).length,1)});
test('Hall impact feedback uses actual before-and-after totals',()=>{const before={up_votes:5,down_votes:0,neutral_votes:0};const next={up_votes:6,down_votes:0,neutral_votes:0};assert.match(voteMoment(before,next,1).detail,/moved it closer/);assert.doesNotMatch(voteMoment(before,{...next,neutral_votes:5},1).detail,/moved it closer/);assert.match(voteMoment(before,{...before,neutral_votes:1},2).detail,/Meh counts/)});

test('personal collections exclude every cast verdict and include an undone vote again',()=>{const c=collections[0],rows=c.ids.map(id=>row(id));const votes={[c.ids[0]]:1,[c.ids[1]]:-1,[c.ids[2]]:2};assert.deepEqual(eligibleCollectionRows(c,rows,votes).map(x=>x.id),c.ids.slice(3));assert.equal(eligibleCollectionRows(c,rows,{...votes,[c.ids[2]]:0}).length,3);assert.equal(eligibleCollectionRows(c,rows).length,5)});

test('Discover introduces interests before repeats without modifying votes or the input ranking',()=>{
 const rows=[row('a','Technology','https://same.example/a'),row('b','Technology','https://same.example/b'),row('c','Adventure'),row('d','Food'),row('e','Art'),row('f','Technology')].map((x,i)=>({...x,up_votes:100-i}));
 const before=structuredClone(rows),mixed=discoveryMixRows(rows);
 assert.equal(new Set(mixed.slice(0,4).map(x=>x.category)).size,4);
 assert.deepEqual(rows,before);
 assert.deepEqual(new Set(mixed.map(x=>x.id)),new Set(rows.map(x=>x.id)));
 for(const x of mixed)assert.deepEqual(x,before.find(y=>y.id===x.id));
 assert.deepEqual(discoveryMixRows(rows),mixed);
});

test('Discover appends new batches without reshuffling already loaded full batches',()=>{
 const rows=Array.from({length:100},(_,i)=>row('item-'+i,['Art','Food','Technology'][i%3]));
 const first=discoveryMixRows(rows.slice(0,50));
 assert.deepEqual(discoveryMixRows(rows).slice(0,50),first);
 assert.equal(new Set(discoveryMixRows(rows).map(x=>x.id)).size,100);
 assert.deepEqual(discoveryMixRows([]),[]);
});
