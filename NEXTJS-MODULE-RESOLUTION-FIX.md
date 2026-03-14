# Fix: "Module not found: Can't resolve 'kolea-shared-package'"

If your Next.js app (e.g. app-renderer) shows:

- `Module not found: Can't resolve 'kolea-shared-package'`
- `Module not found: Can't resolve 'kolea-shared-package/client'`

do the following **in your Next.js app** (not in this package).

---

## Step 1: Build this package

From this folder (`package/kolea-shared-package`):

```bash
pnpm run build
```

This creates the `dist/` folder so the package has valid entry files.

---

## Step 2: Add the package as a dependency

In your **app-renderer** `package.json`, add the dependency so Node/Next can resolve the name `kolea-shared-package`.

**Option A – Monorepo with pnpm workspace (recommended)**

In the app’s `package.json`:

```json
{
  "dependencies": {
    "kolea-shared-package": "workspace:*"
  }
}
```

Then from the **repo root** (where `pnpm-workspace.yaml` is):

```bash
pnpm install
```

**Option B – Local path (no workspace)**

In the app’s `package.json`, use the path **from the app’s root** to this package:

```json
{
  "dependencies": {
    "kolea-shared-package": "file:../../package/kolea-shared-package"
  }
}
```

Then:

```bash
pnpm install
```

Adjust `../../package/kolea-shared-package` if your app lives elsewhere (e.g. `../package/kolea-shared-package` or `../../packages/kolea-shared-package`).

---

## Step 3: Transpile the package in Next.js

In your app’s **next.config.ts** (or **next.config.js**), add `transpilePackages`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['kolea-shared-package'],
  // ... rest of your config
}

export default nextConfig
```

This makes Next.js (and Turbopack) bundle the local package instead of treating it as an external dependency.

---

## Step 4: Do not rely only on path alias

If you previously only had a path alias (e.g. in `tsconfig.json` or `next.config.js`) and **no** dependency in `package.json`, resolution can fail. Next/Turbopack need the package to be a real dependency (workspace or `file:`) so that:

1. `kolea-shared-package` resolves to the package root.
2. `kolea-shared-package/client` resolves via the package’s `exports` to `dist/client.js`.

You can keep a path alias for types if you want, but the **dependency** (Step 2) is required.

---

## Checklist

- [ ] `pnpm run build` run in `package/kolea-shared-package` (dist exists).
- [ ] App’s `package.json` has `"kolea-shared-package": "workspace:*"` or `"file:..."`.
- [ ] `pnpm install` run from repo root (or app root if using `file:`).
- [ ] `transpilePackages: ['kolea-shared-package']` in `next.config.ts` / `next.config.js`.

After that, both of these should resolve:

- `import { BootstrapProvider, configure } from 'kolea-shared-package'`
- `import { FormIORenderSingleWithSlug } from 'kolea-shared-package/client'`
