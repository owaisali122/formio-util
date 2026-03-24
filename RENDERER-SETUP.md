# Renderer Setup (Install to Usage)

This is the minimal setup for a consumer app that wants to use:
- `FormIORenderSingleWithSlug`
- `FormIORenderWizardWithSlug` (managed mode)

## 1) Install

```bash
pnpm add kolea-shared-package formiojs react-select
```

If using local package path:

```json
{
  "dependencies": {
    "kolea-shared-package": "file:../../package/kolea-shared-package"
  }
}
```

Then build the library once:

```bash
pnpm --dir ../../package/kolea-shared-package build
```

## 2) Next.js config (required)

In consumer app `next.config.ts`:

```ts
import type { NextConfig } from 'next'
import path from 'path'

const koleaRoot = path.resolve(process.cwd(), '../../package/kolea-shared-package')

const nextConfig: NextConfig = {
  transpilePackages: ['kolea-shared-package'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'kolea-shared-package': koleaRoot,
      'kolea-shared-package/client': path.resolve(koleaRoot, 'dist/client.js'),
      'kolea-shared-package/server': path.resolve(koleaRoot, 'dist/server.js'),
    }
    return config
  },
}

export default nextConfig
```

And use webpack mode in scripts:

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack"
  }
}
```

## 3) Required API route for schema

Both single + wizard renderer call:
- `GET /api/forms/get-by-slug?slug=<form-slug>`

Response must be:

```json
{
  "id": 1,
  "schema": {}
}
```

Use server helper from package:

```ts
import { getFormBySlug } from 'kolea-shared-package/server'
```

## 4) Single form usage

```tsx
'use client'

import { FormIORenderSingleWithSlug } from 'kolea-shared-package/client'

export default function ContactFormPage() {
  return (
    <FormIORenderSingleWithSlug
      slug="contact-us"
      onSubmit={async (data) => {
        await fetch('/api/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        })
      }}
      onError={(msg) => console.error(msg)}
    />
  )
}
```

## 5) Wizard usage (managed mode, recommended)

### New wizard page (`/wizard`)

```tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormIORenderWizardWithSlug } from 'kolea-shared-package/client'

export default function WizardNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [recordId, setRecordId] = useState<number | null>(null)

  return (
    <FormIORenderWizardWithSlug
      slug={slug}
      recordId={recordId ?? undefined}
      createRecord={async (data) => {
        const res = await fetch('/api/forms/user-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        })
        const row = await res.json()
        return { id: row.id }
      }}
      saveRecord={async (id, data) => {
        const res = await fetch(`/api/forms/user-detail/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        })
        return res.ok
      }}
      onRecordCreated={(id, _data, step) => {
        setRecordId(id)
        window.history.replaceState(null, '', `/wizard/${id}?slug=${encodeURIComponent(slug)}&step=${step ?? 1}`)
      }}
      getWizardEditUrl={(id, step) => `/wizard/${id}?slug=${encodeURIComponent(slug)}&step=${step}`}
      onExit={() => router.push('/forms/user-detail')}
    />
  )
}
```

### Edit wizard page (`/wizard/[id]`)

```tsx
'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { FormIORenderWizardWithSlug } from 'kolea-shared-package/client'

export default function WizardEditPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const recordId = Number(params.id)

  return (
    <FormIORenderWizardWithSlug
      slug={slug}
      recordId={recordId}
      loadRecord={async (id) => {
        const res = await fetch(`/api/forms/user-detail/${id}`)
        if (!res.ok) return null
        const row = await res.json()
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : { ...(row.data ?? {}) }
        const step = typeof data._wizardStep === 'number' ? data._wizardStep : 0
        delete data._wizardStep
        return { data, step }
      }}
      saveRecord={async (id, data) => {
        const res = await fetch(`/api/forms/user-detail/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        })
        return res.ok
      }}
      getWizardEditUrl={(id, step) => `/wizard/${id}?slug=${encodeURIComponent(slug)}&step=${step}`}
      onExit={() => router.push('/forms/user-detail')}
    />
  )
}
```

## 6) Wizard data contract (important)

- Library stores current step in data as `_wizardStep`.
- `saveRecord` receives data already containing `_wizardStep`.
- `loadRecord` should return `{ data, step }` and remove `_wizardStep` from `data` before returning.

That is all the required setup for renderer usage.
