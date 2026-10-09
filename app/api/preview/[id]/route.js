import {createClient} from '@supabase/supabase-js';
import {linkPreview,linkGallery,readPublic} from '../../../../lib/link-preview.mjs';
import {reviewedGallery} from '../../../../lib/discovery-media-review.mjs';
import {screenImage} from '../../../../lib/content-screening.mjs';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const screenedImages=new Map();
const imageVersion=url=>createHash('sha256').update(url).digest('hex').slice(0,12);
async function galleryPhoto(url){
 const cached=screenedImages.get(url);if(cached&&cached.until>Date.now())return cached.promise;
 const entry={until:Date.now()+20000,promise:null};
 entry.promise=(async()=>{try{const image=await readPublic(url,{image:true});const pipeline=sharp(image.body,{limitInputPixels:50000000});const metadata=await pipeline.metadata();if(metadata.width<200||metadata.height<120)return null;
 const body=await pipeline.rotate().resize({width:960,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:3}).toBuffer();
 if(await screenImage(body.toString('base64'),process.env.GOOGLE_VISION_API_KEY)!=='passed')return null;
 entry.until=Date.now()+3600000;return body}catch{return null}})();
 if(screenedImages.size>=64)screenedImages.delete(screenedImages.keys().next().value);screenedImages.set(url,entry);return entry.promise;
}
export async function GET(request,{params}){
 const {id}=await params;
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id))return new Response(null,{status:404,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return new Response(null,{status:503,headers});
 // Use public access only. Hidden and pending discoveries never expose previews.
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.from('submissions').select('url').eq('id',id).eq('status','approved').maybeSingle();
 if(error||!data?.url)return new Response(null,{status:404,headers});
 const query=new URL(request.url).searchParams;
 if(query.has('gallery')){
  const gallery=reviewedGallery(id,data.url)??await linkGallery(data.url);
  if(!query.has('index'))return Response.json({images:gallery.map((x,index)=>({src:`/api/preview/${id}?gallery=1&index=${index}&v=${imageVersion(x.url)}`,alt:x.alt,source:x.source}))},{headers});
  const raw=query.get('index');if(!/^\d{1,2}$/.test(raw)||!gallery[Number(raw)])return new Response(null,{status:404,headers});
  if(query.has('v')&&query.get('v')!==imageVersion(gallery[Number(raw)].url))return new Response(null,{status:404,headers});
  const body=await galleryPhoto(gallery[Number(raw)].url);if(!body)return new Response(null,{status:404,headers});
  return new Response(body,{headers:{...headers,'Content-Type':'image/webp','Cache-Control':'private, max-age=300'}});
 }
 const preview=await linkPreview(data.url);
 if(!new URL(request.url).searchParams.has('image'))return Response.json({available:!!preview.image,video:preview.video,description:preview.description,embed:preview.embed},{headers});
 if(!preview.image)return new Response(null,{status:404,headers});
 try{const image=await readPublic(preview.image,{image:true});return new Response(image.body,{headers:{...headers,'Content-Type':image.type}})}catch{return new Response(null,{status:404,headers})}
}
