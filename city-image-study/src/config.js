// Metres. Y is up; the display fronts face +Z.
export const EYE = 1.65;
export const RADIUS = .28;
export const OVERVIEW = {position:[36,29,44], target:[0,4.4,1], fov:37};
export const EXHIBITS = [
 {id:'tiles',title:'Четыре плитки',subtitle:'Модульная система',x:-12,z:0,floor:3.2,w:7.6,d:6.4,h:6.6,view:[-12,3.2,5.4],target:[-12,6.1,0]},
 {id:'wave',title:'Волна',subtitle:'Пластика вычислений',x:-3,z:-6,floor:11.2,w:8.5,d:7,h:7,view:[-3,11.2,-.2],target:[-3,14,-6]},
 {id:'chart',title:'Диаграмма',subtitle:'Данные в объёме',x:10,z:-6,floor:7.2,w:8,d:6.8,h:5.5,view:[10,7.2,-.8],target:[10,9.4,-6]},
 {id:'layers',title:'Три пластины',subtitle:'Архитектура слоёв',x:-7,z:11,floor:0,w:8,d:6.4,h:6.4,view:[-7,0,16],target:[-7,2.8,11]},
 {id:'sphere',title:'Сфера',subtitle:'Точка равновесия',x:12,z:6,floor:3.2,w:6.5,d:5.8,h:5.4,view:[12,3.2,11],target:[12,5.7,6]}
];
export const ENTRY = [3,0,16];
export const PORTAL = {x1:-2,x2:4.3,z1:2,z2:7.6,ceiling:2.7};
// Navigation and rendered architecture share these dimensions.
export const DECKS = [
 {id:'foundation',x1:-18,x2:18,z1:-14,z2:18,y:0,thickness:1.4},
 {id:'middle',x1:-17,x2:17,z1:-10,z2:7.5,y:3.2,thickness:3.2},
 {id:'chart-stair-landing',x1:4.5,x2:8,z1:7.5,z2:8.5,y:3.2,thickness:3.2},
 {id:'sphere-terrace',x1:8,x2:17,z1:7.5,z2:12,y:3.2,thickness:3.2},
 {id:'sphere-landing',x1:11.3,x2:17,z1:12,z2:15.6,y:3.2,thickness:3.2},
 {id:'upper',x1:2,x2:17,z1:-11,z2:-.2,y:7.2,thickness:4},
 {id:'wave-balcony',x1:-7.5,x2:-2,z1:-2.5,z2:1.2,y:11.2,thickness:.6}
];
export const STAIRS = [
 {id:'central',x1:1.5,x2:4.5,z1:7.5,z2:14.3,low:0,high:3.2,axis:'z',reverse:true,steps:18},
 {id:'sphere',x1:4.5,x2:11.3,z1:13,z2:15.6,low:0,high:3.2,axis:'x',reverse:false,steps:18},
 {id:'chart',x1:4.5,x2:7.5,z1:-.2,z2:7.5,low:3.2,high:7.2,axis:'z',reverse:true,steps:23},
 {id:'wave',x1:-2,x2:6,z1:-1.8,z2:.8,low:7.2,high:11.2,axis:'x',reverse:true,steps:23}
];
export const OBSTACLES = EXHIBITS.map(e=>({id:e.id,x1:e.x-e.w/2,x2:e.x+e.w/2,z1:e.z-e.d/2,z2:e.z+e.d/2,y1:e.id==='wave'?0:e.floor,y2:e.floor+e.h}));
// Planters are solid too, including their parapets.
export const PLANTERS = [
 {x:-13,z:-6,y:3.2,w:3.2,d:3.1}, {x:15,z:-10,y:7.2,w:3.1,d:2}, {x:0,z:15.6,y:0,w:2.8,d:2.6}
];
for(const p of PLANTERS) OBSTACLES.push({id:'planter',x1:p.x-p.w/2,x2:p.x+p.w/2,z1:p.z-p.d/2,z2:p.z+p.d/2,y1:p.y,y2:p.y+1.6});
export const RAILS = [
 {a:[-7.4,1.1],b:[-2.1,1.1],y:11.2},{a:[-7.4,-2.4],b:[-7.4,1.1],y:11.2},
 {a:[-7,7.35],b:[1.3,7.35],y:3.2},{a:[8.2,11.9],b:[11.1,11.9],y:3.2},
 {a:[16.8,9],b:[16.8,15.4],y:3.2},{a:[14.5,-.32],b:[16.8,-.32],y:7.2}
];
for(const r of RAILS) OBSTACLES.push({id:'rail',x1:Math.min(r.a[0],r.b[0])-.025,x2:Math.max(r.a[0],r.b[0])+.025,z1:Math.min(r.a[1],r.b[1])-.025,z2:Math.max(r.a[1],r.b[1])+.025,y1:r.y,y2:r.y+1.12});
