import test from 'node:test';import assert from 'node:assert/strict';
import {swipeIntent,swipeVote} from '../lib/swipe.mjs';
import {hasCommentLink} from '../lib/comment-rules.mjs';
test('scrolling and small movements never cast a vote',()=>{assert.equal(swipeIntent(4,50),'scroll');assert.equal(swipeIntent(5,4),'wait');assert.equal(swipeVote(89),0);assert.equal(swipeVote(-89),0)});
test('deliberate horizontal swipes vote in the correct direction',()=>{assert.equal(swipeIntent(95,15),'swipe');assert.equal(swipeVote(95),1);assert.equal(swipeVote(-95),-1)});
test('comments reject links including bare domains and disguised protocol text',()=>{for(const text of ['https://example.com','www.example.com','example.com/path','example.com!','EXAMPLE.COM','https://exa\u200Bmple.com','ｈｔｔｐｓ://example.com','<a href="test">x</a>','someone@example.com'])assert.equal(hasCommentLink(text),true,text)});
test('ordinary opinions and decimal numbers remain valid',()=>{for(const text of ['This is fuckin awesome!','The design is 9.5 out of 10.','Great hair styling. Love the colors!'])assert.equal(hasCommentLink(text),false,text)});
