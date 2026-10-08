import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';import React from 'react';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/bundle');
const {code}=babel.core().transformSync(readFileSync(new URL('../app/discovery-moderation.js',import.meta.url),'utf8'),{babelrc:false,configFile:false,presets:[[babel.presetReact(),{runtime:'automatic'}]],plugins:[babel.pluginTransformModulesCommonjs()]});
function host({verdict='passed',error=null,screenError=null}={}){
 let index=0,tree,calls=0,changed=0,lastRpc=null;const slots=[],exports={};
 const hooks={useState(initial){let n=index++;if(!(n in slots))slots[n]=initial;return [slots[n],value=>slots[n]=value]},useRef(initial){let n=index++;return slots[n]??(slots[n]={current:initial})}};
 const db={auth:{getSession:async()=>({data:{session:{access_token:'test'}}})},rpc:async(name,args)=>{calls++;lastRpc={name,args};return {error}}};
 vm.runInNewContext(code,{exports,require(name){return name==='react'?hooks:name.startsWith('react/')?require(name):{db}},AbortSignal,fetch:async()=>({ok:!screenError,json:async()=>({verdict,error:screenError})})});
 function render(){index=0;tree=exports.default({item:{id:'fixture',image_path:'cover'},onChanged:async()=>changed++})}
 function all(node=tree){return !node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(all)]}
 function button(label){return all().find(n=>n.type==='button'&&n.props.children===label)}
 async function approve(){render();button('Approve').props.onClick();render();assert.equal(button('Confirm approval').props.disabled,true);all().find(n=>n.type==='input').props.onChange({target:{checked:true}});render();await button('Confirm approval').props.onClick();render()}
 return {approve,get calls(){return calls},get changed(){return changed},get lastRpc(){return lastRpc},message:()=>all().find(n=>n.props?.role==='status')?.props.children};
}
test('confirmed moderator review uses the restricted override and removes the queue item after success',async()=>{const h=host();await h.approve();assert.equal(h.calls,1);assert.equal(h.changed,1);assert.equal(h.message(),'Approved and published.')});
test('moderator review overrides blocked or unavailable machine screening',async()=>{for(const options of [{verdict:'blocked'},{screenError:'Billing must be enabled'}]){const h=host(options);await h.approve();assert.equal(h.calls,1);assert.equal(h.changed,1);assert.equal(h.lastRpc.name,'approve_discovery_as_moderator');assert.deepEqual({...h.lastRpc.args},{discovery_id:'fixture',review_confirmed:true})}});
test('database approval errors remain visible beside the card',async()=>{const h=host({error:{message:'Permission denied'}});await h.approve();assert.equal(h.changed,0);assert.equal(h.message(),'Permission denied')});
