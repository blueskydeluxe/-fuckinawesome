const rank={UNKNOWN:0,VERY_UNLIKELY:1,UNLIKELY:2,POSSIBLE:3,LIKELY:4,VERY_LIKELY:5};
export function screeningVerdict(annotation){
 if(!annotation||!['adult','racy','violence'].every(k=>rank[annotation[k]]>0))return 'unavailable';
 if(rank[annotation.adult]>=4||rank[annotation.racy]>=4)return 'blocked';
 if(rank[annotation.adult]>=3||rank[annotation.racy]>=3||rank[annotation.violence]>=3)return 'review';
 return 'passed';
}
export async function screenImage(base64,key,fetcher=fetch){
 if(!key)return 'unavailable';
 try{const response=await fetcher('https://vision.googleapis.com/v1/images:annotate',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key},body:JSON.stringify({requests:[{image:{content:base64},features:[{type:'SAFE_SEARCH_DETECTION'}]}]}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)return 'unavailable';const data=await response.json();if(data.responses?.[0]?.error)return 'unavailable';return screeningVerdict(data.responses?.[0]?.safeSearchAnnotation);
 }catch{return 'unavailable'}
}
