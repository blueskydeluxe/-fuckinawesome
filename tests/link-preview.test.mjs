import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,previewUrl,parsePreview,youtubeId} from '../lib/link-preview.mjs';
test('preview requests reject private destinations and credential-bearing URLs',()=>{
 for(const address of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','::1','224.0.0.1'])assert.equal(publicAddress(address),false,address);
 assert.equal(publicAddress('8.8.8.8'),true);
 for(const url of ['http://example.com','https://user:secret@example.com','https://example.com:8080','file:///etc/passwd'])assert.equal(previewUrl(url),null);
});
test('metadata supports attribute order, relative images and encoded query strings',()=>{
 assert.deepEqual(parsePreview('<meta content="/cover.jpg?a=1&amp;b=2" property="og:image"><meta property="og:type" content="video.other">','https://example.com/page'),{image:'https://example.com/cover.jpg?a=1&b=2',video:true});
 assert.equal(parsePreview('<meta name="twitter:image" content="javascript:alert(1)">','https://example.com').image,null);
});
test('video thumbnails use exact supported hosts and valid YouTube IDs',()=>{
 assert.equal(youtubeId('https://youtu.be/hf_zOjlxvhU'), 'hf_zOjlxvhU');
 assert.equal(youtubeId('https://youtube.com/shorts/hf_zOjlxvhU'), 'hf_zOjlxvhU');
 assert.equal(youtubeId('https://google.com/search#vld=vid:hf_zOjlxvhU,st:0'), 'hf_zOjlxvhU');
 assert.equal(youtubeId('https://youtube.com.attacker.com/watch?v=hf_zOjlxvhU'),null);
});
