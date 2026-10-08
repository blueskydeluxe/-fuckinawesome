import {blockedContentLink} from './content-domains.mjs';
import https from 'node:https';
import {Resolver} from 'node:dns/promises';
const resolver=new Resolver({timeout:2000,tries:1});
import {isIP} from 'node:net';

export function publicAddress(address){
 const p=address.split('.').map(Number);
 return isIP(address)===4 && ![0,10,127].includes(p[0]) && p[0]<224 && !(p[0]===169&&p[1]===254) && !(p[0]===172&&p[1]>=16&&p[1]<=31) && !(p[0]===192&&(p[1]===168||p[1]===0)) && !(p[0]===100&&p[1]>=64&&p[1]<=127) && !(p[0]===198&&(p[1]===18||p[1]===19));
}
export function previewUrl(value,base){
 if(typeof value!=='string'||!value.trim()||blockedContentLink(value))return null;
 try{const u=new URL(value,base);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.hostname==='localhost')return null;return u.href}catch{return null}
}
// Pin each connection to the checked DNS address, including every redirect.
export async function readPublic(url,{image=false,redirects=0}={}){
 const safe=previewUrl(url);if(!safe||redirects>3)throw Error('Unsupported preview URL');
 const u=new URL(safe);const addresses=isIP(u.hostname)?[u.hostname]:await resolver.resolve4(u.hostname,{ttl:false});
 if(!addresses.length||!addresses.every(publicAddress))throw Error('Private address');
 const result=await new Promise((resolve,reject)=>{
  const req=https.get(u,{agent:false,lookup:(_host,options,callback)=>options.all?callback(null,[{address:addresses[0],family:4}]):callback(null,addresses[0],4),headers:{'User-Agent':'Mozilla/5.0 (compatible; FuckinAwesomePreview/1.0)','Accept':image?'image/jpeg,image/png,image/webp,image/gif':'text/html','Accept-Encoding':'identity'}},res=>{
   if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();resolve({redirect:new URL(res.headers.location,u).href});return}
   const type=(res.headers['content-type']||'').split(';')[0].toLowerCase();
   if(res.statusCode!==200||!(image?['image/jpeg','image/png','image/webp','image/gif'].includes(type):['text/html','application/xhtml+xml'].includes(type))){res.destroy();reject(Error('No usable preview'));return}
   const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>(image?5*1024*1024:512*1024)){res.destroy(Error('Preview too large'));return}chunks.push(chunk)});res.on('error',reject);res.on('end',()=>resolve({body:Buffer.concat(chunks),type,url:u.href}));
  });const deadline=setTimeout(()=>req.destroy(Error('Preview timed out')),6000);req.on('close',()=>clearTimeout(deadline));req.on('error',reject);
 });
 return result.redirect?readPublic(result.redirect,{image,redirects:redirects+1}):result;
}
function decode(value){return value.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code<=0x10ffff?String.fromCodePoint(code):''})}
export function youtubeId(value){
 try{const u=new URL(value),host=u.hostname.replace(/^www\./,'');let id;if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];else if(['youtube.com','m.youtube.com'].includes(host))id=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];else if(['google.com','www.google.com'].includes(u.hostname))id=(u.searchParams.get('vld')||u.hash).match(/vid:([\w-]{11})/)?.[1];return /^[\w-]{11}$/.test(id||'')?id:null}catch{return null}
}
export function videoEmbed(value){
 const id=youtubeId(value);if(id)return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;
 try{const u=new URL(value);if(['vimeo.com','www.vimeo.com'].includes(u.hostname)&&/^\/\d{1,12}\/?$/.test(u.pathname))return `https://player.vimeo.com/video/${u.pathname.replaceAll('/','')}?dnt=1`}catch{}
 return null;
}
export function shortDescription(value){
 return decode(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,60).join(' ').slice(0,500);
}
export function parsePreview(html,url){
 const tags={};for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs={};for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]);const key=attrs.property||attrs.name;if(key&&attrs.content&&!tags[key.toLowerCase()])tags[key.toLowerCase()]=attrs.content}
 const image=previewUrl(tags['og:image:secure_url']||tags['og:image']||tags['twitter:image']||tags['twitter:image:src'],url);
 const title=shortDescription(tags['og:title']||tags['twitter:title']||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0,140);
 if(/^(access denied|just a moment|attention required|facebook.*log in|log in.*facebook)/i.test(title))return {image:null,video:false,title:'',description:'',embed:null};
 return {title,image,video:!!(tags['og:video']||tags['og:video:url']||tags['twitter:player']||tags['og:type']?.startsWith('video')),description:shortDescription(tags['og:description']||tags['twitter:description']||tags.description),embed:videoEmbed(url)};
}
const previews=new Map();
// Keep this separate from the cover preview so gallery discovery does not slow the feed.
function attributes(tag){const attrs={};for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]);return attrs}
export function relatedImages(html,url){
 const found=[],seen=new Set(),wiki=/(^|\.)wikipedia\.org$/.test(new URL(url).hostname);
 function add(value,alt='',source=url){
  let safe=previewUrl(decode(value||''),url);if(!safe)return;
  const u=new URL(safe);if(/\.(svg|ico)(?:$|\?)/i.test(u.pathname)||/(?:logo|icon|sprite|avatar|placeholder|tracking|pixel|map[_-]|location[_-]map)/i.test(u.pathname))return;
  if(wiki){if(!/(^|\.)wikimedia\.org$/.test(u.hostname)||!/^\/wikipedia\/commons\//.test(u.pathname))return;u.search='';u.pathname=u.pathname.replace(/\/\d+px-([^/]+)$/,'/960px-$1');safe=u.href}
  const identity=u.hostname+u.pathname.replace(/\/\d+px-([^/]+)$/,'/$1');if(seen.has(identity)||found.length>=24)return;seen.add(identity);found.push({url:safe,alt:shortDescription(alt),source:previewUrl(source,url)||url});
 }
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a=attributes(tag);if(/^(og:image(?::secure_url)?|twitter:image(?::src)?)$/i.test(a.property||a.name||''))add(a.content)}
 for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{function walk(v,depth=0){if(!v||depth>8)return;if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return}if(typeof v!=='object')return;const type=[v['@type']].flat();if(type.some(t=>/^(Product|Article|NewsArticle|BlogPosting|TouristAttraction|Place|Recipe|ImageGallery|Photograph|ImageObject)$/.test(t))){for(const image of [v.image||v.contentUrl].flat()){if(typeof image==='string')add(image,v.name);else if(image&&typeof image==='object')add(image.contentUrl||image.url,image.caption||v.name)}}if(v['@graph'])walk(v['@graph'],depth+1);if(v.mainEntity)walk(v.mainEntity,depth+1)}walk(JSON.parse(match[1]))}catch{}
 }
 const content=wiki?(html.match(/<div\b[^>]*class=["'][^"']*mw-parser-output[^"']*["'][^>]*>([\s\S]*)/i)?.[1]||''):(html.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1]||'');
 for(const match of content.matchAll(/<img\b[^>]*>/gi)){
  const a=attributes(match[0]),w=Number(a.width),h=Number(a.height);if((w&&w<100)||(h&&h<80))continue;
  const candidates=(a.srcset||a['data-srcset']||'').split(',').map(s=>s.trim().split(/\s+/)).filter(x=>x.length===2).sort((a,b)=>parseFloat(b[1])-parseFloat(a[1]));
  const value=candidates[0]?.[0]||a['data-src']||a['data-original']||a.src;if(!value)continue;
  const prefix=content.slice(Math.max(0,match.index-900),match.index),anchor=prefix.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*$/i);
  add(value,a.alt,wiki&&anchor?anchor[1]:url);
 }
 return found;
}
const galleries=new Map();
export async function linkGallery(url){
 const cached=galleries.get(url);if(cached&&cached.until>Date.now())return cached.promise;
 const promise=(async()=>{try{const page=await readPublic(url);return relatedImages(page.body.toString('utf8'),page.url)}catch{return []}})();
 if(galleries.size>=200)galleries.delete(galleries.keys().next().value);galleries.set(url,{promise,until:Date.now()+3600000});return promise;
}
export async function linkPreview(url){
 const cached=previews.get(url);if(cached&&cached.until>Date.now())return cached.promise;
 const promise=(async()=>{const id=youtubeId(url);let result={image:null,video:false,description:'',embed:videoEmbed(url)};try{const page=await readPublic(id?`https://www.youtube.com/watch?v=${id}`:url);result=parsePreview(page.body.toString('utf8'),page.url)}catch{}if(id)return {...result,image:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,video:true,embed:videoEmbed(url)};return result})();
 if(previews.size>=200)previews.delete(previews.keys().next().value);previews.set(url,{promise,until:Date.now()+300000});return promise;
}

