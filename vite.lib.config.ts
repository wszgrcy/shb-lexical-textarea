import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rootPkg from './package.json';
import fs from 'fs';
const DIST_DIR = resolve(__dirname, 'dist');
const LIB_NAME = 'index';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-dist-package-json',
      closeBundle() {
        const distPkg = {
          name: rootPkg.name,
          version: rootPkg.version,
          type: 'module',
          main: `${LIB_NAME}.cjs`,
          module: `${LIB_NAME}.mjs`,
          types: 'src/Editor/index.d.ts',
          exports: {
            '.': {
              import: `./${LIB_NAME}.mjs`,
              require: `./${LIB_NAME}.cjs`,
              type: './src/Editor/index.d.ts',
            },
            './style.css': `./style.css`,
          },
          sideEffects: false,
          publishConfig: {
            access: 'public',
          },
          repository: {
            url: 'https://github.com/wszgrcy/shb-lexical-textarea',
          },
        };
        fs.writeFileSync(
          resolve(DIST_DIR, 'package.json'),
          JSON.stringify(distPkg, null, 2),
          'utf-8',
        );
      },
    },
  ],
  publicDir: false,
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/Editor/index.ts'),
        style: resolve(__dirname, 'src/Editor/Editor.css'),
      },
      formats: ['es', 'cjs'],
      fileName: (format) => `${LIB_NAME}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rolldownOptions: {
      // output: {
      //   assetFileNames: () => 'lexical-editor.css',
      // },
      external: (id, pid, isResolved) => {
        if (!isResolved) {
          return !id.startsWith('.');
        } else {
          return id.includes('node_modules');
        }
      },
    },

    minify: false,
    sourcemap: true,
    emptyOutDir: true,
    cssCodeSplit: true,
  },
});
