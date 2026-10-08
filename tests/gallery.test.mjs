import test from 'node:test';
import assert from 'node:assert/strict';
import {relatedImages} from '../lib/link-preview.mjs';
test('collect repeated preview images and product photos without duplicates',()=>{
 const html='<meta property="og:image" content="/one.jpg"><meta property="og:image" content="/two.jpg"><script type="application/ld+json">{"@type":"Product","image":["/one.jpg","/three.jpg"]}</script><main><img width="800" height="600" src="/four.jpg"><img width="16" height="16" src="/tiny.jpg"><img src="/logo.png"></main>';
 assert.deepEqual(relatedImages(html,'https://example.com/product').map(x=>x.url),['https://example.com/one.jpg','https://example.com/two.jpg','https://example.com/three.jpg','https://example.com/four.jpg']);
});
test('Wikipedia galleries use large versions and exclude navigation graphics',()=>{
 const html='<img src="//upload.wikimedia.org/wikipedia/commons/0/00/navigation.jpg"><div class="mw-content-ltr mw-parser-output"><ul class="gallery"><li><img width="180" height="120" alt="Lake" src="//thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Lake.jpg/250px-Lake.jpg"></li><li><img width="180" height="120" src="//thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Lake.jpg/500px-Lake.jpg"></li><li><img width="180" height="120" src="//upload.wikimedia.org/wikipedia/commons/a/ab/Location_map.svg"></li></ul></div>';
 const images=relatedImages(html,'https://en.wikipedia.org/wiki/Lake');assert.equal(images.length,1);assert.match(images[0].url,/960px-Lake.jpg$/);assert.equal(images[0].alt,'Lake');
});
test('unsafe images and malformed structured data never become gallery entries',()=>{
 const html='<meta property="og:image" content="javascript:alert(1)"><script type="application/ld+json">invalid</script><main><img src="http://example.com/plain.jpg"><img src="https://user:password@example.com/private.jpg"><img src="/good.jpg"></main>';
 assert.deepEqual(relatedImages(html,'https://example.com').map(x=>x.url),['https://example.com/good.jpg']);
});
test('candidate galleries are bounded and do not collect sitewide footer images',()=>{
 const html='<main>'+Array.from({length:40},(_,i)=>`<img src="/${i}.jpg">`).join('')+'</main><footer><img src="/unrelated.jpg"></footer>';
 const images=relatedImages(html,'https://example.com');assert.equal(images.length,24);assert.ok(images.every(x=>!x.url.includes('unrelated')));
});
