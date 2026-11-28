import test from 'node:test';
import assert from 'node:assert/strict';
import {CatmullRomCurve3,Vector3} from 'three';
import {frameDelta,loopPhase} from '../src/time.js';
test('visibility changes cannot reverse animation time or send a curve outside its domain',()=>{
 const curve=new CatmullRomCurve3([new Vector3(0,0,0),new Vector3(1,2,0),new Vector3(2,0,1)]);
 for(const raw of [-100,-.001,0,16.7,10000,NaN,Infinity]){
  const dt=frameDelta(raw);assert.ok(dt>=0&&dt<=.05);
  const t=loopPhase(raw);assert.ok(t>=0&&t<1);assert.ok(curve.getPoint(t).toArray().every(Number.isFinite));
 }
 assert.equal(frameDelta(16),.016);assert.equal(frameDelta(-1),0);
});
