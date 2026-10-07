export function cardImageUrl(id,width=640){return '/discovery/'+id+'/cover?w='+width}
export function videoSource(url){try{return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(new URL(url).hostname)}catch{return false}}
