'use client';
import VoterProgress from './voter-progress';
import MusicPlayer from './music-player';
import SourceText from './source-text';
import {useEffect,useRef,useState} from 'react';
import {discoveryPhotoUrl} from '../lib/discovery-photo-url';
import {safeLink} from '../lib/ranking.mjs';
import VoteMeters from './vote-meters';
export default function DiscoveryDialog({queueProgress,onUndo,tags=[],onTag,item,onClose,onPrevious,onNext,hasPrevious,hasNext,position,onVote,onSave,onShare,vote,saved,busy,message}){
 const dialog=useRef(null),[preview,setPreview]=useState(null),[photo,setPhoto]=useState(null),[playing,setPlaying]=useState(false),[imageFailed,setImageFailed]=useState(false);
 const touch=useRef(null),[drag,setDrag]=useState(0);
 function startSwipe(e){if(e.pointerType!=='touch'||busy||vote||item.status!=='approved'||playing||e.target.closest('button,a,iframe,audio'))return;touch.current={id:e.pointerId,x:e.clientX,y:e.clientY};}
 function moveSwipe(e){const t=touch.current;if(!t||t.id!==e.pointerId)return;const dx=e.clientX-t.x,dy=e.clientY-t.y;if(!t.active&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){touch.current=null;return}if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5){t.active=true;e.currentTarget.setPointerCapture(e.pointerId)}if(t.active)setDrag(Math.max(-180,Math.min(180,dx)));}
 function endSwipe(e){const t=touch.current;touch.current=null;setDrag(0);if(t?.active&&e.type!=='pointercancel'&&Math.abs(e.clientX-t.x)>=90&&!busy&&!vote)onVote(item.id,e.clientX>t.x?1:-1);}
 useEffect(()=>{touch.current=null;setDrag(0);setPreview(null);setPhoto(null);setPlaying(false);setImageFailed(false);dialog.current?.scrollTo(0,0)},[item.id]);
 useEffect(()=>{function keys(e){if(e.target.closest('input,textarea,select,iframe'))return;if(e.key==='ArrowRight'&&hasNext){e.preventDefault();onNext()}if(e.key==='ArrowLeft'&&hasPrevious){e.preventDefault();onPrevious()}}const el=dialog.current;el.addEventListener('keydown',keys);return()=>el.removeEventListener('keydown',keys)},[hasNext,hasPrevious,onNext,onPrevious]);
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previous?.focus()}},[]);
 useEffect(()=>{let active=true;const controller=new AbortController();if(item.image_path){discoveryPhotoUrl(item.image_path).then(url=>{if(active){setPhoto(url);if(!item.url)setPreview({})}}).catch(()=>{if(active)setImageFailed(true)})}if(item.url)fetch(`/api/preview/${item.id}`,{signal:controller.signal}).then(r=>r.ok?r.json():{}).then(data=>{if(active)setPreview(data)}).catch(()=>{if(active)setPreview({})});return()=>{active=false;controller.abort()}},[item.id,item.image_path,item.url]);
 const image=item.image_path?photo:preview?.available?`/api/preview/${item.id}?image=1`:null;
 const source=safeLink(item.url);
 return <dialog ref={dialog} className="discovery-dialog" aria-labelledby="discovery-dialog-title" onClose={onClose} onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
  <div className="viewer-navigation"><button autoFocus className="close" aria-label="Close discovery" onClick={onClose}>×</button><button disabled={!hasPrevious||busy} onClick={onPrevious} aria-label="Previous discovery">← Previous</button><span aria-live="polite">{position}</span><button disabled={!hasNext||busy} onClick={onNext} aria-label="Next discovery">Next →</button></div>
  {queueProgress&&<div className="swipe-help">← It’s Bullshit · Swipe to vote · Fuckin Awesome →</div>}
  {onUndo&&<button className="swipe-undo" disabled={busy} onClick={onUndo}>↶ Undo last vote</button>}
  <div className={`swipe-card ${drag?"is-dragging":""} ${drag>0?"swipe-awesome":drag<0?"swipe-bullshit":""}`} style={{transform:drag?`translateX(${drag}px) rotate(${drag/22}deg)`:undefined}} onPointerDown={startSwipe} onPointerMove={moveSwipe} onPointerUp={endSwipe} onPointerCancel={endSwipe}>
  {drag!==0&&<div className="swipe-verdict" aria-hidden="true">{drag>0?"FUCKIN AWESOME":"IT’S BULLSHIT"}</div>}
  <h2 id="discovery-dialog-title" className="viewer-title">{item.title}</h2>
  <div className="discovery-dialog-media">{playing&&preview?.embed?<iframe src={preview.embed} title={`Video: ${item.title}`} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:image&&!imageFailed?<><img src={image} alt={item.title} onError={()=>setImageFailed(true)}/>{preview?.embed&&<button className="dialog-play" onClick={()=>setPlaying(true)}>▶ Watch video here</button>}</>:<div className="dialog-media-missing"><p>{preview===null?'Loading discovery…':'This site doesn’t provide a viewable preview.'}</p>{preview?.embed&&<button onClick={()=>setPlaying(true)}>▶ Watch video here</button>}</div>}</div>
  </div>
  {item.category==='Music'&&<MusicPlayer key={item.id} item={item}/>}<div className="viewer-engagement">{queueProgress&&<VoterProgress stats={queueProgress}/>}<VoteMeters up={item.up_votes} down={item.down_votes}/>{item.status==='approved'&&<div className="voting"><button disabled={busy} aria-pressed={vote===1} onClick={()=>onVote(item.id,1)}>🔥 FUCKIN AWESOME</button><button disabled={busy} aria-pressed={vote===-1} onClick={()=>onVote(item.id,-1)}>It's Bullshit</button></div>}<div className="actions"><button disabled={busy||item.status!=='approved'} aria-pressed={saved} onClick={()=>onSave(item.id)}>{saved?'★ Saved':'☆ Save discovery'}</button><button onClick={()=>onShare(item)}>Share</button>{onUndo&&<button disabled={busy} onClick={onUndo}>Undo last vote</button>}</div>{message&&<p role="status">{message}</p>}</div>
  <div className="discovery-dialog-copy"><div className="tag">{item.category}</div><div className="discovery-tags viewer-tags">{tags.map(tag=><button key={tag} onClick={()=>onTag(tag)}>#{tag}</button>)}</div>{preview?.description&&preview.description!==item.description&&<><h3>From the linked page</h3><p>{preview.description}</p></>}{item.description&&<><h3>About this discovery</h3><p><SourceText text={item.description}/></p></>}{source&&<><a className="button-link primary" href={source} target="_blank" rel="noopener noreferrer">Visit full site ↗</a>{preview?.video&&!preview?.embed&&<p className="muted">This source doesn’t support playback here. Watch on the full site.</p>}{playing&&<p className="muted">If the creator restricts playback, use Visit full site to watch.</p>}</>}<button className="dialog-back" onClick={onClose}>Back to the hall</button></div>
 </dialog>;
}

