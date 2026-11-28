import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EYE,ENTRY,OVERVIEW} from './config.js';
import {moveFoot} from './navigation.js';
const ease=t=>t*t*t*(t*(t*6-15)+10);
const vec=a=>new T.Vector3(...a);
const eyes=a=>new T.Vector3(a[0],a[1]+EYE,a[2]);
const clamp=T.MathUtils.clamp;
function lookQuaternion(position,target){return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(position,target,new T.Vector3(0,1,0)));}

export class CameraController{
 constructor(camera,canvas,navigation,onState){
  this.camera=camera;this.nav=navigation;this.onState=onState;this.mode='overview';this.phase='overview';this.foot=[...ENTRY];this.selected=null;this.queue=[];this.pending=null;this.yaw=0;this.pitch=0;
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.overviewPosition=vec(OVERVIEW.position);
  this.orbit=new OrbitControls(camera,canvas);this.orbit.target.fromArray(OVERVIEW.target);this.orbit.enablePan=false;this.orbit.minDistance=38;this.orbit.maxDistance=105;this.orbit.minPolarAngle=.35;this.orbit.maxPolarAngle=1.38;this.orbit.enableDamping=true;
  this.setOverview();
 }
 setOverview(){this.camera.position.copy(this.overviewPosition);this.camera.fov=OVERVIEW.fov;this.camera.lookAt(vec(OVERVIEW.target));this.camera.updateProjectionMatrix();this.orbit.target.fromArray(OVERVIEW.target);this.orbit.update();}
 resize(aspect){const target=vec(OVERVIEW.target);this.overviewPosition.copy(vec(OVERVIEW.position).sub(target).multiplyScalar(Math.max(1,1.05/aspect)).add(target));this.orbit.maxDistance=Math.max(105,this.overviewPosition.distanceTo(target)+20);if(this.mode==='overview')this.setOverview();}
 setReduced(value){this.reduced=value;if(value&&this.queue.length){const next=this.pending||(this.returning?'home':this.selected);this.queue=[];this.pending=null;this.returning=false;if(next==='home')this.home();else if(next)this.select(next);}}
 setState(mode,phase=mode){this.mode=mode;this.phase=phase;this.orbit.enabled=mode==='overview';this.onState?.(this);}
 select(exhibit){
  if(this.queue.length){
   if(this.queue[0].kind==='air'){this.pending=exhibit;return;}
   this.queue=[];this.returning=false;this.setState('firstPerson');
  }
  this.selected=exhibit;this.pending=null;
  if(this.reduced){this.foot=[...exhibit.view];this.camera.position.copy(eyes(this.foot));this.camera.fov=70;this.camera.lookAt(vec(exhibit.target));this.camera.updateProjectionMatrix();this.finish();return;}
  const wasOverview=this.mode==='overview';
  const route=this.nav.route(wasOverview?ENTRY:this.foot,exhibit.view);
  if(wasOverview){
   // Aerial descent stays in the empty foreground, outside all building volumes.
   const start=this.camera.position.clone(),gate=new T.Vector3(22,24,29),landing=eyes(ENTRY);
   const high=new T.Vector3(start.x,Math.max(start.y,25),start.z);
   this.queue.push({kind:'air',points:[start,high,gate,new T.Vector3(3,10,24),landing],duration:4.6,target:eyes(route[Math.min(1,route.length-1)]),phase:'descend',fromFov:this.camera.fov,toFov:70});
  }
  this.enqueueWalk(route,exhibit);
  this.setState('transitioning',wasOverview?'approach':'walk');
 }
 enqueueWalk(route,exhibit=null){
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i],distance=vec(a).distanceTo(vec(b));if(distance<.025)continue;
   this.queue.push({kind:'walk',a,b,duration:Math.max(.16,distance/3.2),phase:Math.abs(a[1]-b[1])>.2?'stairs':'walk'});
  }
  if(exhibit)this.queue.push({kind:'look',target:vec(exhibit.target),duration:1.05,phase:'arrive'});
 }
 home(){
  if(this.queue.length){
   if(this.queue[0].kind==='air'){this.pending='home';return;}
   this.queue=[];this.returning=false;this.setState('firstPerson');
  }
  this.pending=null;
  if(this.mode==='overview'){
   this.queue.push({kind:'air',points:[this.camera.position.clone(),this.overviewPosition.clone()],target:vec(OVERVIEW.target),fromFov:this.camera.fov,toFov:OVERVIEW.fov,duration:1.3,phase:'returning'});
  }else if(!this.reduced){
   this.enqueueWalk(this.nav.route(this.foot,ENTRY));
   this.queue.push({kind:'air',points:[eyes(ENTRY),new T.Vector3(3,10,24),new T.Vector3(22,24,29),this.overviewPosition.clone()],target:vec(OVERVIEW.target),fromFov:70,toFov:OVERVIEW.fov,duration:4,phase:'returning'});
  }
  if(this.reduced){this.queue=[];this.selected=null;this.setOverview();this.setState('overview');return;}
  this.returning=true;this.setState('returning','walk');
 }
 begin(segment){
  segment.elapsed=0;segment.q=this.camera.quaternion.clone();segment.startPos=this.camera.position.clone();
  if(segment.kind==='air'){segment.curve=new T.CatmullRomCurve3(segment.points,false,'centripetal');}
  if(segment.kind==='walk'){
   const a=eyes(segment.a),b=eyes(segment.b),target=b.clone().add(b.clone().sub(a).setY(0).normalize().multiplyScalar(2));target.y=b.y;
   segment.endQ=lookQuaternion(a,target);
  }
  if(segment.kind==='look')segment.endQ=lookQuaternion(this.camera.position,segment.target);
  this.phase=segment.phase;this.onState?.(this);
 }
 update(dt,input){
  if(this.queue.length){
   const s=this.queue[0];if(s.elapsed===undefined)this.begin(s);s.elapsed+=dt;const t=clamp(s.elapsed/s.duration,0,1),u=ease(t);
   if(s.kind==='air'){
    this.camera.position.copy(s.curve.getPointAt(u));
    this.camera.quaternion.slerpQuaternions(s.q,lookQuaternion(this.camera.position,s.target),u);
    this.camera.fov=T.MathUtils.lerp(s.fromFov,s.toFov,u);this.camera.updateProjectionMatrix();
   }else if(s.kind==='walk'){
    // Constant progress on each validated segment. Height follows the same ramp as manual walking.
    this.foot=s.a.map((a,i)=>a+(s.b[i]-a)*t);
    this.camera.position.copy(eyes(this.foot));
    this.camera.quaternion.slerpQuaternions(s.q,s.endQ,ease(Math.min(1,t*2.2)));
   }else this.camera.quaternion.slerpQuaternions(s.q,s.endQ,u);
   if(t>=1){this.queue.shift();
    // During an aerial approach defer new requests only until we reach the safe entry.
    if(s.kind==='air'&&!this.returning&&this.pending){
     const next=this.pending;this.pending=null;this.queue=[];this.foot=[...ENTRY];this.setState('firstPerson');
     if(next==='home')this.home();else this.select(next);return;
    }
    if(!this.queue.length){
    if(this.returning){this.returning=false;this.selected=null;this.setOverview();this.setState('overview');}
    else this.finish();
    const next=this.pending;this.pending=null;if(next==='home')this.home();else if(next)this.select(next);
   }}return;
  }
  if(this.mode==='overview'){this.orbit.update();return;}
  if(!input)return;
  const dir=input.motion(),speed=input.fast?4.2:2.3;
  if(Math.hypot(dir.x,dir.z)>.01){
   const length=Math.max(1,Math.hypot(dir.x,dir.z));
   const dx=(Math.cos(this.yaw)*dir.x+Math.sin(this.yaw)*dir.z)*speed*dt/length;
   const dz=(-Math.sin(this.yaw)*dir.x+Math.cos(this.yaw)*dir.z)*speed*dt/length;
   this.foot=moveFoot(this.foot,dx,dz);
  }
  this.camera.position.x=this.foot[0];this.camera.position.z=this.foot[2];
  this.camera.position.y=T.MathUtils.lerp(this.camera.position.y,this.foot[1]+EYE,1-Math.exp(-dt*18));
  this.camera.quaternion.setFromEuler(new T.Euler(this.pitch,this.yaw,0,'YXZ'));
 }
 finish(){this.syncAngles();this.setState('firstPerson','inspect');}
 syncAngles(){const e=new T.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.yaw=e.y;this.pitch=e.x;}
 look(dx,dy){if(this.mode!=='firstPerson')return;this.yaw-=dx*.003;this.pitch=clamp(this.pitch-dy*.003,-1.35,1.35);}
 dispose(){this.orbit.dispose();}
}
