import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/FormRenderer': 'src/components/FormRenderer.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['formiojs', 'react', 'react-dom', 'react-select', 'react-select/async'],
  splitting: false,
  treeshake: true,
  esbuildOptions(options) {
    options.loader = { ...options.loader, '.css': 'text' }
  },
})
