import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const babel=require('next/dist/compiled/babel/bundle');
const source=readFileSync(new URL('../app/hall.js',import.meta.url),'utf8');
const {code}=babel.core().transformSync(source,{babelrc:false,configFile:false,presets:[[babel.presetReact(),{runtime:'automatic'}]],plugins:[babel.pluginTransformModulesCommonjs()]});
function hall(){const exports={};vm.runInNewContext(code,{exports,require(name){if(name==='react'||name.startsWith('react/'))return require(name);return {__esModule:true,default:({children})=>React.createElement(React.Fragment,null,children),FollowButton:()=>null,LevelBadge:()=>null,configured:true,db:null,defaultPreferences:{approvals:true,comments:true,rewards:true,measurement:false},canonicalTag:x=>x}},URLSearchParams,React});return exports.default}
test('the home page can prerender with initialized hook dependencies',()=>{
 const html=renderToStaticMarkup(React.createElement(hall()));
 assert.ok(html.includes('STOP SCROLLING'));assert.ok(html.includes('Loading discoveries'));
});
test('a public discovery can prerender with its initial card',()=>{
 const html=renderToStaticMarkup(React.createElement(hall(),{initialDiscovery:'fixture',initialItem:{id:'fixture',author_id:'owner',title:'A great discovery',category:'Art',status:'approved',up_votes:10,down_votes:0,neutral_votes:0}}));
 assert.ok(html.includes('A great discovery'));assert.ok(html.includes('10 votes'));
});
