import LearnPage,{learnMetadata} from '../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('for-creators');
export default function Page(){return <LearnPage pageKey="for-creators"/>;}
