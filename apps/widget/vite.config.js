import { defineConfig } from 'vite';
import terser from '@rollup/plugin-terser';

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'VakkyaWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      // Externalize livekit-client - it will be loaded dynamically from CDN
      external: ['livekit-client'],
      output: {
        entryFileNames: 'widget.js',
        inlineDynamicImports: true,
        globals: {
          'livekit-client': 'LivekitClient',
        },
      },
      plugins: mode === 'production' ? [terser()] : [],
    },
    sourcemap: mode !== 'production',
  },
  server: {
    port: 3002,
    open: '/demo.html',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}));
