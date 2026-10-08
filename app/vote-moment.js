'use client';
import {useEffect,useState} from 'react';
export default function VoteMoment({moment,onOpen}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{if(!moment)return;setVisible(true);const timer=setTimeout(()=>setVisible(false),6500);return()=>clearTimeout(timer)},[moment]);
 if(!moment||!visible)return null;
 return <aside key={moment.sequence} className={'vote-moment'+(moment.celebrate?' hall-celebration':'')} role="status" aria-live="polite"><button className="moment-dismiss" aria-label="Dismiss vote result" onClick={()=>setVisible(false)}>×</button><small>{moment.item.title}</small><strong>{moment.title}</strong><span>{moment.detail}</span>{moment.celebrate&&<button onClick={()=>{setVisible(false);onOpen(moment.item)}}>View your Hall of Famer ↗</button>}</aside>;
}
