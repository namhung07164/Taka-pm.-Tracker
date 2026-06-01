import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'Taka PM',
        short_name: 'Taka',
        description: 'Taka Delegation Sub App',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'https://ui-avatars.com/api/?name=T&background=0D1117&color=fff&size=512',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'https://ui-avatars.com/api/?name=T&background=0D1117&color=fff&size=192',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    }), cloudflare()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});