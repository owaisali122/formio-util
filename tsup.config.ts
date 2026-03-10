import { defineConfig } from 'tsup'

/** Strip "use client" / "use server" so bundler doesn't warn when building library output. */
const stripUseDirective = {
  name: 'strip-use-directive',
  setup(build: import('esbuild').PluginBuild) {
    build.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (args) => {
      const fs = await import('fs')
      const path = await import('path')
      const contents = await fs.promises.readFile(args.path, 'utf8')
      const stripped = contents.replace(/^['"]use (client|server)['"]\s*;?\s*\n?/, '')
      if (stripped === contents) return null
      return {
        contents: stripped,
        loader: path.extname(args.path).slice(1) === 'ts' ? 'ts' : 'tsx',
      }
    })
  },
}

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/FormRenderer': 'src/components/FormRenderer.tsx',
    payload: 'src/payload.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['formiojs', 'react', 'react-dom', 'react-select', 'react-select/async'],
  splitting: false,
  treeshake: true,
  esbuildPlugins: [stripUseDirective],
  esbuildOptions(options) {
    options.loader = { ...options.loader, '.css': 'text' }
  },
})
