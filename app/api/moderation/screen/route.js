import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {screenImageDetails} from '../../../../lib/content-screening.mjs';
export const runtime='nodejs';
export async function POST(request){
 const headers={'Cache-Control':'no-store'};
 const reply=(body,status=200)=>Response.json(body,{status,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY,vision=process.env.GOOGLE_VISION_API_KEY;
 const token=request.headers.get('authorization');
 if(!url||!key||!token?.startsWith('Bearer '))return reply({error:'Sign in first.'},401);
 const client=createClient(url,key,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error}=await client.auth.getUser(token.slice(7));if(error||!auth.user)return reply({error:'Sign in first.'},401);
 const permission=await client.rpc('is_moderator');const moderator=!permission.error&&permission.data;
 if(!secret||!vision)return reply({error:'Image screening needs its server credentials. Content stays pending.'},503);
 let input;try{input=await request.json()}catch{return reply({error:'Invalid request.'},400)}
 if(!input||!['profile','discovery'].includes(input.kind)||typeof input.id!=='string'||input.id.length>200||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.id))return reply({error:'Invalid request.'},400);
 let base64,assetKey;
 if(input.kind==='profile'){
 if(input.id!==auth.user.id&&!moderator)return reply({error:'Photo unavailable.'},403);
 const r=await client.from('profile_photos').select('pending_image').eq('user_id',input.id).maybeSingle();if(r.error||!r.data?.pending_image)return reply({error:'Pending photo unavailable.'},404);
 base64=r.data.pending_image.split(',')[1];assetKey='profile:'+input.id+':'+createHash('md5').update(r.data.pending_image).digest('hex');
 }else{
 let path;
 const r=await client.from('submissions').select('image_path,author_id').eq('id',input.id).is('deleted_at',null).maybeSingle();if(r.error||!r.data?.image_path)return reply({error:'Cover unavailable.'},404);
 if(r.data.author_id!==auth.user.id&&!moderator)return reply({error:'Cover unavailable.'},403);path=r.data.image_path;
 assetKey='discovery:'+path;
 const photo=await client.storage.from('discovery-photos').download(path);if(photo.error||!photo.data||photo.data.size>5242880)return reply({error:'Cover unavailable.'},404);
 base64=Buffer.from(await photo.data.arrayBuffer()).toString('base64');
 }
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const cached=await admin.from('content_screenings').select('verdict').eq('asset_key',assetKey).maybeSingle();if(cached.data)return reply({verdict:cached.data.verdict});
 const screened=await screenImageDetails(base64,vision);const verdict=screened.verdict;
 if(verdict==='unavailable'){const messages={BILLING_DISABLED:'Google Vision requires billing to be enabled for this project.',SERVICE_DISABLED:'Enable Cloud Vision API for the key’s Google project.',API_KEY_SERVICE_BLOCKED:'Restrict this key to Cloud Vision API, then save it again.',API_KEY_INVALID:'The Google Vision key is invalid. Check the private Vercel setting.',RATE_LIMIT_EXCEEDED:'Google Vision quota is exhausted. Try later.',PERMISSION_DENIED:'Google rejected access. Check billing, API restrictions, and project permissions.'};return reply({error:(messages[screened.reason]||'Screening is temporarily unavailable.')+' Content stays pending.',reason:screened.reason},503);}
 const stored=await admin.from('content_screenings').upsert({asset_key:assetKey,verdict,reviewer_id:auth.user.id},{onConflict:'asset_key'});
 if(stored.error)return reply({error:'Could not save screening. Content stays pending.'},503);
 return reply({verdict});
}
