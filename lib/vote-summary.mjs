export const MEH_VOTE=2;
export function voteSummary(up=0,down=0,neutral=0){up=Number(up)||0;down=Number(down)||0;neutral=Number(neutral)||0;const total=up+down+neutral;return {up,down,neutral,total,awesomePercent:total?up/total*100:0,bullshitPercent:total?down/total*100:0}}

export function verdictFeedback(up,down,neutral,vote){
 const counts=[Math.max(0,(Number(up)||0)-(vote===1?1:0)),Math.max(0,(Number(neutral)||0)-(vote===2?1:0)),Math.max(0,(Number(down)||0)-(vote===-1?1:0))];
 if(counts.reduce((a,b)=>a+b,0)<5)return 'You’re helping set the verdict.';
 const highest=Math.max(...counts),leaders=counts.map((n,i)=>n===highest?i:-1).filter(i=>i>=0);
 if(leaders.length>1)return 'The crowd is split. Your call counts.';
 return [1,2,-1][leaders[0]]===vote?'You’re with the crowd.':'You went against the grain.';
}
