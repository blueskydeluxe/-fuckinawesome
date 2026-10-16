export const interestLabels=['Early signal','Gaining interest','Rising star','Hot right now','On fire'];
const DAY=86400000;
// A reviewed editorial index, not a real-time measurement or search-volume estimate.
export function interestAssessment(record,now=Date.now()){
 const empty={level:0,label:'Interest unknown'};
 if(!record||record.methodology!=='reviewed-interest-v1')return empty;
 const reviewed=Date.parse(record.reviewedAt);
 if(!Number.isFinite(reviewed)||reviewed>now)return empty;
 if(now-reviewed>14*DAY)return {...empty,label:'Review due'};
 const sources=(record.sources||[]).filter(s=>{try{return new URL(s.url).protocol==='https:'&&s.label}catch{return false}});
 if(!sources.length||!Number.isInteger(record.level)||record.level<1||record.level>5||!record.summary)return empty;
 return {level:record.level,label:interestLabels[record.level-1],reviewedAt:record.reviewedAt,summary:record.summary,sources};
}
export function ringSegments(level){return Array.from({length:5},(_,i)=>{const a=(i*72-86)*Math.PI/180,b=((i+1)*72-94)*Math.PI/180,p=(r,t)=>`${32+r*Math.cos(t)},${32+r*Math.sin(t)}`;return {active:i<level,path:`M${p(29,a)} A29,29 0 0 1 ${p(29,b)} L${p(20,b)} A20,20 0 0 0 ${p(20,a)} Z`}})}
