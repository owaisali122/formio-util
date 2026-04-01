import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/FormRenderer': 'src/components/FormRenderer.tsx',
    server: 'src/server/index.ts',
    client: 'src/client/index.ts',
    payload: 'src/payload.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: false,
  external: ['formiojs', 'react', 'react-dom', 'react-select', 'react-select/async', '@tanstack/react-table'],
  splitting: false,
  treeshake: true,
  esbuildOptions(options) {
    options.loader = { ...options.loader, '.css': 'text' }
  },
})
