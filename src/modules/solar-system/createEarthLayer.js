import * as THREE from 'three';
import { geographicPoint, densifyRing, visiblePlaceRank } from './earth-geography.js';

export function createEarthLayer(earth,data,getName){
 const axes=earth.userData.body.axesKm,radius=Math.max(...axes);
 const group=new THREE.Group();group.name='earth-geography';earth.add(group);
 const baseMaterial=new THREE.LineBasicMaterial({color:0x8cded5,transparent:true,opacity:.5,depthWrite:false});
 const activeMaterial=new THREE.LineBasicMaterial({color:0xffd58b,transparent:true,opacity:.95,depthWrite:false});
 const outlines=new Map(),points=new Map();
 let options={borders:true,cities:true},selected=null,disposed=false,lastLabels=[];
 for(const country of data.countries){
  const vertices=[];
  for(const polygon of country.polygons)for(const ring of polygon){
   const curve=densifyRing(ring).map(coordinates=>geographicPoint(coordinates,axes,.6).map(value=>value/radius));
   for(let i=1;i<curve.length;i++)vertices.push(...curve[i-1],...curve[i]);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const line=new THREE.LineSegments(geometry,baseMaterial);group.add(line);outlines.set(country.id,line);
 }
 for(const place of [...data.countries,...data.cities]){
  const point=new THREE.Vector3(...geographicPoint(place.coordinates,axes,.6));
  const normal=new THREE.Vector3(...geographicPoint(place.coordinates,[1,1,1]));
  points.set(place.id,{place,point,normal});
 }
 const sortedCountries=[...data.countries].sort((a,b)=>a.rank-b.rank);
 const countryByCode=new Map(data.countries.map(country=>[country.code,country]));
 function select(place){
  selected=place;
  const country=place?.kind==='country'?place:countryByCode.get(place?.country);
  for(const [id,line] of outlines)line.material=id===country?.id?activeMaterial:baseMaterial;
 }
 function update(active){group.visible=active&&options.borders;}
 function draw(ctx,camera,width,height,distance){
  const localCamera=camera.position.clone().sub(earth.position).applyQuaternion(earth.quaternion.clone().invert());
  const rank=visiblePlaceRank(distance,radius),placed=[],hits=[];lastLabels=[];
  const order=[...(selected?[selected]:[]),...(options.borders?sortedCountries.filter(place=>place.rank<=Math.min(6,rank+2)):[]),...(options.cities?data.cities.filter(place=>place.rank<=rank):[])];
  const visited=new Set(),toward=new THREE.Vector3(),world=new THREE.Vector3();
  let countryCount=0,cityCount=0;
  for(const place of order){
   if(visited.has(place.id))continue;visited.add(place.id);
   const active=place.id===selected?.id,isCountry=place.kind==='country';
   if(!active&&(isCountry?countryCount>=14:cityCount>=42))continue;
   const {point,normal}=points.get(place.id);
   if(toward.copy(localCamera).sub(point).dot(normal)<=0)continue;
   world.copy(point).applyQuaternion(earth.quaternion).add(earth.position).project(camera);
   if(world.z< -1||world.z>1)continue;
   const x=(world.x+1)*width/2,y=(1-world.y)*height/2;
   if(x<12||x>width-20||y<(width<600?205:155)||y>height-(width<600?245:165))continue;
   const text=getName(place);ctx.font=`${active?'600 ':''}${isCountry?12:11}px Segoe UI, Microsoft YaHei, sans-serif`;
   const w=ctx.measureText(text).width+19;
   if(x+w>width-8)continue;
   if(!active&&placed.some(box=>Math.abs(box.y-y)<21&&x<box.x+box.w+8&&x+w+8>box.x))continue;
   const color=active?'#ffe2a8':isCountry?'#c1f1e3':place.capital?'#ffe1a5':'#e6edf7';
   ctx.fillStyle='#07131cbb';ctx.fillRect(x+4,y-12,w-1,21);
   ctx.beginPath();ctx.arc(x,y,active?4:place.capital?2.6:1.7,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
   if(active){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();}
   ctx.fillText(text,x+10,y+4);placed.push({x,y,w});hits.push({x,y,w,place});
   lastLabels.push({id:place.id,x,y,coordinates:place.coordinates});
   if(isCountry)countryCount++;else cityCount++;
  }
  return hits;
 }
 function dispose(){if(disposed)return;disposed=true;earth.remove(group);for(const line of outlines.values())line.geometry.dispose();baseMaterial.dispose();activeMaterial.dispose();outlines.clear();points.clear();lastLabels=[];}
 return {update,draw,select,dispose,setOptions(value){options={...options,...value};},get diagnostics(){return {visible:group.visible,selected:selected?.id,labels:lastLabels,countryMeshes:outlines.size,options:{...options},disposed};}};
}
