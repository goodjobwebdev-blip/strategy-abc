import type { Point } from './data.ts';
export function fitZoom(viewWidth:number,viewHeight:number,width:number,height:number){return Math.min(viewWidth/width,viewHeight/height);}
export function cameraCenter(p:Point,zoom:number,viewWidth:number,viewHeight:number,width:number,height:number):Point{
  const halfX=viewWidth/(2*zoom),halfY=viewHeight/(2*zoom);
  return {x:halfX>=width/2?width/2:Math.max(halfX,Math.min(width-halfX,p.x)),y:halfY>=height/2?height/2:Math.max(halfY,Math.min(height-halfY,p.y))};
}
export function zoomAnchor(center:Point,anchor:Point,oldZoom:number,newZoom:number):Point{
  return {x:anchor.x+(center.x-anchor.x)*oldZoom/newZoom,y:anchor.y+(center.y-anchor.y)*oldZoom/newZoom};
}
