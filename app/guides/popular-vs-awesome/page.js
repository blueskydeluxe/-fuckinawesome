import LearnPage,{learnMetadata} from '../../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('popular-vs-awesome');
export default function Page(){return <LearnPage pageKey="popular-vs-awesome"/>;}
