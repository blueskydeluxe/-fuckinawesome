'use client';
import useCardSwipe from './use-card-swipe';
export default function SwipeDiscoveryCard({children,className='',enabled,id,busy,onVote,onClick}){
 const swipe=useCardSwipe({id,enabled,busy,onVote});
 return <article className={className+' '+swipe.className} style={swipe.style} {...swipe.handlers} onClick={onClick}>{enabled&&<div className="feed-swipe-cues"><span>← It’s Bullshit</span><strong>Swipe this card</strong><span>Awesome →</span></div>}{swipe.drag!==0&&<div className="swipe-verdict" aria-hidden="true">{swipe.drag>0?'FUCKIN AWESOME':'IT’S BULLSHIT'}</div>}{children}</article>;
}
