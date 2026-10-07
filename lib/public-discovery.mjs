import {createClient} from '@supabase/supabase-js';
export const validDiscoveryId=id=>/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id||'');
export function publicClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null}
export async function publicDiscovery(id){if(!validDiscoveryId(id))return null;const db=publicClient();if(!db)return null;const {data,error}=await db.from('discoveries').select('*').eq('id',id).eq('status','approved').maybeSingle();return error?null:data}
export function discoveryDescription(item){const votes=Number(item.up_votes)+Number(item.down_votes);const score=votes?Math.round(Number(item.up_votes)/votes*100)+'% awesome · '+votes+' votes':'Be the first to vote';return (score+' — '+(item.description||'Discover, vote, and share something fuckin awesome.')).replace(/\s+/g,' ').slice(0,240)}
