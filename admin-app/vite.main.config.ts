import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // package.json main is .vite/build/main.js; entry is index.ts otherwise emits index.js
        entryFileNames: 'main.js',
      },
    },
  },
});
