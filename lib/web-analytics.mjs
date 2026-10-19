export const MEASUREMENT_ID='G-0CN05S2YRX';
export const CONSENT_KEY='fna-google-analytics-v1';
const names={open:'discovery_open',vote:'vote_cast',submission:'discovery_submit',share:'discovery_share'};
export function analyticsAllowed(choice,signals={}){return choice==='granted'&&signals.doNotTrack!=='1'&&signals.globalPrivacyControl!==true;}
export function safePage(raw,referrer=''){
 const u=new URL(raw), path=/^\/(?:privacy|community)?\/?$/.test(u.pathname)?u.pathname:'/';
 const data={page_location:u.origin+path,page_title:'Fuckin Awesome',page_referrer:''};
 try{data.page_referrer=new URL(referrer).origin+'/'}catch{}
 const source=u.searchParams.get('utm_source');
 if(['instagram','ig','facebook','twitter','x','reddit','google','bing'].includes(source)){
  data.campaign_source=source==='ig'?'instagram':source;
  const medium=u.searchParams.get('utm_medium');
  if(['organic','social','referral','email'].includes(medium))data.campaign_medium=medium;
  const campaign=u.searchParams.get('utm_campaign');
  if(/^(?:carlsbad|camerajet|intro|organic)_\d{8}$/.test(campaign||''))data.campaign_name=campaign;
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
