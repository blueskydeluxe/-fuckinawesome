import {createClient} from '@supabase/supabase-js';
import {popularTopics} from '../../../lib/topics.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
let cache=null,pending=null;
async function load(){const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const rows=[];for(let offset=0;;offset+=1000){const {data,error}=await client.from('submissions').select('id,tags').eq('status','approved').is('deleted_at',null).order('id').range(offset,offset+999);if(error)throw error;rows.push(...data);if(data.length<1000)break}const topics=popularTopics(rows);cache={topics,until:Date.now()+300000};return topics}
export async function GET(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return Response.json([]);try{if(!cache||cache.until<Date.now()){if(!pending)pending=load().finally(()=>{pending=null});await pending}return Response.json(cache.topics,{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=60'}})}catch{return Response.json([],{status:503,headers:{'Cache-Control':'no-store'}})}}
