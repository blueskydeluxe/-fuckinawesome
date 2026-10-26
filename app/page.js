import Hall from './hall';
import {publicOpeningDiscoveries} from '../lib/public-discovery.mjs';
export const dynamic='force-dynamic';
export default async function Page() { return <Hall initialItems={await publicOpeningDiscoveries()}/>; }
