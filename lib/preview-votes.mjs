export const PREVIEW_KEY='fna-preview-votes-v1';
export const PREVIEW_TTL=24*60*60*1000;
export const PREVIEW_LIMIT=25;
const validId=id=>/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id||'');
export function readPreviews(raw,now=Date.now()){
 try{
  const data=JSON.parse(raw);
  if(data?.version!==1||!Number.isFinite(data.created)||data.created>now||now-data.created>=PREVIEW_TTL||!Array.isArray(data.votes))return [];
  const votes=new Map();
  for(const row of data.votes)if(validId(row?.id)&&[-1,1,2].includes(row.value))votes.set(row.id,{id:row.id,value:row.value});
  return [...votes.values()].slice(0,PREVIEW_LIMIT);
 }catch{return []}
}
export function savePreviews(votes,storage,now=Date.now()){
 // Store only a small, expiring set of public discovery IDs and choices. Never an auth token.
 const payload=JSON.stringify({version:1,created:now,votes});
 try{if(votes.length)storage.setItem(PREVIEW_KEY,payload);else storage.removeItem(PREVIEW_KEY)}catch{}
 return readPreviews(payload,now);
}
export function withoutCommitted(votes,submitted){
 return votes.filter(v=>!submitted.some(s=>s.id===v.id&&s.value===v.value));
}
export function agreementReveal(item,value,{counted=false}={}){
 const counts=[1,2,-1].map((choice,i)=>Math.max(0,(Number([item.up_votes,item.neutral_votes,item.down_votes][i])||0)-(counted&&value===choice?1:0)));
 const total=counts.reduce((a,b)=>a+b,0);
 if(total<10)return counted?'Vote counted. You’re helping set the verdict.':`Preview saved. Still early: ${total} community ${total===1?'vote':'votes'} so far.`;
 const percent=Math.round(counts[[1,2,-1].indexOf(value)]/total*100);
 return `${percent}% of ${total} other ${counted?'voters':'people'} agreed with ${counted?'you':'your preview'}.`;
}
export async function countPreviews(client,votes){
 const clean=readPreviews(JSON.stringify({version:1,created:Date.now(),votes}));
 if(!clean.length)return [];
 const {data,error}=await client.rpc('commit_preview_votes',{preview_votes:clean});
 if(error)throw Error(error.code==='PGRST202'?'Counting preview votes is temporarily unavailable. Your previews are saved; please try again later.':error.message||'Your previews could not be counted. Please try again.');
 if(!Array.isArray(data)||data.length!==clean.length||new Set(data.map(r=>r.submission_id)).size!==clean.length||data.some(r=>!clean.some(v=>v.id===r.submission_id)||!['counted','existing','unavailable'].includes(r.outcome)||![-1,1,2].includes(r.vote_value)))throw Error('Could not confirm every preview vote. Your previews are saved; retry safely.');
 return data;
}
