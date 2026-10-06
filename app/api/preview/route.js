import {createClient} from '@supabase/supabase-js';
import {linkPreview,readPublic,previewUrl} from '../../../lib/link-preview.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const attempts=new Map();
export async function POST(request){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const token=request.headers.get('authorization')?.replace(/^Bearer /i,'');
 if(!token)return new Response(null,{status:401,headers});
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(token);if(error||!data.user)return new Response(null,{status:401,headers});
 const now=Date.now(),previous=attempts.get(data.user.id),count=previous&&previous.until>now?previous.count:0;
 if(count>=30)return new Response('Preview limit reached. Upload a cover instead.',{status:429,headers});
 if(attempts.size>500)attempts.delete(attempts.keys().next().value);attempts.set(data.user.id,{count:count+1,until:previous?.until>now?previous.until:now+3600000});
 try{const body=await request.json();if(typeof body.url!=='string'||body.url.length>2048||!previewUrl(body.url))return new Response(null,{status:400,headers});const preview=await linkPreview(body.url);if(body.mode==='details')return Response.json({title:preview.title||'',description:preview.description||'',hasImage:!!preview.image},{headers});if(!preview.image)return new Response(null,{status:404,headers});const image=await readPublic(preview.image,{image:true});return new Response(image.body,{headers:{...headers,'Content-Type':image.type}})}catch{return new Response(null,{status:404,headers})}
}
