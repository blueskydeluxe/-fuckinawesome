'use client';
import {voterProgress} from '../lib/voter-levels.mjs';
export function LevelBadge({stats}){return stats?<span className="level-badge" title={stats.votes_cast+' discoveries voted on'}>Lv. {stats.level}</span>:null}
export default function VoterProgress({stats}){if(!stats)return null;const x=voterProgress(stats.votes_cast);return <section className="voter-progress" aria-label="Your voter level"><div><strong>Level {x.level}</strong><span>{x.remaining} votes to Level {x.level+1}</span></div><progress aria-label={'Progress to Level '+(x.level+1)} value={x.progress} max={25}/><small>{x.progress} / 25 · {x.total} discoveries voted on</small></section>}
