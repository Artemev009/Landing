import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EXHIBITS,DECKS,STAIRS,PLANTERS,RAILS,PORTAL} from './config.js';
import {loopPhase} from './time.js';

export function createWorld(scene,renderer){
 const batches=new Map(),animated=[],pickables=[],resources=[];
 const std=(color,metalness=.5,roughness=.35)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const m={metal:std('#211b2c',.68,.32),edge:std('#4b3b60',.7,.26),dark:std('#090a10',.55,.34),floor:std('#302939',.45,.4),
  warm:std('#b8ada0',.15,.38),white:new T.MeshPhysicalMaterial({color:'#fff2de',metalness:.04,roughness:.38,clearcoat:.15,envMapIntensity:.35,emissive:'#f2d7a5',emissiveIntensity:.06}),
  lime:new T.MeshBasicMaterial({color:new T.Color('#baff00').multiplyScalar(1.25)}),
  violet:new T.MeshStandardMaterial({color:'#9a63ef',emissive:'#a254ff',emissiveIntensity:1.3}),
  lamp:new T.MeshBasicMaterial({color:new T.Color('#fff0d6').multiplyScalar(1.2)}),
  glass:new T.MeshPhysicalMaterial({color:'#c8c3d3',metalness:.08,roughness:.08,envMapIntensity:.25,transparent:true,opacity:.055,side:T.DoubleSide,depthWrite:false}),
  rail:new T.MeshPhysicalMaterial({color:'#b7c0a0',metalness:.15,roughness:.14,envMapIntensity:.3,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false})};
 const variants=[m.floor,...['#352d40','#292331','#3a3046'].map(c=>std(c,.48,.42))];
 // A shared subtle microfinish stops close views reading as perfectly smooth plastic.
 const grain=new Uint8Array(128*128*4);let grainSeed=19;
 for(let i=0;i<grain.length;i+=4){grainSeed=(grainSeed*1664525+1013904223)>>>0;const v=150+(grainSeed%80);grain[i]=grain[i+1]=grain[i+2]=v;grain[i+3]=255;}
 const finish=new T.DataTexture(grain,128,128);finish.wrapS=finish.wrapT=T.RepeatWrapping;finish.repeat.set(12,12);finish.needsUpdate=true;
 for(const mat of [m.metal,m.edge,...variants]){mat.bumpMap=finish;mat.bumpScale=.012;}
 const matrix=new T.Matrix4(),quat=new T.Quaternion(),scale=new T.Vector3(1,1,1);
 const boxCache=new Map();
 function geo(w,h,d,r=.035){const key=[w,h,d,r].join();if(!boxCache.has(key))boxCache.set(key,r<.02?new T.BoxGeometry(w,h,d):new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)));return boxCache.get(key);}
 function add(g,mat,x,y,z,rotation=null){
  const clone=g.index?g.toNonIndexed():g.clone();quat.identity();if(rotation)quat.setFromEuler(new T.Euler(...rotation));matrix.compose(new T.Vector3(x,y,z),quat,scale);clone.applyMatrix4(matrix);
  if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(clone);
 }
 const box=(w,h,d,x,y,z,mat=m.metal,r=.035)=>add(geo(w,h,d,r),mat,x,y,z);
 function floorTiles(x1,x2,z1,z2,y){
  const nx=Math.ceil((x2-x1)/1.7),nz=Math.ceil((z2-z1)/1.7),w=(x2-x1)/nx,d=(z2-z1)/nz;
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)box(w-.022,.045,d-.022,x1+(i+.5)*w,y-.015,z1+(j+.5)*d,variants[(i*7+j*11)%4],.009);
 }
 function strip(a,b,mat,r=.025){const av=new T.Vector3(...a),bv=new T.Vector3(...b);add(new T.CylinderGeometry(r,r,av.distanceTo(bv),6),mat,...av.clone().add(bv).multiplyScalar(.5).toArray(),new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize())).toArray().slice(0,3));}
 function rail(a,b,y){
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=Math.atan2(b[0]-a[0],b[1]-a[1]);
  add(new T.BoxGeometry(.025,1.05,length),m.rail,(a[0]+b[0])/2,y+.57,(a[1]+b[1])/2,[0,angle,0]);
  strip([a[0],y+1.1,a[1]],[b[0],y+1.1,b[1]],m.edge,.024);
  for(const p of [a,b])strip([p[0],y+.02,p[1]],[p[0],y+1.1,p[1]],m.edge,.022);
 }
 // A single shared environment gives the metal and glass coherent reflections.
 const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),envRT=pmrem.fromScene(env,.03);
 scene.environment=envRT.texture;scene.environmentIntensity=.32;env.dispose();pmrem.dispose();resources.push(envRT);
 scene.background=new T.Color('#090810');scene.fog=new T.FogExp2('#090810',.008);
 scene.add(new T.HemisphereLight('#b6a4e8','#20162e',.4));
 const key=new T.DirectionalLight('#fff0db',2);key.position.set(-20,35,22);key.castShadow=true;
 key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:100});key.shadow.bias=-.00015;key.shadow.normalBias=.045;scene.add(key);
 const rim=new T.DirectionalLight('#a77acb',1.4);rim.position.set(-18,15,-20);scene.add(rim);
 const fill=new T.DirectionalLight('#c6d2ff',.6);fill.position.set(25,16,12);scene.add(fill);
 const ground=new T.Mesh(new T.PlaneGeometry(2000,2000),std('#09080e',.35,.5));ground.rotation.x=-Math.PI/2;ground.position.y=-1.44;ground.receiveShadow=true;scene.add(ground);
 for(const d of DECKS){
  if(d.id==='middle'){
   const p=PORTAL;
   box(p.x1-d.x1,d.thickness,d.z2-d.z1,(d.x1+p.x1)/2,d.y/2,(d.z1+d.z2)/2,m.metal,.05);
   box(d.x2-p.x2,d.thickness,d.z2-d.z1,(p.x2+d.x2)/2,d.y/2,(d.z1+d.z2)/2,m.metal,.05);
   box(p.x2-p.x1,d.thickness,p.z1-d.z1,(p.x1+p.x2)/2,d.y/2,(p.z1+d.z1)/2,m.metal,.05);
   box(p.x2-p.x1,d.y-p.ceiling,d.z2-p.z1,(p.x1+p.x2)/2,(d.y+p.ceiling)/2,(p.z1+d.z2)/2,m.metal,.06);
   box(.06,.05,5.1,p.x1+.15,p.ceiling-.07,4.8,m.violet,.01);
   box(.06,.05,5.1,p.x2-.15,p.ceiling-.07,4.8,m.violet,.01);
   const portalLight=new T.PointLight('#9c62ff',9,6,2);portalLight.position.set(1,1.7,3.5);scene.add(portalLight);
  }else box(d.x2-d.x1,d.thickness,d.z2-d.z1,(d.x1+d.x2)/2,d.y-d.thickness/2,(d.z1+d.z2)/2,m.metal,.05);
  floorTiles(d.x1,d.x2,d.z1,d.z2,d.y);
  // Seams divide the mass into architectural panels rather than featureless boxes.
  for(let x=d.x1+2;x<d.x2;x+=2)box(.018,d.thickness,.025,x,d.y-d.thickness/2,d.z2+.01,m.dark,.004);
 }
 for(const s of STAIRS){
  const along=s.axis==='x',run=(along?s.x2-s.x1:s.z2-s.z1),step=run/s.steps;
  for(let i=0;i<s.steps;i++){
   const rise=(i+1)*(s.high-s.low)/s.steps,t=(i+.5)/s.steps,u=s.reverse?1-t:t;
   const x=along?s.x1+u*run:(s.x1+s.x2)/2,z=along?(s.z1+s.z2)/2:s.z1+u*run;
   box(along?step+.005:s.x2-s.x1,rise,along?s.z2-s.z1:step+.005,x,s.low+rise/2,z,m.metal,.018);
   box(along?step-.02:s.x2-s.x1-.05,.035,along?s.z2-s.z1-.05:step-.02,x,s.low+rise+.018,z,m.floor,.01);
   if(i%3===0)box(along?.018:s.x2-s.x1-.12,.023,along?s.z2-s.z1-.12:.018,x,s.low+rise-.05,z,m.violet,.004);
  }
 }
 // Tall central plinth and vertical heat-sink fins are key to the reference silhouette.
 box(8.5,11.2,7,-3,5.6,-6,m.metal,.06);
 for(let i=0;i<9;i++)box(.12,16.8,1.15,-7.65-i*.24,8.4,-6.5,m.edge,.018);
 for(let i=0;i<5;i++)box(.034,15.8,.05,-7.72-i*.48,8.5,-5.91,m.violet,.008);
 for(let y=3.2;y<11;y+=2.6)box(8.5,.025,.02,-3,y,-2.488,m.dark,.004);
 // Stepped roof volumes sit on the chart roof, outside the glazed room.
 box(4,1.1,2,8.2,13.25,-8,m.metal);box(3,.8,1.3,8.2,14.2,-8,m.edge);

 for(const e of EXHIBITS){
  const {x,z,floor:y,w,d,h}=e;
  box(w,.38,d,x,y+.19,z,m.edge);
  box(w-.3,.065,d-.3,x,y+.41,z,m.warm);
  box(w,h*.16,d,x,y+h-h*.08,z,m.metal,.05);
  box(w+.04,.055,d+.04,x,y+h+.02,z,m.edge,.015);
  box(w-.2,h-.5,.2,x,y+h/2,z-d/2+.1,m.dark);
  box(w-.5,h-.9,.035,x,y+h/2,z-d/2+.22,m.floor);
  for(const side of [-1,1]){
   box(.13,h-.45,.13,x+side*(w/2-.14),y+h/2,z+d/2-.12,m.edge,.012);
   box(.18,h-.45,.18,x+side*(w/2-.14),y+h/2,z-d/2+.12,m.edge,.012);
   box(.025,h-.75,d-.4,x+side*(w/2-.15),y+h/2,z,m.glass,.005);
   box(.06,h-.95,.06,x+side*(w/2-.36),y+h/2,z-d/2+.4,m.lamp,.01);
  }
  box(w-.3,h-.78,.024,x,y+h/2,z+d/2-.13,m.glass,.005);
  box(w-.7,.06,.10,x,y+.5,z+d/2-.33,m.lamp,.01);
  box(w-.7,.06,.10,x,y+h-.6,z-d/2+.4,m.lamp,.01);
  // Slender front glass mullion and engraved exhibit plaque.
  box(.035,h-.7,.04,x+w*.17,y+h/2,z+d/2-.11,m.edge,.005);
  box(1.3,.25,.04,x-w*.28,y+.22,z+d/2+.025,m.dark,.015);
  for(let k=0;k<4;k++)box(.14,.018,.01,x-w*.28-.37+k*.23,y+.22,z+d/2+.05,k===0?m.lime:m.edge,.004);
  const light=new T.SpotLight('#ffdfbb',42,12,1.05,.55,2);light.position.set(x,y+h-.7,z);light.target.position.set(x,y+.5,z);scene.add(light,light.target);
  const g=new T.Group();g.position.set(x,y+.55,z);scene.add(g);
  const plinth=new T.Mesh(geo(e.id==='wave'?2.8:2.6,.38,2.4),m.warm);plinth.position.y=.2;plinth.castShadow=true;plinth.receiveShadow=true;g.add(plinth);
  const object=new T.Group();g.add(object);
  const part=(geometry,px,py,pz)=>{const mesh=new T.Mesh(geometry,m.white);mesh.position.set(px,py,pz);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.exhibit=e.id;object.add(mesh);pickables.push(mesh);return mesh;};
  if(e.id==='tiles'){
   for(let i=0;i<2;i++)for(let j=0;j<2;j++)part(geo(1.27,1.27,.25,.12),(i-.5)*1.42,1.5+j*1.42,0);
   box(.12,1.4,.2,x,y+1,z,m.edge);
  }else if(e.id==='sphere'){
   part(new T.SphereGeometry(1.05,48,32),0,1.53,0);
  }else if(e.id==='chart'){
   plinth.scale.set(1.65,.7,.7);
   for(let i=0;i<4;i++){const height=.8+i*.85;part(geo(.67,height,.85,.035),(i-1.5)*1.02,.4+height/2,0);}
  }else if(e.id==='layers'){
   for(let i=0;i<3;i++){const p=part(geo(2.65,.13,2.35,.045),0,1+i*.8,0);p.rotation.y=.12;}
  }else{
   const n=36,verts=[],indices=[];
   for(let side=0;side<2;side++)for(let iz=0;iz<=n;iz++)for(let ix=0;ix<=n;ix++){
    const u=ix/n*2-1,v=iz/n*2-1;
    verts.push(u*2.2,2+.55*Math.sin(u*2.5+v*2)+.25*(u*u-v*v)+(side?-.065:0),v*1.45);
   }
   const count=(n+1)*(n+1);
   for(let side=0;side<2;side++)for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
    const a=side*count+iz*(n+1)+ix,b=a+1,c=a+n+1,d=c+1;
    indices.push(...(side?[a,b,c,b,d,c]:[a,c,b,b,c,d]));
   }
   const edge=[];for(let i=0;i<=n;i++)edge.push(i);for(let i=1;i<=n;i++)edge.push(i*(n+1)+n);for(let i=n-1;i>=0;i--)edge.push(n*(n+1)+i);for(let i=n-1;i>0;i--)edge.push(i*(n+1));
   for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,b,a+count,b,b+count,a+count);}
   const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(verts,3));geom.setIndex(indices);geom.computeVertexNormals();part(geom,0,0,0);
   box(.08,1.5,.08,x,y+1.4,z,m.edge);
  }
  animated.push({id:e.id,object});
  // A proxy covers the entire showcase for easy raycast selection.
  const proxy=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({visible:false}));proxy.position.set(x,y+h/2,z);proxy.userData.exhibit=e.id;scene.add(proxy);pickables.push(proxy);
 }
 // Roof inset with the same luminous square as the reference.
 box(6.4,.06,5.1,-3,18.26,-6,m.dark);
 for(const z of [-8.55,-3.45])box(6.45,.055,.06,-3,18.31,z,m.lime,.015);
 for(const x of [-6.2,.2])box(.06,.055,5.1,x,18.31,-6,m.lime,.015);
 // Ribs and vents supply useful detail at both overview and human scale.
 for(const e of EXHIBITS.filter(e=>e.id==='tiles'||e.id==='layers'))for(let i=0;i<8;i++){
  box(.11,e.h,.8,e.x-e.w/2-.22-i*.19,e.floor+e.h/2,e.z+.7,m.edge,.018);
  if(i%2===0)box(.035,e.h-.3,.03,e.x-e.w/2-.22-i*.19,e.floor+e.h/2,e.z+1.12,m.violet,.006);
 }
 for(let row=0;row<7;row++)for(let col=0;col<5;col++){
  const g=new T.CylinderGeometry(.085,.085,.025,10);g.rotateZ(Math.PI/2);add(g,m.dark,15.27,4+row*.46,4.5+col*.5);
 }
 for(const r of RAILS)rail(r.a,r.b,r.y);
 let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const leafMat=std('#648c18',.02,.9),leafGeo=new T.IcosahedronGeometry(1,1),foliage=new T.InstancedMesh(leafGeo,leafMat,1050);let leafCount=0;const dummy=new T.Object3D();
 for(const p of PLANTERS){
  box(p.w,1.05,p.d,p.x,p.y+.525,p.z,m.metal,.05);box(p.w-.22,.05,p.d-.22,p.x,p.y+1.07,p.z,m.dark);
  for(let bush=0;bush<7;bush++){
   const bx=p.x+(random()-.5)*(p.w-1),bz=p.z+(random()-.5)*(p.d-.7),by=p.y+1.15,rad=.4+random()*.28;
   for(let i=0;i<50;i++){
    const u=random()*Math.PI*2,v=Math.acos(2*random()-1),rr=rad*Math.cbrt(random());
    dummy.position.set(bx+Math.sin(v)*Math.cos(u)*rr,by+.3+Math.abs(Math.cos(v))*rr,bz+Math.sin(v)*Math.sin(u)*rr);
    dummy.scale.setScalar(.07+random()*.12);dummy.rotation.set(random()*3,random()*3,random()*3);dummy.updateMatrix();foliage.setMatrixAt(leafCount,dummy.matrix);foliage.setColorAt(leafCount,new T.Color().setHSL(.18+random()*.055,.65,.16+random()*.17));leafCount++;
   }
  }
 }foliage.count=leafCount;foliage.castShadow=true;foliage.receiveShadow=true;scene.add(foliage);
 const riverPoints=[[-8,7.25,-6],[-8,7.25,-2],[-7.9,6.8,-1],[-7.9,3.8,1],[-6.5,3.27,2],[-2,3.27,3],[1,3.27,3],[3.5,3.27,2.8],[7.9,3.27,3],[8,3.27,7],[7.7,3.05,8.2],[6.8,.25,9.3],[5.5,.08,10.1],[.5,.08,11.4],[.4,.08,13.6],[1.7,.08,16.5],[1.7,-.5,17.8]];
 const curve=new T.CatmullRomCurve3(riverPoints.map(p=>new T.Vector3(...p)),false,'centripetal');
 const rv=[],ri=[],uv=[];for(let i=0;i<=320;i++){
  const p=curve.getPoint(i/320),t=curve.getTangent(i/320),side=new T.Vector3(t.z,0,-t.x).normalize().multiplyScalar(.48);
  for(const sign of [-1,1]){rv.push(p.x+side.x*sign,p.y+.04,p.z+side.z*sign);uv.push((sign+1)/2,i/20);}
  if(i<320){const a=i*2;ri.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const riverGeo=new T.BufferGeometry();riverGeo.setAttribute('position',new T.Float32BufferAttribute(rv,3));riverGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));riverGeo.setIndex(ri);riverGeo.computeVertexNormals();
 const riverMat=m.lime.clone();riverMat.side=T.DoubleSide;const river=new T.Mesh(riverGeo,riverMat);scene.add(river);
 const pulses=new T.InstancedMesh(new T.SphereGeometry(.065,8,6),m.lamp,16);scene.add(pulses);
 for(const p of [[-7,4.2,2],[7,4,8],[1,.8,15]]){const l=new T.PointLight('#c9ff19',17,6,2);l.position.set(...p);scene.add(l);}
 for(const p of [[-15,2,7],[-5,1,10],[5,2,-4]]){const l=new T.PointLight('#9639ff',50,10,2);l.position.set(...p);scene.add(l);}
 const ring=new T.Mesh(new T.TorusGeometry(26,.025,5,200),new T.MeshBasicMaterial({color:'#7c51a7'}));ring.rotation.x=Math.PI/2;ring.position.y=-1.38;scene.add(ring);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+.45;add(new T.SphereGeometry(.18,12,8),m.lime,Math.cos(a)*26,-1.3,Math.sin(a)*26);}
 for(const [mat,geometries] of batches){const merged=mergeGeometries(geometries);const mesh=new T.Mesh(merged,mat);mesh.castShadow=!mat.transparent&&mat!==m.lamp&&mat!==m.lime&&mat!==m.violet;mesh.receiveShadow=!mat.transparent;scene.add(mesh);for(const g of geometries)g.dispose();}
 for(const g of boxCache.values())g.dispose();
 const mannequin=new T.Group();const body=new T.Mesh(new T.CapsuleGeometry(.19,.85,4,12),std('#ff784b',.1,.5));body.position.y=.9;mannequin.add(body);const head=new T.Mesh(new T.SphereGeometry(.13,16,12),body.material);head.position.y=1.57;mannequin.add(head);mannequin.position.set(3,0,16);mannequin.visible=new URLSearchParams(location.search).has('debug');scene.add(mannequin);
 return {pickables,mannequin,key,update(time,reduced){
  for(const a of animated){if(a.id==='wave')a.object.rotation.y=reduced?0:Math.sin(time*.24)*.07;}
  for(let i=0;i<16;i++){const t=reduced?i/16:loopPhase(time*.027+i/16),p=curve.getPoint(t);dummy.position.copy(p);dummy.position.y+=.09;dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();pulses.setMatrixAt(i,dummy.matrix);}pulses.instanceMatrix.needsUpdate=true;
 },dispose(){for(const r of resources)r.dispose();}};
}
