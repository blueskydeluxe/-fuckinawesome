'use client';
import {useEffect} from 'react';
import {configureMeasurement,measurementAllowed,trackUsage} from '../lib/usage';
export default function UsageMeasurement({userId,consent}){
 useEffect(()=>{configureMeasurement(consent,userId);return()=>configureMeasurement(false,null)},[consent,userId]);
 useEffect(()=>{if(!userId||!measurementAllowed(consent,{doNotTrack:navigator.doNotTrack,globalPrivacyControl:navigator.globalPrivacyControl})||typeof PerformanceObserver==='undefined')return;let samples=0;const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(samples>=30)break;try{const url=new URL(entry.name);if(url.origin===location.origin&&/^\/discovery\/[\da-f-]+\/cover$|^\/api\/preview\/[\da-f-]+$/.test(url.pathname)&&entry.initiatorType==='img'){samples++;trackUsage('image',entry.duration)}}catch{}}});observer.observe({type:'resource',buffered:false});return()=>observer.disconnect()},[consent,userId]);
 return null;
}
