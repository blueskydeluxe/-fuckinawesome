'use client';
import {useEffect,useState} from 'react';
import {LevelBadge} from './voter-progress';
import {db} from '../lib/supabase';
export default function WeeklyDiscoverers(){
 const [levels,setLevels]=useState({});
 const [rows,setRows]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;db?.rpc('weekly_discoverers').then(async({data,error})=>{if(active&&data?.length){const result=await db.rpc('voter_levels',{member_ids:data.map(x=>x.member_id)});if(active&&!result.error)setLevels(Object.fromEntries((result.data||[]).map(x=>[x.member_id,x])))}if(active){setRows(data||[]);setFailed(!!error)}});return()=>{active=false}},[]);
 return <section className="weekly-board"><div><span className="tag">Community spotlight</span><h2>This week’s awesome finders</h2><p className="muted">The last 7 days. Real discoveries. Votes from other people.</p></div>{failed?<p role="status">The leaderboard couldn’t load. Try again later.</p>:rows===null?<p>Loading discoverers…</p>:rows.length?<ol>{rows.map(x=><li key={x.member_id}><a href={'/?profile='+x.member_id}>{x.display_name} <LevelBadge stats={levels[x.member_id]}/></a><span>{x.discoveries} new finds · {x.awesome_votes} awesome votes</span><strong>{x.points} points</strong></li>)}</ol>:<div className="leaderboard-start"><strong>Be one of the first awesome finders.</strong><p>Rankings start when at least three discoverers earn points. Share a great find and help build the hall.</p></div>}<p className="muted">5 points for each currently published discovery submitted in the last 7 days, plus 1 for each awesome vote from someone else during that time. Hall of Bullshit finds earn no points.</p></section>;
}
