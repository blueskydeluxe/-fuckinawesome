import {safeLink} from '../lib/ranking.mjs';
export default function DiscoveryStory({item}){
 const source=safeLink(item.url);
 return <article className="discovery-story wrap" aria-labelledby="discovery-page-title"><a href="/" className="story-back">← More extraordinary finds</a><span className="tag">{item.category}</span><h1 id="discovery-page-title">{item.title}</h1><img className="story-cover" src={'/discovery/'+item.id+'/cover'} alt={item.title} width="960" height="720" fetchPriority="high"/><div className="story-description"><p>{item.description}</p>{source&&<a className="button-link" href={source} target="_blank" rel="noopener noreferrer">Explore the original source ↗</a>}<p className="muted">Found by {item.author_name||'a discoverer'}. Real people decide what rises.</p></div></article>;
}
