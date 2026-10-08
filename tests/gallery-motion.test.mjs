import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryPosition,galleryRelease} from '../lib/gallery-motion.mjs';
test('gallery position follows the nearest visible photo and stays in bounds',()=>{
 assert.equal(galleryPosition(140,300,5),0);assert.equal(galleryPosition(160,300,5),1);assert.equal(galleryPosition(-50,300,5),0);assert.equal(galleryPosition(2000,300,5),4);assert.equal(galleryPosition(20,0,5),0);
});
test('deliberate drags and short flicks move one photo without skipping',()=>{
 assert.equal(galleryRelease(2,-70,0,300,6),3);assert.equal(galleryRelease(2,70,0,300,6),1);assert.equal(galleryRelease(2,-20,-.6,300,6),3);assert.equal(galleryRelease(2,-900,-2,300,6),3);
});
test('small movements settle back and gallery edges do not wrap',()=>{
 assert.equal(galleryRelease(2,-10,-1,300,6),2);assert.equal(galleryRelease(2,-35,0,300,6),2);assert.equal(galleryRelease(0,200,1,300,6),0);assert.equal(galleryRelease(5,-200,-1,300,6),5);
});
