import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as interest from '../lib/internet-interest.mjs';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/bundle');
const {code}=babel.core().transformSync(readFileSync(new URL('../app/internet-interest.js',import.meta.url),'utf8'),{babelrc:false,configFile:false,presets:[[babel.presetReact(),{runtime:'automatic'}]],plugins:[babel.pluginTransformModulesCommonjs()]});
function markup(live,open=false){let slot=0;const exports={};vm.runInNewContext(code,{exports,require(name){if(name==='react')return {useId:()=>':help:',useState:initial=>[slot++===0?open:slot===2?live:initial,()=>{}],useEffect(){}};if(name.includes('internet-interest.mjs'))return interest;return require(name)}});return renderToStaticMarkup(React.createElement(exports.default,{id:'fixture'}))}
test('unrated, loading and unavailable interest leaves no box or placeholder',()=>{
 for(const data of [null,{level:0,label:'Coverage check delayed',status:'unavailable'},{level:0,label:'No recent coverage found'}])assert.equal(markup(data),'');
});
test('a rated meter is compact and allows dragging across its non-interactive area',()=>{
 const html=markup({level:3,label:'Rising star',status:'verified',checkedAt:'2026-10-20T00:00:00Z'});
 assert.match(html,/Rising star/);assert.doesNotMatch(html,/Updates automatically|Live check|checked|data-no-swipe/);assert.match(html,/How Internet interest is assessed/);
});
test('status and automatic-update explanation are available behind the question mark',()=>{
 const html=markup({level:3,label:'Rising star',status:'verified',checkedAt:'2026-10-20T00:00:00Z'},true);
 assert.match(html,/Updates automatically/);assert.match(html,/Live checks are delayed/);assert.match(html,/interest-explanation.*data-no-swipe/);
});
