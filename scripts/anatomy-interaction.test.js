import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyInteractionMode, isSectionedLayer, sectionLayers } from '../src/modules/human-anatomy/interaction.js';

test('opening a cutaway retains enabled vessels and nerves and only clips occluding layers',()=>{
 const enabled={skeleton:true,surface:false,arteries:true,veins:true,nerves:false,meridians:false};
 const active=sectionLayers(enabled);
 assert.equal(active.arteries,true);assert.equal(active.veins,true);assert.equal(active.nerves,true);
 assert.equal(enabled.nerves,false,'Original layer selection is available for restoration');
 assert(isSectionedLayer('skeleton'));assert(isSectionedLayer('surface'));
 for(const layer of ['arteries','veins','nerves','meridians'])assert.equal(isSectionedLayer(layer),false);
});

test('pan mode moves the target with a primary drag on mouse and touch; orbit is reversible',()=>{
 const controls={mouseButtons:{},touches:{}};
 applyInteractionMode(controls,'pan');
 assert.equal(controls.mouseButtons.LEFT,THREE.MOUSE.PAN);assert.equal(controls.touches.ONE,THREE.TOUCH.PAN);
 assert.equal(controls.enablePan,true);assert.equal(controls.screenSpacePanning,true);
 applyInteractionMode(controls,'orbit');
 assert.equal(controls.mouseButtons.LEFT,THREE.MOUSE.ROTATE);assert.equal(controls.touches.ONE,THREE.TOUCH.ROTATE);
 assert.equal(controls.mouseButtons.RIGHT,THREE.MOUSE.PAN);
});
