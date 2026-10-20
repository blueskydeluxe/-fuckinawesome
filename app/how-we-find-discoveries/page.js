import LearnPage,{learnMetadata} from '../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('how-we-find-discoveries');
export default function Page(){return <LearnPage pageKey="how-we-find-discoveries"/>;}
