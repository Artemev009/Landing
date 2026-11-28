import test from 'node:test';
import assert from 'node:assert/strict';
import {CatmullRomCurve3,Vector3} from 'three';
import {NavigationSystem,standAt,moveFoot,clearBody,stairHeight} from '../src/navigation.js';
import {EXHIBITS,ENTRY,EYE,STAIRS,OVERVIEW} from '../src/config.js';
const nav=new NavigationSystem();
test('all 30 directed exhibit/entry routes are walkable at every sampled point',()=>{
 const stops=[{id:'entry',view:ENTRY},...EXHIBITS];
 for(const a of stops)for(const b of stops){if(a===b)continue;const route=nav.route(a.view,b.view);
  assert.deepEqual(route[0],a.view);assert.deepEqual(route.at(-1),b.view);
  for(let k=1;k<route.length;k++)assert.ok(nav.segmentSafe(route[k-1],route[k]),a.id+' → '+b.id);
 }
});
test('manual capsule follows every route without tunnelling or falling',()=>{
 for(const e of EXHIBITS)for(const [from,to] of [[ENTRY,e.view],[e.view,ENTRY]]){const route=nav.route(from,to);let foot=[...from];
  for(const target of route.slice(1)){
   for(let frame=0;frame<3000;frame++){
    const dx=target[0]-foot[0],dz=target[2]-foot[2],dist=Math.hypot(dx,dz);if(dist<.025)break;
    const old=foot;foot=moveFoot(foot,dx/dist*Math.min(.035,dist),dz/dist*Math.min(.035,dist));
    assert.ok(Math.abs(foot[1]-old[1])<.26);assert.ok(clearBody(foot));assert.ok(standAt(foot[0],foot[2],foot[1]));
   }
  }
  assert.ok(Math.hypot(...foot.map((v,i)=>v-to[i]))<.07,e.id+' manual route reaches destination');
 }
});
test('glass showcases and outside edges stop sustained movement',()=>{
 for(const e of EXHIBITS){let foot=[...e.view];for(let i=0;i<400;i++)foot=moveFoot(foot,0,-.04);assert.ok(clearBody(foot));assert.ok(foot[2]>=e.z+e.d/2+.27,e.id);}
 let foot=[...ENTRY];for(let i=0;i<600;i++)foot=moveFoot(foot,0,.1);assert.ok(foot[2]<=17.73);assert.equal(foot[1],0);
});
test('step rise remains below 19 cm, physical eye height is 1.65 m',()=>{
 assert.equal(EYE,1.65);for(const s of STAIRS){assert.ok((s.high-s.low)/s.steps<=.19);assert.ok(s.high>s.low);}
});
test('portal below the bridge is a walkable volume with a solid back wall',()=>{
 let foot=[0,0,10];assert.ok(standAt(0,10,0));for(let i=0;i<150;i++)foot=moveFoot(foot,0,-.04);
 assert.ok(foot[2]<7.5&&foot[2]>2.2);assert.ok(clearBody(foot));assert.equal(foot[1],0);
 for(let i=0;i<200;i++)foot=moveFoot(foot,0,-.04);assert.ok(foot[2]>2.27);
});
test('aerial entry and return keep the body outside the architecture',()=>{
 const curve=new CatmullRomCurve3([OVERVIEW.position,[OVERVIEW.position[0],Math.max(25,OVERVIEW.position[1]),OVERVIEW.position[2]],[22,24,29],[3,10,24],[3,EYE,16]].map(a=>new Vector3(...a)),false,'centripetal');
 for(let i=0;i<=500;i++){const p=curve.getPointAt(i/500);assert.ok(clearBody([p.x,p.y-EYE,p.z]),'flight sample '+i);}
});
