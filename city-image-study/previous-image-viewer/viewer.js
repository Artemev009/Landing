(() => {
  "use strict";
  const viewer = document.querySelector("#viewer");
  const layer = document.querySelector("#image-layer");
  const image = layer.querySelector("img");
  const markerLayer = document.querySelector("#hotspots");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const stops = {
    tiles: {x:389,y:504,zoom:3.2,title:"Четыре плитки",hint:"Левая стеклянная витрина"},
    wave: {x:757,y:269,zoom:3.3,title:"Волна",hint:"Верхний павильон"},
    chart: {x:1135,y:354,zoom:3.5,title:"Диаграмма",hint:"Правая верхняя витрина"},
    layers: {x:627,y:728,zoom:3.2,title:"Три пластины",hint:"Передний павильон"},
    sphere: {x:1152,y:604,zoom:3.5,title:"Сфера",hint:"Правая нижняя витрина"}
  };
  const buttons = [...document.querySelectorAll("[data-stop]")];
  const markers = Object.entries(stops).map(([id,stop]) => {
    const button = document.createElement("button");
    button.className = "hotspot"; button.type = "button";
    button.setAttribute("aria-label","Рассмотреть: " + stop.title);
    const label = document.createElement("span"); label.textContent = stop.title;
    button.append(label); markerLayer.append(button);
    button.addEventListener("click",event => { event.stopPropagation(); select(id); });
    return {id,button,stop};
  });
  let state = {x:768,y:512,zoom:1}, selected = null, frame = 0;
  let width = 1, height = 1, base = 1;
  const pointers = new Map();
  let gesture = null, dragged = false;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function render() {
    const scale = base * state.zoom;
    const tx = width / 2 - state.x * scale, ty = height / 2 - state.y * scale;
    layer.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    markers.forEach(({button,stop,id}) => {
      button.style.left = (tx + stop.x * scale) + "px";
      button.style.top = (ty + stop.y * scale) + "px";
      button.classList.toggle("is-selected",selected === id);
    });
    document.querySelector("#zoom-value").textContent = state.zoom.toFixed(1).replace(".0","") + "×";
  }
  function bounds() {
    state.zoom = clamp(state.zoom,1,4);
    state.x = clamp(state.x,0,1536);
    state.y = clamp(state.y,0,1024);
  }
  function cancel() { cancelAnimationFrame(frame); frame = 0; }
  function fly(destination,duration=1250) {
    cancel();
    const from = {...state}, start = performance.now();
    function tick(now) {
      const t = reduce.matches ? 1 : clamp((now-start)/duration,0,1);
      const ease = t*t*t*(t*(t*6-15)+10);
      state.x = from.x + (destination.x-from.x)*ease;
      state.y = from.y + (destination.y-from.y)*ease;
      state.zoom = Math.exp(Math.log(from.zoom)+(Math.log(destination.zoom)-Math.log(from.zoom))*ease);
      render();
      if(t<1) frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  function labels(id) {
    selected=id;
    buttons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.stop===id)));
    document.querySelector("#view-label").textContent=id?stops[id].title:"Общий вид";
    document.querySelector("#caption-title").textContent=id?stops[id].title:"Каждая деталь — ближе";
    document.querySelector("#caption-kicker").textContent=id?stops[id].hint:"Начните с любой витрины";
  }
  function select(id) { labels(id); fly(stops[id]); }
  function reset() { labels(null); fly({x:768,y:512,zoom:1}); }
  buttons.forEach(button=>button.addEventListener("click",()=>select(button.dataset.stop)));
  document.querySelector("#reset").addEventListener("click",reset);
  function zoomBy(factor) { fly({...state,zoom:clamp(state.zoom*factor,1,4)},350); }
  document.querySelector("#zoom-in").addEventListener("click",()=>zoomBy(1.3));
  document.querySelector("#zoom-out").addEventListener("click",()=>zoomBy(1/1.3));
  function relative(event) { const r=viewer.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top}; }
  viewer.addEventListener("wheel",event=>{
    event.preventDefault();cancel();
    const p=relative(event), oldScale=base*state.zoom;
    const focalX=state.x+(p.x-width/2)/oldScale, focalY=state.y+(p.y-height/2)/oldScale;
    state.zoom=clamp(state.zoom*Math.exp(-event.deltaY*.0015),1,4);
    state.x=focalX-(p.x-width/2)/(base*state.zoom);
    state.y=focalY-(p.y-height/2)/(base*state.zoom);
    if(state.zoom===1){state.x=768;state.y=512;labels(null);}
    bounds();render();
  },{passive:false});
  viewer.addEventListener("pointerdown",event=>{
    if(event.target.closest("button"))return;
    cancel();viewer.focus({preventScroll:true});
    const p=relative(event);pointers.set(event.pointerId,p);
    viewer.setPointerCapture(event.pointerId);
    dragged=false;
    if(pointers.size===1)gesture={point:p,start:{...state}};
    if(pointers.size===2){
      const [a,b]=[...pointers.values()];
      gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),start:{...state}};
      dragged=true;
    }
  });
  viewer.addEventListener("pointermove",event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;
    const p=relative(event);pointers.set(event.pointerId,p);
    if(pointers.size===2 && gesture.distance){
      const [a,b]=[...pointers.values()];
      state.zoom=clamp(gesture.start.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance,1,4);
    } else if(gesture.point){
      const dx=p.x-gesture.point.x,dy=p.y-gesture.point.y;
      if(Math.hypot(dx,dy)>5)dragged=true;
      state.x=gesture.start.x-dx/(base*state.zoom);
      state.y=gesture.start.y-dy/(base*state.zoom);
    }
    bounds();render();
  });
  function release(event) {
    if(!pointers.has(event.pointerId))return;
    if(!dragged && event.type==="pointerup"){
      const p=relative(event), scale=base*state.zoom;
      const x=state.x+(p.x-width/2)/scale,y=state.y+(p.y-height/2)/scale;
      const near=Object.entries(stops).sort((a,b)=>Math.hypot(a[1].x-x,a[1].y-y)-Math.hypot(b[1].x-x,b[1].y-y))[0];
      if(Math.hypot(near[1].x-x,near[1].y-y)<115)select(near[0]);
    }
    pointers.delete(event.pointerId);gesture=null;
  }
  viewer.addEventListener("pointerup",release);viewer.addEventListener("pointercancel",release);
  viewer.addEventListener("keydown",event=>{
    if(event.target.closest("button"))return;
    if(event.key==="Escape"){event.preventDefault();reset();}
    if(event.key==="+"||event.key==="="){event.preventDefault();zoomBy(1.3);}
    if(event.key==="-"){event.preventDefault();zoomBy(1/1.3);}
    if(event.key==="ArrowRight"||event.key==="ArrowLeft"){
      event.preventDefault();const keys=Object.keys(stops),i=keys.indexOf(selected),dir=event.key==="ArrowRight"?1:-1;
      select(keys[(i+dir+keys.length)%keys.length]);
    }
  });
  new ResizeObserver(()=>{
    width=viewer.clientWidth;height=viewer.clientHeight;
    base=Math.min(width/1536,height/1024);
    render();
  }).observe(viewer);
  image.addEventListener("error",()=>{document.querySelector("#error").hidden=false;});
  labels(null);render();
})();
