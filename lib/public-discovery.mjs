import {createClient} from '@supabase/supabase-js';
import {selectOpeningRows} from './themed-collections.mjs';
export const validDiscoveryId=id=>/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id||'');
export function publicClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null}
export async function publicDiscovery(id){if(!validDiscoveryId(id))return null;const db=publicClient();if(!db)return null;const {data,error}=await db.from('discoveries').select('*').eq('id',id).eq('status','approved').maybeSingle();return error?null:data}
export function discoveryDescription(item){return (item.description?.trim()||'An extraordinary find. Explore the details and help decide what rises.').replace(/\s+/g,' ').slice(0,240)}
export async function publicOpeningDiscoveries(){
 const db=publicClient();if(!db)return [];
 try{
  const {data,error}=await db.from('discoveries').select('*').eq('status','approved').not('image_path','is',null).order('created_at',{ascending:false}).limit(50).abortSignal(AbortSignal.timeout(5000));
  return error?[]:selectOpeningRows(data||[],15);
 }catch{return []}
}
