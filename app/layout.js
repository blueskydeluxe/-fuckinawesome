import './globals.css';
export const metadata = { title: 'Fuckin Awesome — Internet’s Hall of Awesome', description: 'Discover, vote on, and share the coolest shit on the internet.', metadataBase: new URL('https://fuckinawesome.com') };
export default function Layout({children}) { return <html lang="en"><body>{children}</body></html>; }
