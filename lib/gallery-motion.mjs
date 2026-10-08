export function galleryPosition(offset,width,count){return width>0&&count>0?Math.max(0,Math.min(count-1,Math.round(offset/width))):0}
export function galleryRelease(start,dx,velocity,width,count){
 if(width<=0||count<2)return Math.max(0,start);
 const deliberate=Math.abs(dx)>=width*.18||(Math.abs(dx)>=12&&Math.abs(velocity)>=.4);
 return Math.max(0,Math.min(count-1,start+(deliberate?(dx<0?1:-1):0)));
}
