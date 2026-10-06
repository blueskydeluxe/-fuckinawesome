'use client';
import {useEffect,useState} from 'react';
import {db} from '../lib/supabase';
export default function DiscoveryRewards({memberId}){
 const [stats,setStats]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;setStats(null);setFailed(false);db.rpc('discovery_rewards',{member_id:memberId}).then(({data,error})=>{if(active){setStats(data?.[0]||null);setFailed(!!error)}});return()=>{active=false}},[memberId]);
 if(!stats)return <p className="muted">{failed?'Reputation couldn’t load. Try again later.':'Loading discovery reputation…'}</p>;
 const badges=[['First Fuckin Find',stats.approved>=1,'Get your first discovery approved.'],['On a Fuckin Roll',stats.approved>=3,'Share three approved discoveries.'],['Hall of Fame Finder',stats.fame>=1,'Reach 10 votes with more than 80% awesome.']];
 return <section className="rewards"><h3>Discovery reputation</h3><div className="reward-stats"><strong>{stats.reputation} points</strong><span>{stats.approved} approved discoveries</span><span>{stats.awesome_votes} awesome votes from others</span></div><div className="badges">{badges.map(([name,earned,goal])=><div key={name} className={'badge'+(earned?' earned':'')}><strong>{earned?'★':'☆'} {name}</strong><p>{earned?'Earned · ':''}{goal}</p></div>)}</div><p className="muted">Earn 5 points per approved discovery, plus 1 per awesome vote from someone else. Hall of Bullshit discoveries earn no points. Reputation and badges reflect your currently published discoveries.</p></section>;
}
