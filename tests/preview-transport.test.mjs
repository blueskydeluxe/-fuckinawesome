import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {PassThrough} from 'node:stream';
import {EventEmitter} from 'node:events';
import {isIP} from 'node:net';
import {gzipSync,brotliCompressSync,deflateSync,createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';
const source=fs.readFileSync(new URL('../lib/link-preview.mjs',import.meta.url),'utf8').replace(/^import .*?;\r?\n/gm,'').replace(/export /g,'');
function reader(body,encoding='',redirect=false){
 const https={get(url,options,callback){const req=new EventEmitter();req.destroy=error=>{if(error)req.emit('error',error);req.emit('close')};queueMicrotask(()=>{const res=new PassThrough();res.statusCode=redirect&&url.pathname==='/start'?302:200;res.headers=res.statusCode===302?{location:'/large'}:{'content-type':'text/html','content-encoding':encoding};res.resume=res.resume.bind(res);res.on('close',()=>req.emit('close'));callback(res);if(!res.destroyed)res.end(body)});return req}};
 const context={https,Resolver:class{async resolve4(){return ['8.8.8.8']}},isIP,blockedContentLink:()=>false,Buffer,URL,setTimeout,clearTimeout,createGunzip,createInflate,createBrotliDecompress};
 vm.runInNewContext(source+';this.reader=readPublic;',context);return context.reader;
}
test('ordinary previews retain the small page bound while galleries accept larger pages',async()=>{
 const body=Buffer.alloc(700*1024,32);await assert.rejects(reader(body)('https://example.com'),/too large/);assert.equal((await reader(body)('https://example.com',{gallery:true})).body.length,body.length);
});
test('gallery page prefixes remain bounded even when the source exceeds the limit',async()=>{
 const page=await reader(Buffer.alloc(5*1024*1024,32))('https://example.com',{gallery:true});assert.equal(page.body.length,4*1024*1024);
});
test('compressed HTML is decoded and decompression retains the size bound',async()=>{
 const body=Buffer.from('<main><img src="/gallery.jpg"></main>');for(const [encoding,compress] of [['gzip',gzipSync],['br',brotliCompressSync],['deflate',deflateSync]])assert.deepEqual((await reader(compress(body),encoding)('https://example.com',{gallery:true})).body,body);
 await assert.rejects(reader(gzipSync(Buffer.alloc(700*1024,32)),'gzip')('https://example.com'),/too large/);
});
test('redirects preserve gallery bounds and unrecognized encodings fail closed',async()=>{
 const body=Buffer.alloc(700*1024,32);assert.equal((await reader(body,'',true)('https://example.com/start',{gallery:true})).body.length,body.length);await assert.rejects(reader(Buffer.from('test'),'unknown')('https://example.com'),/Unsupported encoding/);
});
