export async function fetchLayer(url,signal){
 let response;
 for(let attempt=0;attempt<2;attempt++){
  response=await fetch(url,{signal});
  if(response.status<500||attempt===1)break;
 }
 if(!response.ok){const error=new Error(`HTTP ${response.status}`);error.code=response.status===404?'outdated':'network';throw error;}
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength<12||new DataView(bytes).getUint32(0,true)!==0x46546c67){const error=new Error('Invalid GLB response');error.code='outdated';throw error;}
 return bytes;
}
