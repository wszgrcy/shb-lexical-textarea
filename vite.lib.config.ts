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
          exports: {
            '.': {
              import: `./${LIB_NAME}.mjs`,
              require: `./${LIB_NAME}.cjs`,
              types: './src/Editor/index.d.ts',
            },
            './variable-serialization': {
              import: `./variable-serialization.mjs`,
              require: `./variable-serialization.cjs`,
              types: './src/nodes/VariableSerialization.d.ts',
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
          dependencies: {
            cheerio: '^1.2.0',
            'fast-equals': '^6.0.0',
            'es-toolkit': '^1.47.0',
          },
          peerDependencies: {
            '@lexical/history': '^0.44.0',
            '@lexical/react': '^0.44.0',
            '@lexical/rich-text': '^0.44.0',
            lexical: '^0.44.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
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
        'variable-serialization': resolve(
          __dirname,
          'src/nodes/VariableSerialization.tsx',
        ),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        return `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`;
      },
    },
    rolldownOptions: {
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
