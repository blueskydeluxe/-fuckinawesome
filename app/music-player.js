'use client';
import {useEffect,useState} from 'react';
import {db} from '../lib/supabase';
import {musicEmbed,musicLink} from '../lib/music.mjs';
export default function MusicPlayer({item}) {
 const [music,setMusic]=useState(null),[audio,setAudio]=useState(null),[play,setPlay]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;setMusic(null);setAudio(null);setPlay(false);setFailed(false);db.from('discovery_music').select('*').eq('submission_id',item.id).maybeSingle().then(async({data,error})=>{if(!active)return;if(error){setFailed(true);return}setMusic(data);if(data?.audio_path){const result=await db.storage.from('discovery-music').createSignedUrl(data.audio_path,1800);if(active){setAudio(result.data?.signedUrl||null);setFailed(!!result.error)}}});return()=>{active=false}},[item.id]);
 const spotify=musicLink(music?.spotify_url||item.url,'spotify'),embed=musicEmbed(spotify);
 return <section className="music-player" aria-label="Listen to this discovery">
  <h3>Listen here</h3>
  {music&&<p><strong>{music.artist_name}</strong> · {music.entry_kind==='band'?'Artist / band':'Song'}</p>}
  {audio&&<audio key={audio} src={audio} controls preload="none" aria-label={'Play '+item.title} onError={()=>setFailed(true)}>Your browser does not support audio playback.</audio>}
  {embed&&(play?<iframe src={embed} title={'Spotify player: '+item.title} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"/>:<button className="primary music-play-here" onClick={()=>setPlay(true)}>▶ {audio?'Play Spotify preview here':'Play here'}</button>)}
  {embed&&<p className="muted">Play inside this page using Spotify’s player. Spotify controls preview length and may require sign-in for full playback.</p>}
  <div className="actions music-external-links">{[['Spotify',spotify],['Apple Music',music?.apple_url],['Amazon Music',music?.amazon_url]].filter(([,url])=>url).map(([name,url])=><a className="button-link" key={name} href={url} target="_blank" rel="noopener noreferrer">Open in {name} ↗</a>)}</div>
  {failed&&<p role="status">The uploaded track couldn’t load. Try reopening this discovery or use a streaming link.</p>}
  {!audio&&!embed&&<p className="muted">This discovery has an external streaming link. Artists can upload an MP3 for full playback here.</p>}
 </section>
}
