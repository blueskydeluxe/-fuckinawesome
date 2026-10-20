import {interestLabels} from './internet-interest.mjs';
const DAY=86400000;
export const REFRESH_MS=15*60*1000;
export const normalizeInterest=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\b0+(\d+)\b/g,(_,n)=>String(Number(n)));
const normalize=normalizeInterest;
export function coverageQuery(item,seed){
 if(seed?.query)return seed.query;
 let title=String(item.title||'').replace(/^(?:the|a|an)\s+/i,'').replace(/[’']s\b/gi,'').split(/[:—]|\b(?:previews|puts|unfolds|brings|takes|makes|that|combines|turns|is|with|for)\b/i)[0].replace(/\bnew\b/gi,'').trim();
 return title.split(/\s+/).slice(0,6).join(' ').replace(/[^a-zA-Z0-9 .-]/g,'').trim();
}
export function publisherGroup(host){
 host=host.toLowerCase().replace(/^www\./,'');
 const families=[['future','t3.com','wallpaper.com','digitalcameraworld.com','techradar.com','tomsguide.com','autoexpress.co.uk','evo.co.uk','creativebloq.com'],['hearst','caranddriver.com','roadandtrack.com','popularmechanics.com','motortrend.com'],['conde-nast','arstechnica.com','wired.com'],['prisa','elpais.com','as.com']];
 for(const [group,...domains] of families)if(domains.some(d=>host===d||host.endsWith('.'+d)))return group;
 return host.split('.').slice(-(host.endsWith('.co.uk')?3:2)).join('.');
}
export function coverageAssessment({articles=[],query,sourceUrl,now=Date.now(),checkedAt=new Date(now).toISOString()}){
 const words=normalize(query).split(' ').filter(Boolean),groups=new Set(),established=new Set(),titles=new Set(),urls=new Set(),sources=[];
 let own='';try{own=publisherGroup(new URL(sourceUrl).hostname)}catch{}
 if(words.length<2&&!words.some(x=>x.length>=7&&/\d/.test(x)))return {level:0,label:'Needs a specific search',checkedAt,sources:[]};
 for(const a of articles.slice(0,150)){
  let u;try{u=new URL(a.url)}catch{continue}
  if(u.protocol!=='https:'||u.username||u.password)continue;
  const host=u.hostname.toLowerCase(),group=publisherGroup(host);
  if(group===own||/(^|\.)(prnewswire|businesswire|globenewswire|newswire)\./.test(host))continue;
  const date=Date.parse(a.observedAt);if(!Number.isFinite(date)||date>now||now-date>90*DAY)continue;
  const title=normalize(a.title),tokens=new Set(title.split(' '));
  if(!a.verified&&!words.every(w=>tokens.has(w)))continue;
  u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);
  if(urls.has(u.href)||title&&titles.has(title))continue;
  urls.add(u.href);if(title)titles.add(title);established.add(group);if(now-date<=14*DAY)groups.add(group);
  sources.push({url:u.href,label:a.label||host,observedAt:a.observedAt});
 }
 const count=groups.size,recentLevel=count>=12?5:count>=6?4:count>=3?3:count>=2?2:count?1:0;
 const historyLevel=established.size>=6?3:established.size>=3?2:established.size?1:0,level=Math.max(recentLevel,historyLevel);
 return {methodology:'interest-v3',level,label:level?interestLabels[level-1]:'No recent coverage found',checkedAt,publishers:count,establishedPublishers:established.size,articleCount:sources.length,sources:sources.slice(0,12),summary:established.size?`${count} publisher groups in the last 14 days; ${established.size} across 90 days. Older coverage remains a limited established-interest signal.`:'No matching independent coverage was found in the available index. This does not establish low interest.'};
}
export function gdeltArticles(data){
 if(!data||!Array.isArray(data.articles))throw Error('Invalid coverage response');
 return data.articles.slice(0,100).map(a=>{const d=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(a.seendate||'');return {url:a.url,title:a.title,label:a.domain,observedAt:d?`${d[1]}-${d[2]}-${d[3]}T${d[4]}:${d[5]}:${d[6]}Z`:''}});
}

export function combineInterest(coverage,reading){
 if(!reading?.level)return {...coverage,reading:reading||null};
 const level=Math.max(coverage.level,reading.level);
 return {...coverage,level,label:interestLabels[level-1],reading,sources:[...coverage.sources,{url:reading.url,label:`Wikipedia readership: ${reading.title}`}],summary:[coverage.summary,`${reading.totalViews.toLocaleString('en-US')} Wikipedia page views over ${reading.days} completed days, through ${reading.through}.`].join(' ')};
}
