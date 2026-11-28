import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createWorld} from './world.js';
import {NavigationSystem,standAt} from './navigation.js';
import {CameraController} from './camera.js';
import {InputManager} from './input.js';
import {EXHIBITS,OVERVIEW} from './config.js';
import {frameDelta} from './time.js';
const $=s=>document.querySelector(s),canvas=$('#world'),viewer=$('#viewer');
function showError(error){$('#loading').hidden=true;$('#error').hidden=false;$('#error').textContent=error.message;console.error(error);}
try{
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 renderer.info.autoReset=false;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(OVERVIEW.fov,1,.08,250);
 const world=createWorld(scene,renderer),nav=new NavigationSystem();
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
 const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new T.Vector2(800,600),.24,.45,1.3);composer.addPass(bloom);composer.addPass(new OutputPass());
 const phaseNames={overview:'Общий вид',approach:'Входим в город',descend:'Спускаемся в город',walk:'Прогулка',stairs:'Лестница',arrive:'Осмотр витрины',inspect:'Внутри города',returning:'Возвращаемся к общему виду'};
 function ui(c){
  $('#view-label').textContent=phaseNames[c.phase]||'Прогулка';viewer.dataset.mode=c.mode;
  const inside=c.mode==='firstPerson';$('#mouse-lock').hidden=!inside;$('#walk-controls').hidden=!inside;$('#overview-controls').hidden=c.mode!=='overview';
  $('#caption-title').textContent=c.selected?.title||'Пространство для исследования';
  $('#caption-kicker').textContent=c.selected?.subtitle||'Выберите витрину, чтобы войти в цифровой город';
  $('#hint').textContent=inside?(matchMedia('(max-width:800px)').matches?'Вверх и вниз — ходьба · влево и вправо — поворот · перетаскивание — обзор':'WASD — ходьба · стрелки влево и вправо — поворот · перетаскивание — обзор'):c.mode==='overview'?'Перетаскивание — поворот города · колесо — расстояние':'Камера следует по безопасному маршруту. После прибытия можно идти самостоятельно.';
  for(const b of document.querySelectorAll('[data-stop]'))b.setAttribute('aria-pressed',String(b.dataset.stop===c.selected?.id));
  if(!inside&&document.pointerLockElement)document.exitPointerLock();
 }
 const controller=new CameraController(camera,canvas,nav,ui);ui(controller);
 const select=id=>{try{controller.select(EXHIBITS.find(e=>e.id===id));}catch(e){showError(e);}};
 const ray=new T.Raycaster(),pointer=new T.Vector2();
 const input=new InputManager(canvas,controller,e=>{
  const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects(world.pickables,false)[0];if(hit)select(hit.object.userData.exhibit);
 });
 for(const b of document.querySelectorAll('[data-stop]'))b.addEventListener('click',()=>select(b.dataset.stop));
 $('#reset').addEventListener('click',()=>{try{controller.home();}catch(e){showError(e);}});
 for(const [id,factor] of [['zoom-in',.88],['zoom-out',1.13]])$('#'+id).addEventListener('click',()=>{if(controller.mode==='overview'){const delta=camera.position.clone().sub(controller.orbit.target);delta.multiplyScalar(factor).clampLength(38,controller.orbit.maxDistance);camera.position.copy(controller.orbit.target).add(delta);}});
 $('#reduce').checked=controller.reduced;$('#reduce').addEventListener('change',e=>controller.setReduced(e.target.checked));
 const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');motionPreference.addEventListener('change',e=>{controller.setReduced(e.matches);$('#reduce').checked=e.matches;});
 let low=false,quality='auto',visible=true,stopped=false,frame=0,slowFrames=0,avgFrame=16,frameCount=0,last=performance.now(),elapsed=0;
 const resize=()=>{const w=viewer.clientWidth,h=viewer.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();controller.resize(camera.aspect);ui(controller);};
 function setQuality(value){low=value==='low';renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=!low;renderer.shadowMap.needsUpdate=true;bloom.enabled=!low;resize();}
 $('#quality').addEventListener('change',e=>{quality=e.target.value;setQuality(quality==='low'?'low':'high');slowFrames=0;});
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(viewer);resize();
 const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)last=performance.now();});visibilityObserver.observe(viewer);
 document.addEventListener('visibilitychange',()=>{last=performance.now();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stopped=true;showError(new Error('Графический контекст потерян. Обновите страницу для восстановления города.'));});
 function tick(now){
  if(stopped)return;frame=requestAnimationFrame(tick);const raw=now-last;last=now;if(document.hidden||!visible)return;
  const dt=frameDelta(raw);elapsed+=dt;controller.update(dt,input);world.update(elapsed,controller.reduced);
  renderer.info.reset();if(low)renderer.render(scene,camera);else composer.render();
  if(frameCount===1){renderer.shadowMap.autoUpdate=false;$('#loading').hidden=true;}
  frameCount++;avgFrame=avgFrame*.97+raw*.03;
  if(quality==='auto'&&!low&&frameCount>180){slowFrames=avgFrame>34?slowFrames+1:Math.max(0,slowFrames-2);if(slowFrames>180)setQuality('low');}
  if(frameCount%15===0){
   const telemetry={mode:controller.mode,phase:controller.phase,selected:controller.selected?.id||null,position:camera.position.toArray(),foot:controller.foot,eyeHeight:camera.position.y-controller.foot[1],fov:camera.fov,walkable:!!standAt(controller.foot[0],controller.foot[2],controller.foot[1]),fps:Math.round(1000/avgFrame),quality:low?'low':'high',drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,navNodes:nav.nodes.length,queue:controller.queue.length};
   $('#telemetry').textContent=JSON.stringify(telemetry);
  }
 }
 frame=requestAnimationFrame(tick);
 window.addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(frame);resizeObserver.disconnect();visibilityObserver.disconnect();input.dispose();controller.dispose();world.dispose();composer.dispose();renderer.dispose();},{once:true});
}catch(error){showError(new Error('Не удалось создать 3D-мир. Нужен браузер с WebGL 2. '+error.message));}
