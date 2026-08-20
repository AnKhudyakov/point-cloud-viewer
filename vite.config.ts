/// <reference types="vitest/config" />

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const SRC = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    preprocessorOptions: {
      scss: {
        loadPaths: [SRC],
        additionalData: (source: string, filename: string) =>
          filename.includes('shared/ui/styles')
            ? source
            : `@use 'shared/ui/styles/tokens' as *;\n${source}`,
      },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
