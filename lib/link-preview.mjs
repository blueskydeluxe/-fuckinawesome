import {blockedContentLink} from './content-domains.mjs';
import https from 'node:https';
import {Resolver} from 'node:dns/promises';
const resolver=new Resolver({timeout:2000,tries:1});
import {isIP} from 'node:net';
import {createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';

export function publicAddress(address){
 const p=address.split('.').map(Number);
 return isIP(address)===4 && ![0,10,127].includes(p[0]) && p[0]<224 && !(p[0]===169&&p[1]===254) && !(p[0]===172&&p[1]>=16&&p[1]<=31) && !(p[0]===192&&(p[1]===168||p[1]===0)) && !(p[0]===100&&p[1]>=64&&p[1]<=127) && !(p[0]===198&&(p[1]===18||p[1]===19));
}
export function previewUrl(value,base){
 if(typeof value!=='string'||!value.trim()||blockedContentLink(value))return null;
 try{const u=new URL(value,base);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.hostname==='localhost')return null;return u.href}catch{return null}
}
// Pin each connection to the checked DNS address, including every redirect.
export async function readPublic(url,{image=false,gallery=false,redirects=0}={}){
 const safe=previewUrl(url);if(!safe||redirects>3)throw Error('Unsupported preview URL');
 const u=new URL(safe);const addresses=isIP(u.hostname)?[u.hostname]:await resolver.resolve4(u.hostname,{ttl:false});
 if(!addresses.length||!addresses.every(publicAddress))throw Error('Private address');
 const result=await new Promise((resolve,reject)=>{
  const req=https.get(u,{agent:false,lookup:(_host,options,callback)=>options.all?callback(null,[{address:addresses[0],family:4}]):callback(null,addresses[0],4),headers:{'User-Agent':'Mozilla/5.0 (compatible; FuckinAwesomePreview/1.0)','Accept':image?'image/jpeg,image/png,image/webp,image/gif':'text/html','Accept-Encoding':'identity'}},res=>{
   if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();resolve({redirect:new URL(res.headers.location,u).href});return}
   const type=(res.headers['content-type']||'').split(';')[0].toLowerCase();
   if(res.statusCode!==200||!(image?['image/jpeg','image/png','image/webp','image/gif'].includes(type):['text/html','application/xhtml+xml'].includes(type))){res.destroy();reject(Error('No usable preview'));return}
   const limit=image?5*1024*1024:gallery?4*1024*1024:512*1024;
   const encoding=(res.headers['content-encoding']||'').toLowerCase(),decoder=encoding==='gzip'?createGunzip():encoding==='br'?createBrotliDecompress():encoding==='deflate'?createInflate():null;
   if(encoding&&!['identity','gzip','br','deflate'].includes(encoding)){res.destroy();reject(Error('Unsupported encoding'));return}
   const stream=decoder?res.pipe(decoder):res,chunks=[];let size=0,encoded=0,done=false;
   function fail(error){if(done)return;done=true;decoder?.destroy();res.destroy();reject(error)}
   if(decoder)res.on('data',chunk=>{encoded+=chunk.length;if(encoded>limit)fail(Error('Preview too large'))});
   stream.on('data',chunk=>{if(done)return;size+=chunk.length;chunks.push(chunk);if(size>limit){if(gallery&&!image){done=true;resolve({body:Buffer.concat(chunks).subarray(0,limit),type,url:u.href});decoder?.destroy();res.destroy()}else fail(Error('Preview too large'))}});
   stream.on('error',fail);res.on('error',fail);res.on('aborted',()=>fail(Error('Incomplete preview')));stream.on('end',()=>{if(!done){done=true;resolve({body:Buffer.concat(chunks),type,url:u.href})}});
  });const deadline=setTimeout(()=>req.destroy(Error('Preview timed out')),gallery?12000:6000);req.on('close',()=>clearTimeout(deadline));req.on('error',reject);
 });
 return result.redirect?readPublic(result.redirect,{image,gallery,redirects:redirects+1}):result;
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
// Reject site chrome and editorial portraits, not people who are the discovery subject.
// Visually reviewed branding assets: hashes remain stable across CDN resize variants.
const reviewedBrandAssets=['30a59a_6f5bf3e9245e43018572b8dc44ee0a70','3c1df6_ac5cb09a2f92437d918e7eb484cf9e60'];
export function unrelatedImage(value,label=''){
 if(reviewedBrandAssets.some(asset=>String(value).includes(asset)))return true;
 let path='';try{const u=new URL(value);path=(decodeURIComponent(u.pathname)+' '+(u.searchParams.get('url')||'')).replace(/([a-z])([A-Z])/g,'$1 $2')}catch{return true}
 return /(?:^|[\/_.\s-])(?:logo(?:type)?|favicon|sprite|avatar|placeholder|tracking|profile[-_ ]?(?:pic(?:ture)?|photo|image)|author[-_ ]?(?:pic(?:ture)?|photo|image)|headshot|staff[-_ ]?portrait)(?:[\/_.\s-]|$)/i.test(path)||/\b(?:brand logo|company logo|site logo|author photo|author portrait|profile picture|profile photo|avatar|headshot)\b/i.test(label);
}
export function parsePreview(html,url){
 const tags={};for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs={};for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]);const key=attrs.property||attrs.name;if(key&&attrs.content&&!tags[key.toLowerCase()])tags[key.toLowerCase()]=attrs.content}
 const candidates=['og:image:secure_url','og:image','twitter:image','twitter:image:src'].map(key=>previewUrl(tags[key],url)).filter(Boolean);
 const image=candidates.find(value=>!unrelatedImage(value,tags['og:image:alt']||''))||relatedImages(html,url)[0]?.url||null;
 const title=shortDescription(tags['og:title']||tags['twitter:title']||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0,140);
 if(/^(access denied|just a moment|attention required|facebook.*log in|log in.*facebook)/i.test(title))return {image:null,video:false,title:'',description:'',embed:null};
 return {title,image,video:!!(tags['og:video']||tags['og:video:url']||tags['twitter:player']||tags['og:type']?.startsWith('video')),description:shortDescription(tags['og:description']||tags['twitter:description']||tags.description),embed:videoEmbed(url)};
}
const previews=new Map();
// Keep this separate from the cover preview so gallery discovery does not slow the feed.
function attributes(tag){const attrs={};for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]);return attrs}
export function relatedImages(html,url){
 const found=[],seen=new Set(),wiki=/(^|\.)wikipedia\.org$/.test(new URL(url).hostname);let visited=0;
 function add(value,alt='',source=url){
  if(typeof value!=='string')return;let safe=previewUrl(decode(value),url);if(!safe)return;
  let u=new URL(safe);if(u.pathname==='/_next/image'&&u.searchParams.has('url')){safe=previewUrl(u.searchParams.get('url'),u.origin);if(!safe)return;u=new URL(safe)}
  if(unrelatedImage(safe,alt)||/\.(svg|ico|mp4|webm|mov|mp3|m4a)$/i.test(u.pathname)||/(?:^|[\/_.-])(?:logo|icon|sprite|avatar|placeholder|tracking|location-map)(?:[\/_.-]|$)/i.test(u.pathname))return;
  if(/(^|\.)muscache\.com$/.test(u.hostname)&&u.pathname.startsWith('/im/pictures/')){u.searchParams.set('im_w','960');safe=u.href}
  if(wiki){if(!/(^|\.)wikimedia\.org$/.test(u.hostname)||!/^\/wikipedia\/commons\//.test(u.pathname))return;u.search='';if(!u.pathname.includes('/thumb/')){const file=u.pathname.split('/').pop();u.hostname='thumb.wikimedia.org';u.pathname=u.pathname.replace('/commons/','/commons/thumb/')+'/960px-'+file}else u.pathname=u.pathname.replace(/\/\d+px-([^/]+)$/,'/960px-$1');safe=u.href}
  const identityUrl=new URL(u);for(const key of [...identityUrl.searchParams.keys()])if(/^(w|h|width|height|q|quality|dpr|fit|crop|auto|fm|format|im_w|im_h|utm_.*)$/i.test(key))identityUrl.searchParams.delete(key);identityUrl.searchParams.sort();
  const identity=wiki?u.pathname.match(/^\/wikipedia\/commons\/(?:thumb\/)?([^/]+\/[^/]+\/[^/]+)/)?.[1]:identityUrl.href.replace(/\/\d+px-([^/?]+)(?=\?|$)/,'/$1');if(!identity||seen.has(identity)||found.length>=24)return;seen.add(identity);found.push({url:safe,alt:shortDescription(typeof alt==='string'?alt:''),source:previewUrl(source,url)||url});
 }
 const meta=(html.match(/<meta\b[^>]*>/gi)||[]).map(attributes),imageAlt=meta.find(a=>(a.property||a.name||'').toLowerCase()==='og:image:alt')?.content||'';
 for(const a of meta)if(/^(og:image(?::secure_url)?|twitter:image(?::src)?)$/i.test(a.property||a.name||''))add(a.content,imageAlt);
 const imageKey=/^(?:images?|photos?|pictures?|gallery|galleries|galleryImages|imageGallery|photoGallery|photoTour|listingPhotos|productImages|media|mediaItems|mediaGallery|featured_image|featuredImage)$/i;
 const unrelated=/^(?:authors?|authorPhotos|contributors?|staff|team|reviews?|reviewPhotos|reviewImages|users?|userPhotos|avatars?|hosts?|hostPhotos|owners?|logos?|icons?|recommendations?|recommendedProducts|relatedProducts|relatedListings|suggestions?|navigation|footer|header|settings|config|tracking|analytics|translations)$/i;
 function walk(v,depth=0,imageContext=false,caption=''){
  if(++visited>50000||depth>28||found.length>=24||v==null)return;
  if(typeof v==='string'){if(imageContext)add(v,caption);return}
  if(Array.isArray(v)){for(const x of v)walk(x,depth+1,imageContext,caption);return}if(typeof v!=='object')return;
  const type=[v['@type']||v.__typename||v.media_type||v.type||''].flat().map(t=>typeof t==='string'?t.split('/').pop():'');
  if(type.some(t=>/^(Person|Organization|Review|User|Host|RecommendedProduct)$/i.test(t)))return;
  const ownCaption=v.caption||v.accessibilityLabel||v.alt||v.name||caption;
  const photo=imageContext||type.some(t=>/^(ImageObject|Photograph|Photo|Image|MediaItem|Picture)$/i.test(t));
  if(photo){const value=v.contentUrl||v.originalUrl||v.original||v.baseUrl||v.imageUrl||v.largeUrl||v.large||v.full||v.src||v.url;if(typeof value==='string')add(value,ownCaption)}
  for(const [key,value] of Object.entries(v)){if(unrelated.test(key))continue;if(imageKey.test(key))walk(value,depth+1,true,ownCaption);else if(value&&typeof value==='object')walk(value,depth+1,photo&&/^(?:variants|sizes|sources|urls|imageMetadata)$/i.test(key),ownCaption)}
 }
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  const a=attributes(match[1]),body=match[2].trim();if(!body||body.length>2*1024*1024)continue;
  try{if(/^(application\/(?:ld\+)?json)$/i.test(a.type||'')||/^(?:__NEXT_DATA__|__NUXT_DATA__|data-deferred-state-\d+|.*(?:product|gallery).*json)$/i.test(a.id||''))walk(JSON.parse(body));
   else{const assignment=body.match(/^(?:window\.)?__(?:INITIAL_STATE|PRELOADED_STATE|INITIAL_DATA|APOLLO_STATE|NUXT)__\s*=\s*([\s\S]*?)\s*;?$/);if(assignment)walk(JSON.parse(assignment[1]));
    const flight=body.match(/^self\.__next_f\.push\((\[[\s\S]*\])\)\s*;?$/);if(flight){const payload=JSON.parse(flight[1])[1];if(typeof payload==='string')for(const line of payload.split('\n')){const frame=line.match(/^[\da-f]+:(\{.*\}|\[.*\])$/i);if(frame)try{walk(JSON.parse(frame[1]))}catch{}}}
   }
  }catch{}
 }
 // A small structural scan keeps nested galleries intact and excludes site navigation.
 const markup=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,''),stack=[],voids=new Set(['img','source','br','hr','meta','link','input','area','base','col','embed','param','track','wbr']);
 function srcset(value){const entries=[...(value||'').matchAll(/(\S+)\s+([\d.]+)(w|x)(?=\s*(?:,|$))/g)].map(m=>({url:m[1],size:Number(m[2])*(m[3]==='x'?1000:1)})).sort((a,b)=>a.size-b.size);return (entries.find(x=>x.size>=960)||entries.at(-1))?.url}
 for(const token of markup.matchAll(/<\/?([a-z][\w:-]*)\b[^>]*>/gi)){
  const tag=token[1].toLowerCase(),closing=token[0].startsWith('</');if(closing){const index=stack.findLastIndex(x=>x.tag===tag);if(index>=0)stack.length=index;continue}
  const a=attributes(token[0]),parent=stack.at(-1),label=(a.class||'')+' '+(a.id||''),gallery=/\b(gallery|carousel|slider|swiper|photo-tour|product-images|product-media)\b/i.test(label);
  const skip=!!parent?.skip||['nav','header','footer','aside'].includes(tag)||/\b(avatar|recommendations|related-products|related-listings|review-photos|author|byline|contributors?|staff|profile|team)\b/i.test(label);
  const inside=!!parent?.inside||(wiki?/\bmw-parser-output\b/.test(label):['main','article','figure'].includes(tag)||gallery),anchor=tag==='a'?a.href:parent?.anchor;
  if(inside&&!skip){
   for(const key of ['data-images','data-gallery','data-photos','data-product'])if(a[key])try{walk(JSON.parse(a[key]),0,key!=='data-product')}catch{}
   if(tag==='img'||tag==='source'){
    const full=a['data-zoom-image']||a['data-full']||a['data-large']||a['data-large-image']||(anchor&&/\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(anchor)?anchor:null),w=Number(a.width),h=Number(a.height);
    if(full||!((w&&w<100)||(h&&h<80)))add(full||srcset(a['data-srcset']||a.srcset)||a['data-src']||a['data-original']||a['data-lazy-src']||a.src,a.alt,wiki&&anchor?anchor:url);
   }
   if(gallery||parent?.gallery)for(const background of (a.style||'').matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi))add(background[1],a['aria-label']||'',url);
  }
  if(!voids.has(tag)&&!token[0].endsWith('/>')&&stack.length<200)stack.push({tag,inside,skip,anchor,gallery:gallery||parent?.gallery});
 }
 return found;
}
const galleries=new Map();
export async function linkGallery(url){
 const cached=galleries.get(url);if(cached&&cached.until>Date.now())return cached.promise;
 const promise=(async()=>{try{const page=await readPublic(url,{gallery:true});return relatedImages(page.body.toString('utf8'),page.url)}catch{return []}})();
 if(galleries.size>=200)galleries.delete(galleries.keys().next().value);galleries.set(url,{promise,until:Date.now()+3600000});return promise;
}
export async function linkPreview(url){
 const cached=previews.get(url);if(cached&&cached.until>Date.now())return cached.promise;
 const promise=(async()=>{const id=youtubeId(url);let result={image:null,video:false,description:'',embed:videoEmbed(url)};try{const page=await readPublic(id?`https://www.youtube.com/watch?v=${id}`:url);result=parsePreview(page.body.toString('utf8'),page.url)}catch{}if(id)return {...result,image:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,video:true,embed:videoEmbed(url)};return result})();
 if(previews.size>=200)previews.delete(previews.keys().next().value);previews.set(url,{promise,until:Date.now()+300000});return promise;
}
