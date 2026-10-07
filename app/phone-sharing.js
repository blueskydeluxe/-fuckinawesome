'use client';
import {useEffect,useState} from 'react';
const tipsKey='awesome-phone-tips-dismissed';
export default function PhoneSharing(){
 const [prompt,setPrompt]=useState(null),[installed,setInstalled]=useState(false),[help,setHelp]=useState(false),[dismissed,setDismissed]=useState(true);
 useEffect(()=>{try{setDismissed(localStorage.getItem(tipsKey)==='1')}catch{setDismissed(false)}if('serviceWorker' in navigator)navigator.serviceWorker.register('/share-worker.js',{scope:'/'}).catch(()=>{});setInstalled(window.matchMedia('(display-mode: standalone)').matches||!!navigator.standalone);function offer(e){e.preventDefault();setPrompt(e)}function done(){setInstalled(true);setPrompt(null)}window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',done);return()=>{window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',done)}},[]);
 function minimize(){setDismissed(true);setHelp(false);try{localStorage.setItem(tipsKey,'1')}catch{}}
 async function install(){if(prompt){await prompt.prompt();setPrompt(null)}}
 return <section className={'phone-sharing '+(dismissed&&!help?'phone-sharing-minimized':'')} aria-label="Mobile sharing tips">
  {!dismissed&&<div><strong>Found something awesome on your phone?</strong><p>Share a link or screenshot with fewer steps.</p></div>}
  <div className="phone-sharing-controls"><button aria-expanded={help} aria-controls="phone-sharing-help" onClick={()=>help?minimize():setHelp(true)}>{help?'Hide tips':dismissed?'Sharing tips':'How to share faster'}</button>{!dismissed&&!help&&<button className="phone-tip-dismiss" aria-label="Dismiss mobile sharing tips" onClick={minimize}>×</button>}</div>
  {help&&<div className="phone-help" id="phone-sharing-help"><p><strong>Android:</strong> install Fuckin Awesome using your browser’s “Install app” or “Add to home screen.” In supported browsers, choose Fuckin Awesome from another app’s Share menu to bring in a link or photo.</p><p><strong>iPhone:</strong> Safari → Share → Add to Home Screen. Copy a link or take a screenshot, then open Fuckin Awesome and tap Submit Something. If Fuckin Awesome isn’t in your phone’s Share menu, use this copy-and-open method.</p><p>If a source keeps its preview private, add its screenshot. Your shared draft stays on this device until you submit or discard it.</p><div className="actions">{prompt&&!installed&&<button onClick={install}>Add to your phone</button>}<button onClick={minimize}>Got it</button></div></div>}
 </section>;
}
