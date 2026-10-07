import {notFound} from 'next/navigation';
import Hall from '../../hall';
import {publicDiscovery,discoveryDescription} from '../../../lib/public-discovery.mjs';
export const dynamic='force-dynamic';
export async function generateMetadata({params}){const {id}=await params;const item=await publicDiscovery(id);if(!item)return {title:'Discovery unavailable',robots:{index:false,follow:false}};const description=discoveryDescription(item),url='https://fuckinawesome.com/discovery/'+id,images=item.image_path?[{url:url+'/cover',alt:item.title}]:[];return {title:item.title+' — Fuckin Awesome',description,alternates:{canonical:url},openGraph:{type:'website',siteName:'Fuckin Awesome',title:item.title,description,url,images},twitter:{card:'summary_large_image',title:item.title,description,images:images.map(x=>x.url)}}}
export default async function DiscoveryPage({params}){const {id}=await params;const item=await publicDiscovery(id);if(!item)notFound();return <Hall initialDiscovery={id} initialItem={item}/>}
