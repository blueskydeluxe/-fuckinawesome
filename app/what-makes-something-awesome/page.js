import LearnPage,{learnMetadata} from '../learn-content';
export const revalidate=300;
export const metadata=learnMetadata('what-makes-something-awesome');
export default function Page(){return <LearnPage pageKey="what-makes-something-awesome"/>;}
