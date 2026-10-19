import {publicClient} from '../lib/public-discovery.mjs';

export const revalidate=3600;
export default async function sitemap(){
 const base='https://fuckinawesome.com';
 const pages=['','/about','/community','/privacy'].map(path=>({url:base+path}));
 const db=publicClient();
 if(!db)throw new Error('Public discovery connection is unavailable');
 // Use the public approved-only view, never moderation or private account data.
 for(let offset=0;offset<50000;offset+=500){
  const {data,error}=await db.from('discoveries').select('id').eq('status','approved').order('id').range(offset,offset+499);
  if(error)throw new Error('Could not build the public discovery sitemap');
  pages.push(...data.map(item=>({url:base+'/discovery/'+item.id})));
  if(data.length<500)return pages;
 }
 throw new Error('Discovery sitemap needs splitting before exceeding the URL limit');
}
