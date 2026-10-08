import sharp from 'sharp';
import {hallProgress} from './hall-moments.mjs';
import {createElement as h} from 'react';
import {ImageResponse} from 'next/og.js';
import {approvedWordmark} from './approved-wordmark.mjs';
export const socialFormats={portrait:{width:1080,height:1350,imageHeight:730},square:{width:1080,height:1080,imageHeight:520},story:{width:1080,height:1920,imageHeight:1200}};
export function xmlText(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]))}
export function titleLines(value,width=35,max=3){const words=String(value||'').replace(/\s+/g,' ').trim().split(' ');const lines=[''];for(const word of words){if((lines.at(-1)+' '+word).trim().length>width&&lines.at(-1)){if(lines.length===max){lines[max-1]=lines[max-1].slice(0,width-1)+'…';break}lines.push('')}lines[lines.length-1]=(lines.at(-1)+' '+word).trim()}return lines.map(line=>line.length>width?line.slice(0,width-1)+'…':line)}
export async function socialCard(photo,item,format='portrait'){
 const size=socialFormats[format];if(!size)throw Error('Unknown format');
 const image=await sharp(photo,{limitInputPixels:40000000}).rotate().resize(size.width,size.imageHeight,{fit:'cover'}).png().toBuffer();
 const up=Number(item.up_votes)||0,down=Number(item.down_votes)||0,neutral=Number(item.neutral_votes)||0,total=up+down+neutral;
 const winner=hallProgress(item).qualified;
 const y=140+size.imageHeight,lines=titleLines(item.title,35,format==='square'?2:3);
 const source=(()=>{try{return new URL(item.url).hostname.replace(/^www\./,'')}catch{return 'Community discovery'}})();
 // ImageResponse bundles its font and renders text to paths, so production does
 // not depend on operating-system fonts being installed on the server.
 const text=(value,left,top,fontSize,color='#fff',weight=400)=>h('div',{style:{position:'absolute',display:'flex',left,top,fontSize,color,fontWeight:weight,whiteSpace:'pre',lineHeight:1.2}},value);
 const logo='data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1394" height="127" viewBox="0 0 1394 127">${approvedWordmark}</svg>`).toString('base64');
 const element=h('div',{style:{display:'flex',position:'relative',width:size.width,height:size.height,background:'#111318',overflow:'hidden'}},
  h('img',{src:logo,width:948,height:86,style:{position:'absolute',left:62,top:27}}),
  h('img',{src:'data:image/png;base64,'+image.toString('base64'),width:size.width,height:size.imageHeight,style:{position:'absolute',left:0,top:140}}),
  h('div',{style:{position:'absolute',top:y,left:0,width:1080,height:7,background:'#ff8b32'}}),
  text((winner?'HALL OF FAME':(item.category||'Discovery').toUpperCase())+' · '+total.toLocaleString('en-US')+(total===1?' VOTE':' VOTES'),54,y+31,26,'#ff8b32',700),
  ...lines.map((line,i)=>text(line,54,y+80+i*53,46,'#fff',700)),
  text(winner?'THE COMMUNITY CALLED IT AWESOME.':'FUCKIN AWESOME OR BULLSHIT?',54,size.height-205,38,'#fff',700),
  text(winner?'10+ real votes. More than 80% awesome.':'Awesome · Meh · Bullshit. You decide.',54,size.height-145,28,'#cbd0d8'),
  text('Vote at fuckinawesome.com',54,size.height-91,31,'#ff8b32',700),
  text(source.slice(0,60)+' · Photo source and credits in the discovery',54,size.height-44,17,'#9ca5b1'));
 const response=new ImageResponse(element,{width:size.width,height:size.height});
 return Buffer.from(await response.arrayBuffer());
}
