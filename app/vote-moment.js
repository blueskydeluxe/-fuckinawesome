'use client';
import {useEffect} from 'react';
export default function VoteMoment({moment,onOpen,onDismiss}){
 useEffect(()=>{if(!moment)return;const timer=setTimeout(()=>onDismiss(moment.sequence),6500);return()=>clearTimeout(timer)},[moment]);
 if(!moment)return null;
 return <aside key={moment.sequence} className={'vote-moment'+(moment.celebrate?' hall-celebration':'')} role="status" aria-live="polite"><button className="moment-dismiss" aria-label="Dismiss vote result" onClick={()=>onDismiss(moment.sequence)}>×</button><small>{moment.item.title}</small><strong>{moment.title}</strong><span>{moment.detail}</span>{moment.celebrate&&<button onClick={()=>{onDismiss(moment.sequence);onOpen(moment.item)}}>View your Hall of Famer ↗</button>}</aside>;
}
