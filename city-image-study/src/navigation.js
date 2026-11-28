import {DECKS,STAIRS,OBSTACLES,EYE,RADIUS,PORTAL} from './config.js';
const inside=(p,r,pad=0)=>p[0]>=r.x1-pad&&p[0]<=r.x2+pad&&p[2]>=r.z1-pad&&p[2]<=r.z2+pad;
export function stairHeight(s,x,z){
 const t=s.axis==='x'?(x-s.x1)/(s.x2-s.x1):(z-s.z1)/(s.z2-s.z1);
 return s.low+(s.high-s.low)*(s.reverse?1-t:t);
}
export function heightsAt(x,z){
 const p=[x,0,z], out=[];
 for(const d of DECKS) if(inside(p,d)) out.push(d.y);
 for(const s of STAIRS) if(inside(p,s)) out.push(stairHeight(s,x,z));
 return [...new Set(out)].sort((a,b)=>a-b);
}
export function clearBody(p,r=RADIUS){
 for(const o of OBSTACLES) if(inside(p,o,r)&&p[1]<o.y2-.05&&p[1]+EYE>o.y1+.05)return false;
 for(const d of DECKS) if(inside(p,d,-.025)&&p[1]<d.y-.12&&p[1]+EYE>d.y-d.thickness+.05){
  const inPortal=d.id==='middle'&&p[0]>PORTAL.x1+r&&p[0]<PORTAL.x2-r&&p[2]>PORTAL.z1+r&&p[2]<PORTAL.z2&&p[1]+EYE<PORTAL.ceiling-.08;
  if(!inPortal)return false;
 }
 for(const s of STAIRS) if(inside(p,s,-.025)&&p[1]<stairHeight(s,p[0],p[2])-.24&&p[1]+EYE>s.low)return false;
 return true;
}
export function standAt(x,z,nearY,maxStep=.25){
 const choices=heightsAt(x,z).filter(y=>Math.abs(y-nearY)<=maxStep&&clearBody([x,y,z]));
 choices.sort((a,b)=>b-a);
 if(!choices.length)return null;
 const y=choices[0];
 // A capsule cannot hang over a ledge. Sample its footprint, tolerating slope rise.
 for(const [dx,dz] of [[RADIUS,0],[-RADIUS,0],[0,RADIUS],[0,-RADIUS]])
  if(!heightsAt(x+dx,z+dz).some(h=>Math.abs(h-y)<.26))return null;
 return [x,y,z];
}
export function moveFoot(p,dx,dz){
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));let q=[...p];
 for(let i=0;i<count;i++){
  const full=standAt(q[0]+dx/count,q[2]+dz/count,q[1]);
  if(full)q=full;
  else { const a=standAt(q[0]+dx/count,q[2],q[1]);if(a)q=a;const b=standAt(q[0],q[2]+dz/count,q[1]);if(b)q=b; }
 }return q;
}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
class Heap{
 constructor(){this.a=[];}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].f<=v.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
 pop(){const root=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].f<this.a[c].f)c++;if(v.f<=this.a[c].f)break;this.a[i]=this.a[c];i=c;}this.a[i]=v;}return root;}
}
export class NavigationSystem{
 constructor(){
  this.step=.35;this.cells=new Map();this.nodes=[];
  for(let ix=-52;ix<=52;ix++)for(let iz=-41;iz<=52;iz++){
   const x=ix*this.step,z=iz*this.step;
   for(const y of heightsAt(x,z)){
    if(!standAt(x,z,y,.025))continue;
    const n={id:this.nodes.length,p:[x,y,z],ix,iz,edges:[]};this.nodes.push(n);
    const key=`${ix},${iz}`;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(n);
   }
  }
  for(const n of this.nodes)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   for(const b of this.cells.get(`${n.ix+dx},${n.iz+dz}`)||[]){
    if(Math.abs(n.p[1]-b.p[1])>.22)continue;
    if(this.segmentSafe(n.p,b.p))n.edges.push({id:b.id,cost:dist(n.p,b.p)});
   }
  }
 }
 segmentSafe(a,b){
  const count=Math.max(2,Math.ceil(dist(a,b)/.12));let prev=a;
  for(let i=1;i<=count;i++){
   const t=i/count,p=a.map((v,j)=>v+(b[j]-v)*t);
   const q=standAt(p[0],p[2],prev[1],.22);
   if(!q||Math.abs(q[1]-p[1])>.08)return false;prev=q;
  }return true;
 }
 nearest(p){let best=null,d=Infinity;for(const n of this.nodes){const nd=dist(n.p,p);if(nd<d&&Math.abs(n.p[1]-p[1])<.5&&this.segmentSafe(p,n.p)){d=nd;best=n;}}return best;}
 route(from,to){
  const start=this.nearest(from),goal=this.nearest(to);if(!start||!goal)throw Error('Точка вне доступной пешеходной зоны');
  const open=new Heap(),cost=new Map([[start.id,0]]),came=new Map(),closed=new Set();open.push({id:start.id,f:dist(start.p,goal.p)});
  while(open.a.length){
   const {id}=open.pop();if(closed.has(id))continue;
   if(id===goal.id){
    const points=[to];let k=id;while(k!==undefined){points.push(this.nodes[k].p);k=came.get(k);}points.push(from);points.reverse();
    // String pulling only through validated walkable space; never cut through a wall.
    const simplified=[points[0]];let i=0;
    while(i<points.length-1){let end=i+1;for(let j=i+2;j<points.length;j++){if(this.segmentSafe(points[i],points[j]))end=j;else break;}simplified.push(points[end]);i=end;}
    return simplified;
   }
   closed.add(id);for(const edge of this.nodes[id].edges){const g=cost.get(id)+edge.cost;if(g<(cost.get(edge.id)??Infinity)){cost.set(edge.id,g);came.set(edge.id,id);open.push({id:edge.id,f:g+dist(this.nodes[edge.id].p,goal.p)});}}
  }throw Error('Между точками нет безопасного маршрута');
 }
}
