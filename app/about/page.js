export const metadata={title:'Discover extraordinary things, then vote — Fuckin Awesome',description:'What is Fuckin Awesome? A discovery site for remarkable inventions, design, art, places and more, with Awesome, Meh and Bullshit community voting.',alternates:{canonical:'https://fuckinawesome.com/about'}};
export default function About(){
 const data={'@context':'https://schema.org','@type':'WebSite',name:'Fuckin Awesome',alternateName:'FuckinAwesome.com',url:'https://fuckinawesome.com',description:'Discover extraordinary things on the internet and vote Awesome, Meh or Bullshit.',publisher:{'@type':'Organization',name:'Black Dog LLC'}};
 return <main style={{maxWidth:900,margin:'auto',padding:'32px 24px',color:'#20252b',background:'#fff',lineHeight:1.7}}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data)}}/>
  <a href="/">← Explore Fuckin Awesome</a>
  <h1>Extraordinary finds. Real people decide what rises.</h1>
  <p>Fuckin Awesome gathers remarkable things from across the internet in one place. Browse discoveries, see their photos and available videos, visit the original source, and vote Awesome, Meh or Bullshit.</p>
  <h2>What can you discover?</h2>
  <p>Explore inventions and gadgets, cars and machines, watches and craftsmanship, architecture, art, food, music, travel and outdoor experiences. Discoveries can include new releases, concepts and established subjects worth a closer look; check each description and source for availability and context.</p>
  <h2>How does voting work?</h2>
  <p>Sign in to cast your vote. Awesome and Bullshit contribute to the two verdict meters; Meh counts as participation without endorsing either verdict. Community votes shape the Hall of Fame and Hall of Bullshit. The Unvoted view shows discoveries you have not personally voted on.</p>
  <h2>Where do discoveries come from?</h2>
  <p>Discoveries include community submissions and research-selected additions. They link to manufacturers, creators and other sources. Moderation helps keep irrelevant media, duplicates and prohibited content out. A published discovery is an invitation to judge a subject, not a claim that everybody likes it.</p>
  <h2>What is Internet interest?</h2>
  <p>The five-segment Internet interest indicator is separate from community votes. Its explanation identifies the evidence used for a reviewed rating. Interest unknown means there is not a published assessment. It is not a live search-volume measurement or a sales ranking.</p>
  <h2>Try it</h2>
  <p><a href="/">Choose an interest and start exploring</a>. Open a discovery, inspect it, and make your call. Follow <a href="https://www.instagram.com/fuckinawesomedotcom/">@fuckinawesomedotcom on Instagram</a> for more finds.</p>
  <p>Operated by Black Dog LLC. <a href="/community">Community guidelines</a> · <a href="/privacy">Privacy</a> · <a href="mailto:support@fuckinawesome.com">Contact support</a></p>
 </main>;
}
