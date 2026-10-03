                                       
export function fitZoom(viewWidth       ,viewHeight       ,width       ,height       ){return Math.min(viewWidth/width,viewHeight/height);}
export function cameraCenter(p      ,zoom       ,viewWidth       ,viewHeight       ,width       ,height       )      {
  const halfX=viewWidth/(2*zoom),halfY=viewHeight/(2*zoom);
  return {x:halfX>=width/2?width/2:Math.max(halfX,Math.min(width-halfX,p.x)),y:halfY>=height/2?height/2:Math.max(halfY,Math.min(height-halfY,p.y))};
}
export function zoomAnchor(center      ,anchor      ,oldZoom       ,newZoom       )      {
  return {x:anchor.x+(center.x-anchor.x)*oldZoom/newZoom,y:anchor.y+(center.y-anchor.y)*oldZoom/newZoom};
}
