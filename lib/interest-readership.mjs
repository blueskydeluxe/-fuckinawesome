import {normalizeInterest} from './interest-coverage.mjs';
const DAY=86400000,headers={'User-Agent':'FuckinAwesomeInterest/1.0 (https://fuckinawesome.com)'};
export function matchingArticle(query,results,preferred){
 const key=normalizeInterest(query);
 if(!key||key.split(' ').length<2&&!(key.length>=5&&/\d/.test(key)))return null;
 return (results||[]).find(x=>typeof x.title==='string'&&(preferred?x.title===preferred:normalizeInterest(x.title.replace(/ \((?:car|vehicle|robot|device|hotel|building)\)$/i,''))===key))?.title||null;
}
export function readershipAssessment(data,title,now=Date.now()){
 const today=new Date(now).toISOString().slice(0,10).replaceAll('-',''),unique=new Map();
 for(const row of Array.isArray(data?.items)?data.items:[]){
  const stamp=String(row.timestamp||'').slice(0,8);if(!/^\d{8}$/.test(stamp)||stamp>=today||!Number.isSafeInteger(row.views)||row.views<0||row.agent!=='user'||row.granularity!=='daily'||normalizeInterest(typeof row.article==='string'?row.article.replaceAll('_',' '):'')!==normalizeInterest(title))continue;
  const date=Date.parse(`${stamp.slice(0,4)}-${stamp.slice(4,6)}-${stamp.slice(6,8)}T00:00:00Z`);if(!Number.isFinite(date)||now-date>16*DAY)continue;
  unique.set(stamp,row.views);
 }
 const rows=[...unique].sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);if(rows.length<3)return null;
 const through=rows.at(-1)[0],date=Date.parse(`${through.slice(0,4)}-${through.slice(4,6)}-${through.slice(6,8)}T00:00:00Z`);if(now-date>3*DAY)return null;
 const recent=rows.slice(-7),average=recent.reduce((sum,x)=>sum+x[1],0)/recent.length;
 const level=average>=5000?5:average>=1000?4:average>=200?3:average>=50?2:average>=10?1:0;
 return {title,url:`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ','_'))}`,totalViews:rows.reduce((sum,x)=>sum+x[1],0),days:rows.length,dailyAverage:Math.round(average),through:`${through.slice(0,4)}-${through.slice(4,6)}-${through.slice(6,8)}`,level};
}
export async function loadWikiReading(query,seed,fetcher=fetch,now=Date.now()){
 async function json(url){const response=await fetcher(url,{headers,signal:AbortSignal.timeout(4000),next:{revalidate:21600}});if(!response.ok)throw Error('Readership unavailable');const body=await response.text();if(body.length>150000)throw Error('Readership response too large');return JSON.parse(body)}
 try{
  let title=seed?.wikiTitle;
  if(!title){const search=new URL('https://en.wikipedia.org/w/api.php');search.search=new URLSearchParams({action:'query',list:'search',srsearch:query,srlimit:'5',format:'json'});const data=await json(search);title=matchingArticle(query,data.query?.search);}
  if(!title)return null;
  const end=new Date(now-DAY),start=new Date(now-14*DAY),stamp=date=>date.toISOString().slice(0,10).replaceAll('-','')+'00';
  const url=`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/${encodeURIComponent(title.replaceAll(' ','_'))}/daily/${stamp(start)}/${stamp(end)}`;
  return readershipAssessment(await json(url),title,now);
 }catch{return null}
}
