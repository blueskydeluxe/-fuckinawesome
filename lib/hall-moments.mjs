import {voteSummary} from './vote-summary.mjs';
export function hallProgress(item,kind='awesome') {
 const s=voteSummary(item.up_votes,item.down_votes,item.neutral_votes);
 const count=kind==='bullshit'?s.down:s.up;
 const qualified=s.total>=10&&count*5>s.total*4;
 return {...s,percent:s.total?count/s.total*100:0,qualified,needed:qualified?0:Math.max(10-s.total,4*s.total-5*count+1)};
}
export function countedVote(item,result,value){return {...item,up_votes:Number(result.up_votes),down_votes:Number(result.down_votes),neutral_votes:Number(result.neutral_votes),choice:value};}
export function voteMoment(item,result,value){
 const updated=countedVote(item,result,value),p=hallProgress(updated);
 if(result.entered_hall)return {title:'You helped make a Hall of Famer.',detail:'10+ real votes. More than 80% awesome. The community put it in the Hall.',celebrate:true};
 return {title:`Vote counted · ${p.total} ${p.total===1?'vote':'votes'}`,detail:value===1?`${p.percent.toFixed(0)}% awesome${p.qualified?' · In the Hall of Fame':` · ${p.needed} more Awesome ${p.needed===1?'vote':'votes'} needed to qualify`}`:value===2?'Meh counts toward the total and your voter level.':`${p.bullshitPercent.toFixed(0)}% bullshit · Your verdict is in.`,celebrate:false};
}
