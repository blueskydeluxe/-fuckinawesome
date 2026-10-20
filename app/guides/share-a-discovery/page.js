import LearnPage,{learnMetadata} from '../../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('share-a-discovery');
export default function Page(){return <LearnPage pageKey="share-a-discovery"/>;}
