# Copy-paste fix for app-renderer (Next.js 16)

Do these in your **app-renderer** project (the one with `app/AppProviders.tsx`).

---

## 1. Add dependency in `package.json`

In **app-renderer/package.json**, inside `"dependencies"` add:

```json
"kolea-shared-package": "file:../package/kolea-shared-package"
```

If app-renderer is not next to `package/`, adjust the path, e.g.:

- Same repo, app at `apps/app-renderer`: `"file:../../package/kolea-shared-package"`
- Same repo, app at `app-renderer`: `"file:../package/kolea-shared-package"`

Then run in app-renderer folder:

```bash
pnpm install
```

---

## 2. Add transpilePackages in `next.config.ts` (or `.js`)

In **app-renderer/next.config.ts**:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['kolea-shared-package'],
  // ... your other options
}

export default nextConfig
```

If you use **next.config.js**:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['kolea-shared-package'],
  // ... your other options
}

module.exports = nextConfig
```

---

## 3. Ensure the library is built

From **package/kolea-shared-package**:

```bash
pnpm run build
```

---

After 1 + 2 + 3, restart the dev server and the "Can't resolve 'kolea-shared-package'" error should be gone.
