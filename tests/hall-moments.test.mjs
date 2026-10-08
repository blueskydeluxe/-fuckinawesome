import test from 'node:test';import assert from 'node:assert/strict';
import {hallProgress,voteMoment} from '../lib/hall-moments.mjs';
test('qualification needs 10 votes and strictly more than 80 percent including neutral',()=>{
 assert.equal(hallProgress({up_votes:8,down_votes:0,neutral_votes:2}).qualified,false);
 assert.equal(hallProgress({up_votes:8,down_votes:0,neutral_votes:2}).needed,1);
 assert.equal(hallProgress({up_votes:9,down_votes:0,neutral_votes:0}).needed,1);
 assert.equal(hallProgress({up_votes:9,down_votes:0,neutral_votes:1}).qualified,true);
 assert.equal(hallProgress({up_votes:0,down_votes:9,neutral_votes:1},'bullshit').qualified,true);
});
test('needed votes is the actual minimum across mixed and empty tallies',()=>{
 for(let up=0;up<=12;up++)for(let down=0;down<=12;down++)for(let neutral=0;neutral<=3;neutral++){
  const item={up_votes:up,down_votes:down,neutral_votes:neutral},p=hallProgress(item);
  assert.ok(hallProgress({...item,up_votes:up+p.needed}).qualified);
  if(p.needed)assert.equal(hallProgress({...item,up_votes:up+p.needed-1}).qualified,false);
 }
});
test('only a confirmed server transition celebrates; neutral receives truthful feedback',()=>{
 assert.equal(voteMoment({title:'test'},{up_votes:9,down_votes:0,neutral_votes:1,entered_hall:true},1).celebrate,true);
 const moment=voteMoment({title:'test'},{up_votes:0,down_votes:0,neutral_votes:1,entered_hall:false},2);
 assert.match(moment.title,/1 vote$/);assert.match(moment.detail,/Meh counts/);assert.equal(moment.celebrate,false);
});
