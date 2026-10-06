// Redrawing pixels produces a fresh JPEG without the source file's EXIF/GPS data.
export async function preparePhoto(file){
 if(!file)throw Error('Choose a photo first.');
 if(file.size>20*1024*1024)throw Error('Choose a photo smaller than 20 MB.');
 if(!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)&&!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type))throw Error('Choose a JPG, PNG, WebP, or supported phone photo.');
 const originalUrl=URL.createObjectURL(file);const image=new Image();
 try{
  image.src=originalUrl;
  try{await image.decode()}catch{throw Error('This photo format could not be opened. Try a JPG or PNG, or take a new photo.');}
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>50000000)throw Error('This photo is too large to process. Choose a smaller photo.');
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Your browser could not prepare this photo. Try another browser.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
  if(!blob)throw Error('Your browser could not prepare this photo.');
  if(blob.size>4*1024*1024)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.65));
  if(!blob||blob.size>5*1024*1024)throw Error('This photo is too large. Choose a smaller photo.');
  return new File([blob],'discovery.jpg',{type:'image/jpeg'});
 }finally{URL.revokeObjectURL(originalUrl)}
}
