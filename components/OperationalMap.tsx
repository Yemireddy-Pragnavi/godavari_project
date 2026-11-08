'use client';
import {useEffect,useRef,useState} from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
export default function OperationalMap({corridors,onSelect,fallback}:{corridors:any[],onSelect:(c:any)=>void,fallback:React.ReactNode}){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),[error,setError]=useState('');
 useEffect(()=>{let disposed=false;import('maplibre-gl').then(module=>{const {Map,NavigationControl}=(module as any).default||module;
  if(disposed||!container.current)return;
  const map=new Map({container:container.current,center:[81.777,17.008],zoom:16.5,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#eef1e9'}}]},attributionControl:false});mapRef.current=map;map.addControl(new NavigationControl(),'top-right');
  const coordinates=[[[81.775,17.01],[81.775,17.0085],[81.778,17.0085]],[[81.7765,17.0085],[81.779,17.0085],[81.7793,17.009]],[[81.778,17.007],[81.7792,17.007],[81.7795,17.0078]],[[81.775,17.007],[81.7765,17.007],[81.7765,17.0078]]];
  map.on('load',()=>{
   map.addSource('river',{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[81.7795,17.02],[81.7797,17.011],[81.7795,17.009],[81.78,17.006],[81.781,17],[81.79,17],[81.79,17.02],[81.7795,17.02]]]}}});map.addLayer({id:'river',type:'fill',source:'river',paint:{'fill-color':'#b5d6d8'}});
   map.addSource('routes',{type:'geojson',data:{type:'FeatureCollection',features:corridors.map((c,i)=>({type:'Feature',properties:{id:c.id,color:c.state==='RESTRICTED'?'#bd6769':c.state==='VERIFIED_ACCESSIBLE'?'#3d7584':'#c39c57'},geometry:{type:'LineString',coordinates:coordinates[i]}}))}});
   map.addLayer({id:'route-outline',type:'line',source:'routes',paint:{'line-color':'white','line-width':12}});map.addLayer({id:'routes',type:'line',source:'routes',paint:{'line-color':['get','color'],'line-width':6}});
   map.addSource('nodes',{type:'geojson',data:{type:'FeatureCollection',features:coordinates.flatMap(line=>line.map(coordinate=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:coordinate}})))}});map.addLayer({id:'nodes',type:'circle',source:'nodes',paint:{'circle-color':'#3d7584','circle-stroke-color':'white','circle-stroke-width':3,'circle-radius':6}});
   map.on('click','routes',(e:any)=>{const id=e.features?.[0]?.properties?.id;const c=corridors.find(c=>c.id===id);if(c)onSelect(c)});map.on('mouseenter','routes',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','routes',()=>map.getCanvas().style.cursor='');
  });map.on('error',()=>setError('Geospatial view unavailable. Use the illustrated overview map.'));
 }).catch(e=>{console.error('MapLibre initialization:',e);setError('MapLibre could not load. Use the illustrated overview map.')});return()=>{disposed=true;mapRef.current?.remove()};},[JSON.stringify(corridors)]);
 if(error)return <div><div className="info-banner">Geospatial renderer unavailable in this browser. Showing the interactive illustrated network.</div>{fallback}</div>;
 return <div style={{position:'relative'}}><div ref={container} style={{height:570,width:'100%'}} aria-label="Interactive MapLibre corridor network"/>{error&&<div className="info-banner">{error}</div>}<div className="map-label">MapLibre · Synthetic geometry · Not for real navigation</div><div className="map-legend"><span><i className="line teal"/>Verified access</span><span><i className="line amber"/>Needs verification</span><span><i className="line red"/>Restricted</span></div></div>
}
