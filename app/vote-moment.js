'use client';
import {useEffect} from 'react';
import VoteMeters from './vote-meters';
import {cardImageUrl} from '../lib/card-image.mjs';
export default function VoteMoment({moment,onOpen,onDismiss}){
 useEffect(()=>{if(!moment)return;const timer=setTimeout(()=>onDismiss(moment.sequence),6500);return()=>clearTimeout(timer)},[moment]);
 if(!moment)return null;
 return <aside key={moment.sequence} className={'vote-moment'+(moment.celebrate?' hall-celebration':'')} role="status" aria-live="polite"><button className="moment-dismiss" aria-label="Dismiss vote result" onClick={()=>onDismiss(moment.sequence)}>×</button><div className="vote-result-summary"><button className="vote-result-thumbnail" aria-label={'View voted discovery: '+moment.item.title} onClick={()=>{onDismiss(moment.sequence);onOpen(moment.item)}}><img src={cardImageUrl(moment.item.id,320)} alt="" onError={e=>{e.currentTarget.style.visibility='hidden'}}/></button><div className="vote-result-copy"><strong>{moment.celebrate?moment.title:'Vote counted'}</strong><p className="vote-result-title">{moment.item.title}</p><VoteMeters up={moment.item.up_votes} down={moment.item.down_votes} neutral={moment.item.neutral_votes}/></div></div>{moment.celebrate&&<button onClick={()=>{onDismiss(moment.sequence);onOpen(moment.item)}}>View your Hall of Famer ↗</button>}</aside>;
}
