'use client';
import {useEffect,useRef} from 'react';
import BrandLogo from './brand-logo';

function Links(){return <><a href="/about">Why we exist</a><a href="/how-it-works">How it works</a><a href="/guides">Guides</a><a href="/">Explore discoveries ↗</a></>;}
export default function LearnHeader(){
 const menu=useRef(null),trigger=useRef(null);
 useEffect(()=>{
  function outside(event){if(menu.current?.open&&!menu.current.contains(event.target))menu.current.open=false;}
  function escape(event){if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;trigger.current?.focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 return <header className="learn-header"><div className="wrap nav"><BrandLogo/><nav className="learn-desktop-nav" aria-label="Learn about FuckinAwesome"><Links/></nav><details className="learn-mobile-menu" ref={menu}><summary ref={trigger} aria-label="Site menu"><span className="learn-menu-icon" aria-hidden="true"><span/><span/><span/></span></summary><nav aria-label="Mobile site navigation"><Links/></nav></details></div></header>;
}
