import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const documents=createRequire(import.meta.url)('./scripts/document-pages.cjs');

export default defineConfig({
 plugins:[vue(),{name:'readable-document-pages',configureServer(server){server.middlewares.use(documents.documentMiddleware(fileURLToPath(new URL('.',import.meta.url))));}}],
 resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},
 base:'./',
 publicDir:false,
 server:{host:'127.0.0.1'},
 build:{outDir:'dist',chunkSizeWarningLimit:650},
});
