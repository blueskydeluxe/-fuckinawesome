import {publicDiscovery,publicClient} from '../../../../lib/public-discovery.mjs';
import {thumbnail,thumbnailWidth} from '../../../../lib/thumbnail.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
const thumbnails=new Map();let cacheBytes=0;
export async function GET(request,{params}){
 const {id}=await params;const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const widthValue=new URL(request.url).searchParams.get('w'),width=thumbnailWidth(widthValue);
 if(widthValue!==null&&!width)return new Response(null,{status:400,headers});
 // Check publication before every response, including cached thumbnails.
 const item=await publicDiscovery(id);if(!item?.image_path)return new Response(null,{status:404,headers});
 const cacheKey=item.image_path+':'+width;const cached=width?thumbnails.get(cacheKey):null;
 if(cached&&cached.expires>Date.now())return new Response(cached.bytes,{headers:{...headers,'Cache-Control':'private, max-age=45','Content-Type':'image/webp'}});
 try{const {data,error}=await publicClient().storage.from('discovery-photos').download(item.image_path);if(error||!data||data.size>5242880)return new Response(null,{status:404,headers});const original=Buffer.from(await data.arrayBuffer());if(!width)return new Response(original,{headers:{...headers,'Content-Type':'image/jpeg'}});
 const bytes=await thumbnail(original,width);
 if(cached){cacheBytes-=cached.bytes.length;thumbnails.delete(cacheKey)}
 while(cacheBytes+bytes.length>16777216&&thumbnails.size){const key=thumbnails.keys().next().value;cacheBytes-=thumbnails.get(key).bytes.length;thumbnails.delete(key)}
 if(bytes.length<=16777216){thumbnails.set(cacheKey,{bytes,expires:Date.now()+300000});cacheBytes+=bytes.length}
 return new Response(bytes,{headers:{...headers,'Cache-Control':'private, max-age=45','Content-Type':'image/webp'}});
 }catch{return new Response(null,{status:404,headers})}
}
