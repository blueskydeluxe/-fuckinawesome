import {publicDiscovery,publicClient} from '../../../../lib/public-discovery.mjs';
import {socialCard,socialFormats} from '../../../../lib/social-card.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const cache=new Map();let bytes=0;
export async function GET(request,{params}){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const {id}=await params,query=new URL(request.url).searchParams,format=query.get('format')||'portrait';
 if(!Object.hasOwn(socialFormats,format))return new Response(null,{status:400,headers});
 const item=await publicDiscovery(id);if(!item?.image_path)return new Response(null,{status:404,headers});
 try{
  const key=JSON.stringify([id,item.image_path,item.title,item.category,item.up_votes,item.down_votes,item.neutral_votes,format]);let entry=cache.get(key);
  if(!entry||entry.expires<Date.now()){
   const result=await publicClient().storage.from('discovery-photos').download(item.image_path);if(result.error||!result.data||result.data.size>5242880)return new Response(null,{status:404,headers});
   const image=await socialCard(Buffer.from(await result.data.arrayBuffer()),item,format);
   if(entry){bytes-=entry.image.length;cache.delete(key)}
   while(bytes+image.length>33554432&&cache.size){const oldest=cache.keys().next().value;bytes-=cache.get(oldest).image.length;cache.delete(oldest)}
   entry={image,expires:Date.now()+300000};if(image.length<=33554432){cache.set(key,entry);bytes+=image.length}
  }
  return new Response(entry.image,{headers:{...headers,'Content-Type':'image/png','Cache-Control':'private, max-age=45',...(query.has('download')?{'Content-Disposition':`attachment; filename="fuckinawesome-${id}-${format}.png"`}:{})}});
 }catch{return new Response(null,{status:503,headers})}
}
