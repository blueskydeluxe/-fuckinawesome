import LearnPage,{learnMetadata} from '../../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('discover-beyond-your-feed');
export default function Page(){return <LearnPage pageKey="discover-beyond-your-feed"/>;}
