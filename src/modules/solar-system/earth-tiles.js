// NASA GIBS WMTS capabilities, EPSG:4326 / CRS84, 500m matrix, checked 2026-09-24.
export const imagerySource='https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m';
export function tileBounds(level,x,y){
 const span=288/2**level;
 return {west:-180+x*span,east:Math.min(180,-180+(x+1)*span),north:90-y*span,south:Math.max(-90,90-(y+1)*span),span};
}
export function tileAt(level,longitude,latitude){
 const span=288/2**level,lon=((longitude+180)%360+360)%360-180;
 return {level,x:Math.min(Math.ceil(360/span)-1,Math.floor((lon+180)/span)),y:Math.max(0,Math.min(Math.ceil(180/span)-1,Math.floor((90-latitude)/span)))};
}
export function tileLevel(distance,radius,screenHeight,fov){
 const kmPerPixel=2*Math.max(radius*.06,distance-radius)*Math.tan(fov*Math.PI/360)/Math.max(1,screenHeight);
 const degreesPerPixel=kmPerPixel/radius*180/Math.PI;
 return Math.max(0,Math.min(7,Math.ceil(Math.log2(288/(512*degreesPerPixel)))));
}
export const tileKey=tile=>`${tile.level}/${tile.y}/${tile.x}`;
export const tileURL=tile=>`${imagerySource}/${tileKey(tile)}.jpeg`;
