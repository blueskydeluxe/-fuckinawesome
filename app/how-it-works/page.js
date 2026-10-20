import LearnPage,{learnMetadata} from '../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('how-it-works');
export default function Page(){return <LearnPage pageKey="how-it-works"/>;}
