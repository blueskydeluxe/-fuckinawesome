import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {submissionStatus} from '../lib/submission-status.mjs';
import {measurementAllowed} from '../lib/usage-consent.mjs';
import {socialCard,titleLines,xmlText,socialFormats} from '../lib/social-card.mjs';
test('screening can never imply publication before human approval',()=>{
 assert.equal(submissionStatus('pending','passed').label,'Awaiting review');
 assert.equal(submissionStatus('pending',null).label,'Screening pending');
 assert.equal(submissionStatus('pending','blocked').label,'Replace the cover');
 assert.equal(submissionStatus('pending','review').label,'Cover needs attention');
 assert.equal(submissionStatus('rejected','passed').label,'Needs a change');
 assert.equal(submissionStatus('hidden','passed').label,'Hidden');
 assert.equal(submissionStatus('approved','passed').label,'Live');
});
test('measurement requires affirmative consent and honors privacy signals',()=>{
 assert.equal(measurementAllowed(false),false);assert.equal(measurementAllowed(undefined),false);
 assert.equal(measurementAllowed(true),true);assert.equal(measurementAllowed(true,{doNotTrack:'1'}),false);
 assert.equal(measurementAllowed(true,{globalPrivacyControl:true}),false);
});
test('social titles are bounded and escaped before rendering',()=>{
 assert.equal(xmlText('<script>&"\''),'&lt;script&gt;&amp;&quot;&apos;');
 assert.ok(titleLines('long '.repeat(80)).length<=3);
 assert.ok(titleLines('a'.repeat(140)).every(line=>line.length<=35));
});
test('approved discoveries render downloadable PNGs in each social format',async()=>{
 const image=await sharp({create:{width:800,height:600,channels:3,background:'#244578'}}).png().toBuffer();
 for(const [format,size] of Object.entries(socialFormats)){
  const rendered=await socialCard(image,{title:'Something amazing < & > with a long title',category:'Art',up_votes:5,down_votes:2,neutral_votes:3,url:'https://example.com'},format);
  const meta=await sharp(rendered).metadata();assert.equal(meta.format,'png');assert.equal(meta.width,size.width);assert.equal(meta.height,size.height);
 }
 await assert.rejects(()=>socialCard(image,{},'invalid'));
});
