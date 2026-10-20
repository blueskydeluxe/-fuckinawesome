import LearnPage,{learnMetadata} from '../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('ai-policy');
export default function Page(){return <LearnPage pageKey="ai-policy"/>;}
