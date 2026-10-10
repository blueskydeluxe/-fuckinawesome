export function swipeIntent(dx,dy){const x=Math.abs(dx),y=Math.abs(dy);return y>=10&&y>=x*.75?'scroll':x>=16&&x>y*1.8?'swipe':'wait'}
export function swipeVote(dx,velocity=0,width=450){const threshold=Math.min(90,Math.max(60,width*.2));return Math.abs(dx)>=threshold||Math.abs(dx)>=35&&Math.abs(velocity)>=.55&&Math.sign(dx)===Math.sign(velocity)?(dx>0?1:-1):0}
