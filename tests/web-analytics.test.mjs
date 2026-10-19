import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebAnalytics,safePage,analyticsAllowed,MEASUREMENT_ID} from '../lib/web-analytics.mjs';
test('no analytics before consent or after withdrawal, including delayed script load',()=>{
 const w={navigator:{}};const a=createWebAnalytics(w);
 a.start('https://fuckinawesome.com/');a.event('vote');assert.equal(w.dataLayer,undefined);
 a.setConsent('granted');a.setConsent('denied');a.start('https://fuckinawesome.com/');assert.equal(w.dataLayer,undefined);
 a.setConsent('granted');a.start('https://fuckinawesome.com/');a.event('vote');const size=w.dataLayer.length;
 a.setConsent('denied');const after=w.dataLayer.length;a.event('vote');a.start('https://fuckinawesome.com/');assert.equal(w.dataLayer.length,after);assert.equal(w['ga-disable-'+MEASUREMENT_ID],true);assert.ok(after>size);
});
test('page payload strips authentication, search, profiles and referrer details',()=>{
 const p=safePage('https://fuckinawesome.com/?access_token=secret&q=private&profile=person&utm_source=facebook&utm_medium=organic&utm_campaign=camerajet_20261019#token','https://example.org/private?email=private@example.org');
 assert.equal(p.page_location,'https://fuckinawesome.com/');assert.equal(p.page_referrer,'https://example.org/');assert.equal(p.campaign_source,'facebook');assert.equal(p.campaign_name,'camerajet_20261019');assert.ok(!JSON.stringify(p).includes('secret'));assert.ok(!JSON.stringify(p).includes('private'));
 assert.equal(safePage('https://fuckinawesome.com/private/person@example.org').page_location,'https://fuckinawesome.com/');
});
test('counts one initial page view and only allowlisted events; respects browser privacy',()=>{
 for(const signals of [{doNotTrack:'1'},{globalPrivacyControl:true}])assert.equal(analyticsAllowed('granted',signals),false);
 const w={navigator:{}};const a=createWebAnalytics(w);a.setConsent('granted');a.start('https://fuckinawesome.com/');a.start('https://fuckinawesome.com/');a.page('https://fuckinawesome.com/?q=anything');a.event('vote');a.event('image');a.event('private text');
 assert.equal(w.dataLayer.filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);assert.equal(w.dataLayer.filter(x=>x[0]==='event'&&x[1]==='vote_cast').length,1);assert.equal(w.dataLayer.filter(x=>x[0]==='event').length,2);
});
