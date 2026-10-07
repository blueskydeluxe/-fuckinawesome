export function swipeIntent(dx,dy){return Math.abs(dx)>=8&&Math.abs(dx)>Math.abs(dy)*1.15?'swipe':Math.abs(dy)>16&&Math.abs(dy)>Math.abs(dx)*1.25?'scroll':'wait'}
export function swipeVote(dx,velocity=0,width=450){const threshold=Math.min(90,Math.max(60,width*.2));return Math.abs(dx)>=threshold||Math.abs(dx)>=35&&Math.abs(velocity)>=.55&&Math.sign(dx)===Math.sign(velocity)?(dx>0?1:-1):0}
