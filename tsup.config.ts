import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/FormRenderer': 'src/components/FormRenderer.tsx',
    'components/BootstrapProvider': 'src/components/BootstrapProvider.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['formiojs', 'react', 'react-dom'],
  splitting: false,
  treeshake: true,
})
