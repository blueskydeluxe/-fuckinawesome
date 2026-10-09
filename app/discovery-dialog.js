'use client';
import VoteMoment from './vote-moment';
import {FollowButton} from './following';
import DiscoveryShare from './discovery-share';
import VoterProgress from './voter-progress';
import MusicPlayer from './music-player';
import SourceText from './source-text';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {withDeadline,previewJSON} from '../lib/request-deadline.mjs';
import {discoveryPhotoUrl} from '../lib/discovery-photo-url';
import {safeLink} from '../lib/ranking.mjs';
import VoteMeters from './vote-meters';
import useCardSwipe from './use-card-swipe';
import DiscoveryComments from './discovery-comments';
import DiscoveryGallery from './discovery-gallery';
export default function DiscoveryDialog({moment,onMomentOpen,onMomentDismiss,roundProgress,focusComments,user,moderator,onDelete,onLogin,queueProgress,onUndo,tags=[],onTag,item,onClose,onPrevious,onNext,hasPrevious,hasNext,position,onVote,onSave,onShare,following,onFollow,followingBusy,vote,saved,busy,message}){
 const dialog=useRef(null),[preview,setPreview]=useState(null),[photo,setPhoto]=useState(null),[playing,setPlaying]=useState(false),[imageFailed,setImageFailed]=useState(false);
 const swipe=useCardSwipe({id:item.id,enabled:!!user&&!vote&&item.status==='approved',busy,onVote});
 useLayoutEffect(()=>{setPreview(null);setPhoto(null);setPlaying(false);setImageFailed(false);dialog.current?.scrollTo(0,0)},[item.id]);
 useEffect(()=>{function keys(e){if(e.target.closest('input,textarea,select,iframe'))return;if(e.key==='ArrowRight'&&hasNext){e.preventDefault();onNext()}if(e.key==='ArrowLeft'&&hasPrevious){e.preventDefault();onPrevious()}}const el=dialog.current;el.addEventListener('keydown',keys);return()=>el.removeEventListener('keydown',keys)},[hasNext,hasPrevious,onNext,onPrevious]);
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previous?.focus()}},[]);
 useEffect(()=>{let active=true;const controller=new AbortController();if(item.image_path){withDeadline(()=>discoveryPhotoUrl(item.image_path),5000).then(url=>{if(active){setPhoto(url);if(!item.url)setPreview({})}}).catch(()=>{if(active)setImageFailed(true)})}if(item.url)previewJSON(`/api/preview/${item.id}`,{signal:controller.signal}).then(data=>{if(active)setPreview(data)}).catch(()=>{if(active)setPreview({})});return()=>{active=false;controller.abort()}},[item.id,item.image_path,item.url]);
 const image=item.image_path?photo:preview?.available?`/api/preview/${item.id}?image=1`:null;
 const source=safeLink(item.url);
 return <dialog ref={dialog} className="discovery-dialog" aria-labelledby="discovery-dialog-title" onClose={onClose} onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
  <VoteMoment moment={moment} onOpen={onMomentOpen} onDismiss={onMomentDismiss}/>
  <div className="viewer-navigation"><button autoFocus className="close" aria-label="Close discovery" onClick={onClose}>×</button><button disabled={!hasPrevious||busy} onClick={onPrevious} aria-label="Previous discovery">← Previous</button><span aria-live="polite">{position}</span><button disabled={!hasNext||busy} onClick={onNext} aria-label="Next discovery">Next →</button></div>
  {roundProgress&&<div className="round-progress"><span>{roundProgress.done} of {roundProgress.total} verdicts counted</span><progress value={roundProgress.done} max={roundProgress.total} aria-label="Five-card round progress"/><small>Awesome, Meh or Bullshit. Every verdict counts.</small></div>}
  {queueProgress&&<div className="swipe-help">← It’s Bullshit · Swipe to vote · Fuckin Awesome →</div>}
  {onUndo&&<button className="swipe-undo" disabled={busy} onClick={onUndo}>↶ Undo last vote</button>}
  <div className={swipe.className} ref={swipe.ref} {...swipe.handlers}>
  {swipe.drag!==0&&<div className="swipe-verdict" aria-hidden="true">{swipe.drag>0?"FUCKIN AWESOME":"IT’S BULLSHIT"}</div>}
  <h2 id="discovery-dialog-title" className="viewer-title">{item.title}</h2>
  <DiscoveryGallery key={item.id} id={item.id} title={item.title} cover={image} embed={preview?.embed} loading={!image&&!imageFailed&&preview===null} source={source}/>
  {item.category==='Music'&&<MusicPlayer key={item.id} item={item}/>}<div className="viewer-engagement">{queueProgress&&<VoterProgress stats={queueProgress}/>}<VoteMeters up={item.up_votes} down={item.down_votes} neutral={item.neutral_votes}/>{item.status==='approved'&&!vote&&<div className="voting"><button disabled={busy} aria-pressed={vote===1} onClick={()=>onVote(item.id,1)}><span className="vote-desktop-label">🔥 FUCKIN AWESOME</span><span className="vote-mobile-label"><span className="vote-symbol" aria-hidden="true">→</span><span>Awesome</span></span></button><button className="meh-vote" disabled={busy} aria-label="Meh — neutral vote" onClick={()=>onVote(item.id,2)}><span className="vote-desktop-label">Meh</span><span className="vote-mobile-label"><span className="vote-symbol" aria-hidden="true">×</span><span>Meh</span></span></button><button disabled={busy} aria-pressed={vote===-1} onClick={()=>onVote(item.id,-1)}><span className="vote-desktop-label">It's Bullshit</span><span className="vote-mobile-label"><span className="vote-symbol" aria-hidden="true">←</span><span>Bullshit</span></span></button></div>}<div className="actions"><button disabled={busy||item.status!=='approved'} aria-pressed={saved} onClick={()=>onSave(item.id)}>{saved?'★ Saved':'☆ Save discovery'}</button>{onUndo&&<button disabled={busy} onClick={onUndo}>Undo last vote</button>}</div>{message&&<p role="status">{message}</p>}</div>
  <div className="discovery-dialog-copy"><div className="discoverer-row"><a href={`/?profile=${item.author_id}`}>Found by {item.author_name||'a discoverer'}</a>{item.author_id!==user?.id&&<FollowButton kind="discoverer" target={item.author_id} following={following} onFollow={onFollow} busy={followingBusy} label="discoverer"/>}</div><DiscoveryShare key={item.id} item={item} onShare={onShare}/><div className="tag">{item.category}</div><div className="discovery-tags viewer-tags">{tags.map(tag=><button key={tag} onClick={()=>onTag(tag)}>#{tag}</button>)}</div>{preview?.description&&preview.description!==item.description&&<><h3>From the linked page</h3><p>{preview.description}</p></>}{item.description&&<><h3>About this discovery</h3><p><SourceText text={item.description}/></p></>}{source&&<><a className="button-link primary" href={source} target="_blank" rel="noopener noreferrer">Visit full site ↗</a>{preview?.video&&!preview?.embed&&<p className="muted">This source doesn’t support playback here. Watch on the full site.</p>}{playing&&<p className="muted">If the creator restricts playback, use Visit full site to watch.</p>}</>}<button className="dialog-back" onClick={onClose}>Back to the hall</button></div>
  </div>
  {item.status==='approved'&&<DiscoveryComments focusComments={focusComments} key={item.id} item={item} user={user} moderator={moderator} onLogin={onLogin}/>}
 {moderator&&<div className="moderator-viewer-delete"><button disabled={busy} onClick={onDelete}>Delete submission</button></div>}
 </dialog>;
}

