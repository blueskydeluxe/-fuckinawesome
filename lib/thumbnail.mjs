import sharp from 'sharp';
export function thumbnailWidth(value){return [320,640,960].includes(Number(value))?Number(value):null}
export async function thumbnail(bytes,width){return sharp(bytes,{limitInputPixels:50000000}).rotate().resize({width,withoutEnlargement:true}).webp({quality:78,effort:3}).toBuffer()}
