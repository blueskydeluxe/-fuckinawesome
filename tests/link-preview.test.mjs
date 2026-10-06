import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,previewUrl,parsePreview,youtubeId,videoEmbed,shortDescription} from '../lib/link-preview.mjs';
test('preview requests reject private destinations and credential-bearing URLs',()=>{
 for(const address of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','::1','224.0.0.1'])assert.equal(publicAddress(address),false,address);
 assert.equal(publicAddress('8.8.8.8'),true);
 for(const url of ['http://example.com','https://user:secret@example.com','https://example.com:8080','file:///etc/passwd'])assert.equal(previewUrl(url),null);
});
test('metadata supports attribute order, relative images and encoded query strings',()=>{
 assert.deepEqual(parsePreview('<meta content="/cover.jpg?a=1&amp;b=2" property="og:image"><meta property="og:type" content="video.other">','https://example.com/page'),{image:'https://example.com/cover.jpg?a=1&b=2',video:true,description:'',embed:null});
 assert.equal(parsePreview('<meta name="twitter:image" content="javascript:alert(1)">','https://example.com').image,null);
});
test('video thumbnails use exact supported hosts and valid YouTube IDs',()=>{
 assert.equal(youtubeId('https://youtu.be/hf_zOjlxvhU'), 'hf_zOjlxvhU');
 assert.equal(youtubeId('https://youtube.com/shorts/hf_zOjlxvhU'), 'hf_zOjlxvhU');
 assert.equal(youtubeId('https://google.com/search#vld=vid:hf_zOjlxvhU,st:0'), 'hf_zOjlxvhU');
 assert.equal(youtubeId('https://youtube.com.attacker.com/watch?v=hf_zOjlxvhU'),null);
});
test('missing metadata does not invent an image URL',()=>{assert.equal(parsePreview('<html></html>','https://example.com/page').image,null)});

test('embed URLs only use supported player hosts',()=>{assert.equal(videoEmbed('https://youtu.be/hf_zOjlxvhU'),'https://www.youtube-nocookie.com/embed/hf_zOjlxvhU?playsinline=1&rel=0');assert.equal(videoEmbed('https://vimeo.com/76979871'),'https://player.vimeo.com/video/76979871?dnt=1');assert.equal(videoEmbed('https://vimeo.com.attacker.com/76979871'),null);assert.equal(videoEmbed('https://example.com/video'),null)});
test('page descriptions are short plain text and decode entities',()=>{assert.equal(shortDescription('<b>Cool</b> &amp; beautiful.'),'Cool & beautiful.');assert.equal(shortDescription('word '.repeat(100)).split(' ').length,60);assert.equal(parsePreview('<meta name="description" content="A short page description">','https://example.com').description,'A short page description')});
