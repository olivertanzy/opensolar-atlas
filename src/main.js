import { createApp } from 'vue';
import App from './App.vue';
import '../style.css';
import './styles.css';
import './shell.css';
let app;
function mount(){app=createApp(App);app.mount('#app');}
mount();
if(import.meta.env.DEV)window.ATLAS_TEST={unmount:()=>app.unmount(),mount};
