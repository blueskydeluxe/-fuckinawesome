import {test} from 'node:test';
import assert from 'node:assert/strict';
import {score,trending,safeLink} from '../lib/ranking.mjs';
test('score distinguishes no votes from a real zero',()=>{assert.equal(score(0,0),null);assert.equal(score(0,5),0);assert.equal(score(3,1),75)});
test('recent discoveries outrank older equally rated discoveries',()=>{const now=Date.parse('2026-10-05T12:00:00Z');assert.ok(trending(10,1,'2026-10-05T11:00:00Z',now)>trending(10,1,'2026-10-04T11:00:00Z',now));assert.ok(trending(0,10,'2026-10-05T11:00:00Z',now)<0)});
test('only web links without credentials can become outbound links',()=>{assert.equal(safeLink('javascript:alert(1)'),null);assert.equal(safeLink('https://user:pass@example.com'),null);assert.equal(safeLink('not a url'),null);assert.equal(safeLink('https://example.com'),'https://example.com/')});
