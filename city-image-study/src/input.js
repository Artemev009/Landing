export class InputManager{
 constructor(canvas,controller,onPick){
  this.keys=new Set();this.buttons=new Set();this.fast=false;this.abort=new AbortController();const opts={signal:this.abort.signal};let drag=null;
  const clear=()=>{this.keys.clear();this.buttons.clear();this.fast=false;drag=null;};
  const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  window.addEventListener('keydown',e=>{
   if(controller.mode!=='firstPerson'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
   if(movement.has(e.code)){e.preventDefault();this.keys.add(e.code);}this.fast=e.shiftKey;
  },opts);
  window.addEventListener('keyup',e=>{this.keys.delete(e.code);this.fast=e.shiftKey;},opts);
  window.addEventListener('blur',clear,opts);document.addEventListener('visibilitychange',clear,opts);
  canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);},opts);
  canvas.addEventListener('pointermove',e=>{
   if(document.pointerLockElement===canvas){controller.look(e.movementX,e.movementY);return;}
   if(!drag||drag.id!==e.pointerId)return;
   if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;
   controller.look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;
  },opts);
  canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved&&controller.mode==='overview')onPick(e);drag=null;},opts);
  canvas.addEventListener('pointercancel',clear,opts);
  document.querySelector('#mouse-lock').addEventListener('click',async()=>{
   if(controller.mode!=='firstPerson')return;
   try{await canvas.requestPointerLock();}catch{document.querySelector('#hint').textContent='Зажмите мышь и перетаскивайте для обзора. WASD — ходьба.';}
  },opts);
  document.addEventListener('pointerlockchange',()=>{document.querySelector('#mouse-lock').textContent=document.pointerLockElement?'Esc — освободить курсор':'Обзор мышью';},opts);
  for(const button of document.querySelectorAll('[data-move]')){
   button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.buttons.add(button.dataset.move);},opts);
   for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>this.buttons.delete(button.dataset.move),opts);
  }
 }
 motion(){const has=(key,arrow,button)=>this.keys.has(key)||this.keys.has(arrow)||this.buttons.has(button);return {x:Number(has('KeyD','ArrowRight','right'))-Number(has('KeyA','ArrowLeft','left')),z:Number(has('KeyS','ArrowDown','back'))-Number(has('KeyW','ArrowUp','forward'))};}
 dispose(){this.abort.abort();}
}
