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
test('active social campaigns retain attribution while private query values stay excluded',()=>{
 for(const campaign of ['five_votes_20261020','your_call_20261022','your_find_20261024']){
  const data=safePage('https://fuckinawesome.com/?utm_source=facebook&utm_medium=organic_social&utm_campaign='+campaign+'&email=private@example.org');
  assert.equal(data.campaign_source,'facebook');assert.equal(data.campaign_medium,'organic_social');assert.equal(data.campaign_name,campaign);
  assert.ok(!JSON.stringify(data).includes('private'));
 }
 const bio=safePage('https://fuckinawesome.com/?utm_source=ig&utm_medium=social&utm_content=link_in_bio');
 assert.equal(bio.campaign_source,'instagram');assert.equal(bio.campaign_content,'link_in_bio');
 for(const source of ['pinterest','flipboard','newsletter','creator'])assert.equal(safePage('https://fuckinawesome.com/?utm_source='+source+'&utm_medium=referral').campaign_source,source);
 const rejected=safePage('https://fuckinawesome.com/?utm_source=facebook&utm_medium=private@example.org&utm_campaign=private@example.org&utm_content=private@example.org');
 assert.equal(rejected.campaign_medium,undefined);assert.equal(rejected.campaign_name,undefined);assert.equal(rejected.campaign_content,undefined);
});
test('public landing pages remain distinct without exposing private routes or auth fragments',()=>{
 const discovery='/discovery/12345678-abcd-1234-abcd-123456789abc';
 for(const path of ['/about','/guides','/guides/discover-beyond-your-feed',discovery])assert.equal(safePage('https://fuckinawesome.com'+path+'?access_token=secret#secret').page_location,'https://fuckinawesome.com'+path);
 for(const path of ['/profile/person@example.org','/guides/private-text','/discovery/private@example.org'])assert.equal(safePage('https://fuckinawesome.com'+path).page_location,'https://fuckinawesome.com/');
 const w={navigator:{}};const a=createWebAnalytics(w);a.setConsent('granted');a.start('https://fuckinawesome.com/');a.page('https://fuckinawesome.com'+discovery);a.page('https://fuckinawesome.com'+discovery+'?q=private');
 assert.equal(w.dataLayer.filter(x=>x[0]==='event'&&x[1]==='page_view').length,2);
});
