import {createClient} from '@supabase/supabase-js';
import {linkPreview,readPublic} from '../../../../lib/link-preview.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
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
 const preview=await linkPreview(data.url);
 if(!new URL(request.url).searchParams.has('image'))return Response.json({available:!!preview.image,video:preview.video},{headers});
 if(!preview.image)return new Response(null,{status:404,headers});
 try{const image=await readPublic(preview.image,{image:true});return new Response(image.body,{headers:{...headers,'Content-Type':image.type}})}catch{return new Response(null,{status:404,headers})}
}
