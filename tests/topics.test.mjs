import test from 'node:test';import assert from 'node:assert/strict';import {popularTopics} from '../lib/topics.mjs';
test('topics qualify at ten distinct discoveries and are ranked by frequency',()=>{const rows=Array.from({length:11},(_,i)=>({tags:i<9?['watches','art','art']:['art']}));assert.deepEqual(popularTopics(rows),[{tag:'art',count:11}]);rows.push({tags:['watches']});assert.deepEqual(popularTopics(rows),[{tag:'art',count:11},{tag:'watches',count:10}])});
test('invalid tags cannot become navigation labels',()=>{assert.deepEqual(popularTopics([{tags:['<script>','ART',null,'ok']}],1),[{tag:'art',count:1},{tag:'ok',count:1}])});

import {canonicalTag} from '../lib/tag-aliases.mjs';
test('near synonyms combine without counting a discovery twice',()=>{assert.deepEqual(popularTopics(Array.from({length:10},()=>({tags:['watches','watchmaking','horology']}))),[{tag:'watches',count:10}]);assert.equal(canonicalTag('automotive'),'cars');assert.equal(canonicalTag('automotive design'),'automotive design');assert.equal(canonicalTag('engineering'),'engineering');assert.equal(canonicalTag('motorcycles'),'motorcycles')});
