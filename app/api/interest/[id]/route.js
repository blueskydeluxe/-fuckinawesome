import {publicDiscovery,validDiscoveryId} from '../../../../lib/public-discovery.mjs';
import seeds from '../../../../lib/interest-coverage.json';
import reviewed from '../../../../lib/interest-ratings.json';
import {interestAssessment} from '../../../../lib/internet-interest.mjs';
import {coverageQuery,coverageAssessment,gdeltArticles,REFRESH_MS} from '../../../../lib/interest-coverage.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;
const cache=new Map(),pending=new Map();let nextRequest=0;
async function assess(item){
 const now=Date.now(),seed=seeds[item.id],query=coverageQuery(item,seed);
 let articles=[],available=false;
 // Fixed upstream, bounded requests and backoff. No user-supplied fetch destinations.
 if(query.length>=5&&now>=nextRequest){
  nextRequest=now+6000;
  try{const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');url.search=new URLSearchParams({query:`"${query}"`,mode:'artlist',format:'json',maxrecords:'100',timespan:'14d',sort:'datedesc'});
   const response=await fetch(url,{signal:AbortSignal.timeout(7000),next:{revalidate:900}});
   if(!response.ok)throw Error('Coverage unavailable');
   const body=await response.text();if(body.length>300000)throw Error('Coverage too large');
   articles=gdeltArticles(JSON.parse(body));available=true;
  }catch{nextRequest=Date.now()+60000}
 }
 const result=coverageAssessment({articles:[...articles,...(seed?.sources||[])],query,sourceUrl:item.url,now});
 const previous=cache.get(item.id)?.result;
 if(!available&&previous?.level&&Date.parse(previous.checkedAt)>now-86400000){return {...previous,status:'delayed',lastAttemptAt:new Date(now).toISOString()}}
 const legacy=interestAssessment(reviewed[item.id],now);
 if(!result.level&&!available&&legacy.level)return {...legacy,status:'reviewed',checkedAt:legacy.reviewedAt};
 return {...result,status:available?'current':result.level?'verified':'unavailable',label:!available&&!result.level?'Coverage check delayed':result.label};
}
export async function GET(request,{params}){
 const {id}=await params;
 const headers={'Cache-Control':'no-store'};
 if(!validDiscoveryId(id))return Response.json({error:'Not found'},{status:404,headers});
 // Check publication before returning cached evidence, too.
 const item=await publicDiscovery(id);if(!item)return Response.json({error:'Not found'},{status:404,headers});
 const entry=cache.get(id);
 if(entry&&entry.until>Date.now())return Response.json(entry.result,{headers});
 try{if(!pending.has(id))pending.set(id,assess(item).then(result=>{if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(id,{result,until:Date.now()+REFRESH_MS});return result}).finally(()=>pending.delete(id)));
 return Response.json(await pending.get(id),{headers});
 }catch{return Response.json({error:'Coverage check delayed'},{status:503,headers})}
}
