'use client';
import {useRef,useState,useEffect} from 'react';
import {swipeIntent,swipeVote} from '../lib/swipe.mjs';
export default function useCardSwipe({id,enabled,busy,onVote}){
 const touch=useRef(null),suppressClick=useRef(false),[drag,setDrag]=useState(0);
 useEffect(()=>{touch.current=null;suppressClick.current=false;setDrag(0)},[id,enabled]);
 function down(e){if(!enabled||busy||e.pointerType!=='touch'||e.target.closest('a,input,textarea,select,iframe,audio,video,[data-no-swipe],button:not(.photo-open):not(.tile-preview):not(.discovery-title)'))return;suppressClick.current=false;touch.current={id:e.pointerId,x:e.clientX,y:e.clientY}}
 function move(e){const t=touch.current;if(!t||t.id!==e.pointerId)return;const dx=e.clientX-t.x,dy=e.clientY-t.y;const intent=swipeIntent(dx,dy);if(!t.active&&intent==='scroll'){touch.current=null;return}if(intent==='swipe'){t.active=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId)}if(t.active){e.preventDefault();setDrag(Math.max(-160,Math.min(160,dx)))}}
 function end(e){const t=touch.current;touch.current=null;setDrag(0);if(t?.active&&e.type!=='pointercancel'&&!busy){const value=swipeVote(e.clientX-t.x);if(value)onVote(id,value)}}
 return {className:`${enabled?'swipe-card ':''}${drag?'is-dragging ':''}${drag>0?'swipe-awesome':drag<0?'swipe-bullshit':''}`,style:drag?{transform:`translateX(${drag}px) rotate(${drag/25}deg)`}:undefined,drag,handlers:{onPointerDown:down,onPointerMove:move,onPointerUp:end,onPointerCancel:end,onClickCapture:e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false}}}};
}
