import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import * as ranking from '../lib/ranking.mjs';import * as previews from '../lib/preview-votes.mjs';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/bundle');
function component(file){const exports={};const {code}=babel.core().transformSync(readFileSync(new URL('../app/'+file,import.meta.url),'utf8'),{babelrc:false,configFile:false,presets:[[babel.presetReact(),{runtime:'automatic'}]],plugins:[babel.pluginTransformModulesCommonjs()]});vm.runInNewContext(code,{exports,require(name){if(name==='react'||name.startsWith('react/'))return require(name);if(name.includes('ranking'))return ranking;if(name.includes('preview-votes'))return previews;if(name.includes('google-analytics'))return {trackWebEvent(){}};if(name.includes('use-card-swipe'))return {__esModule:true,default:()=>({className:'',drag:0,ref:null,handlers:{}})};throw Error(name)}});return exports.default}
const item={id:'12345678-abcd-1234-abcd-123456789abc',title:'A physical signal for invisible air quality',description:'A small bird changes position when the room needs ventilation.',category:'Technology',author_name:'A discoverer',url:'https://example.com/bird',up_votes:1,down_votes:0};
test('discovery page text, image and source exist as real HTML without running effects',()=>{
 const html=renderToStaticMarkup(React.createElement(component('discovery-story.js'),{item}));
 assert.match(html,/<h1[^>]*>A physical signal/);assert.match(html,/<img[^>]+\/cover/);assert.match(html,/room needs ventilation/);assert.match(html,/href="https:\/\/example.com\/bird"/);assert.doesNotMatch(html,/Loading discoveries|100%|<script/);
 const safe=renderToStaticMarkup(React.createElement(component('discovery-story.js'),{item:{...item,url:'javascript:alert(1)',title:'<script>bad</script>'}}));assert.doesNotMatch(safe,/href="javascript:|<script>/);assert.match(safe,/&lt;script&gt;/);
});
test('first card is server rendered with a canonical discovery link and honest guest label',()=>{
 const html=renderToStaticMarkup(React.createElement(component('opening-deck.js'),{rows:[item]}));
 assert.match(html.replace(/<[^>]*>/g,''),/Swipe right on the internet/);assert.match(html,/Votes don’t count yet/);assert.match(html,/\/discovery\/12345678-abcd-1234-abcd-123456789abc\/cover/);assert.match(html,/A physical signal/);assert.doesNotMatch(html,/73%|4 out of 5/);
});
