import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { tileBounds, tileAt, tileLevel, tileURL } from '../src/modules/solar-system/earth-tiles.js';
test('imagery fixture and matrix match the recorded NASA source',()=>{
 const root=new URL('../',import.meta.url),source=JSON.parse(fs.readFileSync(new URL('data/earth/imagery-source.json',root)));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(source.sample.file,root))).digest('hex'),source.sample.sha256);
 assert.equal(source.sample.url,tileURL({level:7,y:20,x:118}));
 for(const level of source.matrix.levels){assert.equal(Math.ceil(360/tileBounds(level,0,0).span),source.matrix.widths[level]);assert.equal(Math.ceil(180/tileBounds(level,0,0).span),source.matrix.heights[level]);}
});
test('GIBS 500m uses 288 degree root tiles, not an XYZ/Web Mercator grid',()=>{
 assert.deepEqual(tileBounds(0,0,0),{west:-180,east:108,north:90,south:-90,span:288});
 assert.deepEqual(tileBounds(0,1,0),{west:108,east:180,north:90,south:-90,span:288});
 assert.deepEqual(tileAt(7,86.03,44.3),{level:7,x:118,y:20});
 assert.match(tileURL(tileAt(7,86.03,44.3)),/500m\/7\/20\/118\.jpeg$/);
});
test('imagery detail increases with screen demand and respects native maximum',()=>{
 assert(tileLevel(6378*1.16,6378,900,42)>tileLevel(6378*4.4,6378,900,42));
 assert.equal(tileLevel(6378*1.06,6378,1800,42),7);
 for(const lon of [-180,180,540,-540]){const tile=tileAt(7,lon,90);assert(tile.x>=0&&tile.x<160);assert.equal(tile.y,0);}
 assert.equal(tileAt(7,0,-90).y,79);
});
