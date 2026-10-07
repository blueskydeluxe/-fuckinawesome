export function swipeIntent(dx,dy){return Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)?'scroll':Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5?'swipe':'wait'}
export function swipeVote(dx){return Math.abs(dx)>=90?(dx>0?1:-1):0}
