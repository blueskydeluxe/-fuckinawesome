import {db} from './supabase';
export async function requestScreening(kind,id){
 try{const {data}=await db.auth.getSession();const response=await fetch('/api/moderation/screen',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session?.access_token},body:JSON.stringify({kind,id}),signal:AbortSignal.timeout(25000)});if(!response.ok)return 'unavailable';return (await response.json()).verdict||'unavailable';}catch{return 'unavailable'}
}
