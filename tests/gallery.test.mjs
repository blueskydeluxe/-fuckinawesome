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
test('rental and hotel structured data includes nested photos without host avatars',()=>{
 const data={'@type':'VacationRental',image:['/outside.jpg',{contentUrl:'/bedroom.jpg',caption:'Bedroom'}],containsPlace:{'@type':'Accommodation',image:'/view.jpg'},host:{'@type':'Person',image:'/headshot.jpg'}};
 const images=relatedImages(`<script type="application/ld+json">${JSON.stringify(data)}</script>`,'https://example.com/stay');
 assert.deepEqual(images.map(x=>x.url),['https://example.com/outside.jpg','https://example.com/bedroom.jpg','https://example.com/view.jpg']);assert.equal(images[1].alt,'Bedroom');
});
test('Next and Shopify JSON galleries skip recommendations, reviews, and non-image media',()=>{
 const data={props:{pageProps:{product:{images:[{originalUrl:'/front.jpg',alt:'Front'}],media:[{media_type:'image',src:'/back.jpg'},{media_type:'video',src:'/movie.mp4'}]},recommendedProducts:[{images:['/unrelated.jpg']}],reviews:[{images:['/review.jpg']}]}}};
 const images=relatedImages(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`,'https://example.com/item');assert.deepEqual(images.map(x=>x.url),['https://example.com/front.jpg','https://example.com/back.jpg']);
});
test('Airbnb-style nested media objects are collected at a display-sized resolution',()=>{
 const data={niobeClientData:[['StaysPdpSections', {data:{presentation:{stayProductDetailPage:{sections:{sections:[{section:{mediaItems:[{baseUrl:'https://a0.muscache.com/im/pictures/stay/photo.jpeg',accessibilityLabel:'Kitchen'},{baseUrl:'https://a0.muscache.com/im/pictures/stay/photo.jpeg?im_w=240'},{baseUrl:'https://a0.muscache.com/im/pictures/stay/view.jpeg'}]}}]}}}}}]]};
 const images=relatedImages(`<script type="application/json" id="data-deferred-state-0">${JSON.stringify(data)}</script>`,'https://www.airbnb.com/rooms/123');assert.equal(images.length,2);assert.equal(images[0].alt,'Kitchen');assert.equal(new URL(images[0].url).searchParams.get('im_w'),'960');
});
test('nested standalone carousels include full-size links, lazy pictures, and gallery backgrounds',()=>{
 const html='<nav><img src="/navigation.jpg"></nav><div class="product-gallery"><div><a href="/large.jpg"><img width="40" height="40" src="/tiny.jpg"></a></div><div><picture><source data-srcset="/medium.jpg 640w, /big.jpg 1200w"><img data-lazy-src="/lazy.jpg"></picture></div><div style="background-image:url(\'/background.jpg\')"></div></div><footer><img src="/footer.jpg"></footer>';
 const images=relatedImages(html,'https://example.com/product');assert.deepEqual(images.map(x=>x.url),['https://example.com/large.jpg','https://example.com/big.jpg','https://example.com/lazy.jpg','https://example.com/background.jpg']);
});
test('JSON assignments and serialized React frames are parsed without executing scripts',()=>{
 const frame='1:'+JSON.stringify({product:{images:['/frame.jpg']}})+'\n';
 const html='<script>window.__INITIAL_STATE__={"product":{"photos":["/state.jpg"]}};</script><script>self.__next_f.push('+JSON.stringify([1,frame])+')</script><script>globalThis.galleryExecuted=true;</script>';
 assert.deepEqual(relatedImages(html,'https://example.com').map(x=>x.url),['https://example.com/state.jpg','https://example.com/frame.jpg']);assert.equal(globalThis.galleryExecuted,undefined);
});
test('image wrappers and resizing variants deduplicate while query-based photo IDs remain distinct',()=>{
 const html='<main><img src="/_next/image?url=%2Fphoto.jpg&w=640&q=75"><img src="/photo.jpg?w=1200"><img src="/image.php?id=1&w=640"><img src="/image.php?id=2&w=640"></main>';
 assert.deepEqual(relatedImages(html,'https://example.com').map(x=>x.url),['https://example.com/photo.jpg','https://example.com/image.php?id=1&w=640','https://example.com/image.php?id=2&w=640']);
});
test('encoded gallery attributes are supported but malformed JSON and credentials are rejected',()=>{
 const html='<section class="gallery" data-images="[&quot;/one.jpg&quot;,&quot;https://user:pass@example.com/private.jpg&quot;]"><img data-zoom-image="/zoom.jpg"></section><script type="application/json">invalid</script>';
 assert.deepEqual(relatedImages(html,'https://example.com').map(x=>x.url),['https://example.com/one.jpg','https://example.com/zoom.jpg']);
});

test('Wix srcsets preserve commas inside image URLs and select a real full-sized photo',()=>{const html='<main><img src="/fallback.jpg" srcset="https://static.wixstatic.com/media/product.png/v1/fill/w_400,h_300,al_c/product.png 1x, https://static.wixstatic.com/media/product.png/v1/fill/w_800,h_600,al_c/product.png 2x"></main>';const images=relatedImages(html,'https://www.benbuttons.com/');assert.equal(images[0].url,'https://static.wixstatic.com/media/product.png/v1/fill/w_400,h_300,al_c/product.png')});
test('visually reviewed Benjamin logos cannot reappear through resized CDN variants',()=>{const html='<meta property="og:image" content="https://static.wixstatic.com/media/30a59a_6f5bf3e9245e43018572b8dc44ee0a70~mv2.png/v1/fill/w_600,h_600/file.png"><main><img width="800" height="600" src="https://static.wixstatic.com/media/3c1df6_ac5cb09a2f92437d918e7eb484cf9e60~mv2.png"><img src="/actual-product.jpg"></main>';assert.deepEqual(relatedImages(html,'https://www.benbuttons.com/').map(x=>x.url),['https://www.benbuttons.com/actual-product.jpg'])});
