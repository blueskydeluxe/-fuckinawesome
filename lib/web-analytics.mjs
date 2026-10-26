import {learnPaths} from './learn-pages.mjs';
export const MEASUREMENT_ID='G-0CN05S2YRX';
export const CONSENT_KEY='fna-google-analytics-v1';
const names={open:'discovery_open',vote:'vote_cast',submission:'discovery_submit',share:'discovery_share',first_swipe:'first_swipe',five_previews:'five_previews',preview_signup:'preview_signup_started',preview_signin:'authenticated_preview_ready',preview_votes_counted:'preview_votes_counted'};
const publicPaths=new Set(['/','/privacy','/community','/guides',...learnPaths]);
const sources=new Set(['instagram','ig','facebook','twitter','x','reddit','google','bing','pinterest','flipboard','newsletter','creator']);
const media=new Set(['organic','social','organic_social','referral','email']);
// Only public campaign labels go to Google; never forward arbitrary query values.
const campaignPattern=/^(?:carlsbad|camerajet|intro|organic|five_votes|your_call|your_find|discovery|weekly_picks|creator_feature)_\d{8}$/;
const contentLabels=new Set(['link_in_bio','reel','story','feed','pin','community_post','newsletter_link','creator_link']);
export function analyticsAllowed(choice,signals={}){return choice==='granted'&&signals.doNotTrack!=='1'&&signals.globalPrivacyControl!==true;}
export function safePage(raw,referrer=''){
 const u=new URL(raw),candidate=u.pathname.replace(/\/$/,'')||'/';
 const path=publicPaths.has(candidate)||/^\/discovery\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(candidate)?candidate:'/';
 const data={page_location:u.origin+path,page_title:'Fuckin Awesome',page_referrer:''};
 try{data.page_referrer=new URL(referrer).origin+'/'}catch{}
 const source=u.searchParams.get('utm_source');
 if(sources.has(source)){
  data.campaign_source=source==='ig'?'instagram':source;
  const medium=u.searchParams.get('utm_medium');
  if(media.has(medium))data.campaign_medium=medium;
  const campaign=u.searchParams.get('utm_campaign');
  if(campaignPattern.test(campaign||''))data.campaign_name=campaign;
  const content=u.searchParams.get('utm_content');
  if(contentLabels.has(content))data.campaign_content=content;
 }
 return data;
}
export function createWebAnalytics(w){
 let choice='denied',started=false,lastPage='';
 const allowed=()=>analyticsAllowed(choice,w.navigator);
 function send(){w.dataLayer=w.dataLayer||[];w.dataLayer.push(arguments);}
 function setConsent(next){
  choice=next;w['ga-disable-'+MEASUREMENT_ID]=!allowed();
  if(started)send('consent','update',{analytics_storage:allowed()?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  if(!allowed())lastPage='';
 }
 function page(raw,referrer){
  if(!started||!allowed())return;
  const data=safePage(raw,referrer);
  if(data.page_location===lastPage)return;
  lastPage=data.page_location;
  send('set',data);send('event','page_view',data);
 }
 function start(raw,referrer){
  if(!allowed())return;
  if(!started){
   send('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   send('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   send('js',new Date());send('set',safePage(raw,referrer));
   send('config',MEASUREMENT_ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:7776000,...safePage(raw,referrer)});
   started=true;
  }
  page(raw,referrer);
 }
 function event(name){if(started&&allowed()&&names[name])send('event',names[name]);}
 return {setConsent,start,page,event};
}
