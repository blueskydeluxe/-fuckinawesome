export function voterProgress(votes=0){const total=Math.max(0,Math.floor(Number(votes)||0));return {total,level:1+Math.floor(total/25),progress:total%25,remaining:25-total%25}}
