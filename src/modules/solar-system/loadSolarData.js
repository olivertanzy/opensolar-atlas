let pending;
// The large legacy catalogue is loaded only when the solar module is opened.
export function loadSolarData(){
 if(window.SOLAR_DATA)return Promise.resolve();
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=new URL('data.js',document.baseURI).href;
  script.onload=()=>{script.remove();if(window.SOLAR_DATA)resolve();else{pending=null;reject(new Error('Solar catalogue missing'));}};
  script.onerror=()=>{script.remove();pending=null;reject(new Error('Solar catalogue unavailable'));};
  document.head.append(script);
 });
 return pending;
}
