import { MOUSE, TOUCH } from 'three';

// A cutaway removes the enclosing shell, never the structures being inspected.
export const isSectionedLayer=key=>key==='skeleton'||key==='surface';
export const sectionLayers=enabled=>({...enabled,nerves:true});

export function applyInteractionMode(controls,mode){
 controls.enablePan=true;
 controls.screenSpacePanning=true;
 controls.mouseButtons.LEFT=mode==='pan'?MOUSE.PAN:MOUSE.ROTATE;
 controls.mouseButtons.RIGHT=MOUSE.PAN;
 controls.mouseButtons.MIDDLE=MOUSE.DOLLY;
 controls.touches.ONE=mode==='pan'?TOUCH.PAN:TOUCH.ROTATE;
 controls.touches.TWO=TOUCH.DOLLY_PAN;
}
