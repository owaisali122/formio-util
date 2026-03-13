## Kolea Form.io Renderer – Installation & Usage Guide

This guide explains how to install and use `kolea-shared-package` as a **Form Renderer** inside a Next.js application, including required configuration, database/API wiring, and precautions.

---

### 1. Installation

#### 1.1. Configure `.npmrc` for GitHub Packages

In your Next.js project root, create or update `.npmrc`:

```bash
@owaisali122:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

- **`@owaisali122`** comes from `publishScope` in this package’s `package.json`.
- **Do not hard-code tokens.** Inject `GITHUB_TOKEN` via environment variables (local shell, CI).

#### 1.2. Install the package

Use your preferred package manager:

```bash
pnpm add kolea-shared-package
# or
npm install kolea-shared-package
# or
yarn add kolea-shared-package
```

**Precautions:**

- This package declares `formiojs`, `react`, `react-dom`, and `react-select` as **peer dependencies**. Ensure your app already has compatible versions installed.
- The library is designed for **client-side rendering** in React/Next.js; avoid using it directly in Node-only contexts.

---

### 2. Registering the package in a Next.js application

You should register custom components **once** on the client, and configure how the renderer talks to your external FormBuilder API (and CSS/fonts if needed).

#### 2.1. Create a Form.io initializer

Create `app/formio/setupFormio.ts`:

```typescript
'use client'

import { registerCustomComponents, configure } from 'kolea-shared-package'

let _registered: Promise<unknown> | null = null

export function initFormioRenderer() {
  if (!_registered) {
    _registered = (async () => {
      // 1) Global configuration – URLs used at runtime
      configure({
        formsListUrl: process.env.NEXT_PUBLIC_FORMBUILDER_API, // e.g. https://cms.example.com/api/formBuilder
        bootstrapCssUrl: '/api/bootstrap-css',                  // optional; where you serve Bootstrap CSS
        formioCssUrl: '/api/formio-css',                        // optional; where you serve Form.io CSS
        fontAwesomeFontsUrl: '/fonts/',                         // optional; where you serve Font Awesome fonts
      })

      // 2) Register all custom components (App Detail Ref, SSN, Searchable Dropdown,
      //    App Detail Ref runtime, etc.)
      await registerCustomComponents()
    })()
  }

  return _registered
}
```

**Precautions:**

- Keep this file **client-only** (`'use client'`).
- Do not call `registerCustomComponents` from the server (no SSR).

#### 2.2. Create a `FormioProvider` wrapper

Create `app/formio/FormioProvider.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { initFormioRenderer } from './setupFormio'

export function FormioProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initFormioRenderer()
  }, [])

  return <>{children}</>
}
```

Wrap the part of your app that uses forms, for example `app/(forms)/layout.tsx`:

```typescript
import { FormioProvider } from '@/app/formio/FormioProvider'

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return <FormioProvider>{children}</FormioProvider>
}
```

This ensures that:

- The library is configured exactly once.
- All custom components are registered before any `FormRenderer` runs.

---

### 3. Using the package as a Form Renderer

You typically render forms in two steps:

1. Fetch the **Form.io schema** from your external FormBuilder CMS.
2. Pass the schema to `FormRenderer`.

The package also includes logic to support the **App Detail Ref runtime** component when the schema contains `type: 'appDetailRef'`.

#### 3.1. Basic usage with a known schema

```typescript
'use client'

import { FormRenderer, type FormRendererSchema } from 'kolea-shared-package'

type Props = {
  schema: FormRendererSchema
}

export function MyForm({ schema }: Props) {
  return (
    <FormRenderer
      schema={schema}
      onSubmit={async (data) => {
        await fetch('/api/forms/submit', {
          method: 'POST',
          body: JSON.stringify({ data }),
        })
      }}
    />
  )
}
```

- `schema`: A Form.io JSON object (usually from your FormBuilder CMS).
- `onSubmit`: Called with `data` when the user submits the form.
- Optional props:
  - `submission`: Prefill data, `{ [key: string]: unknown }`.
  - `readOnly`: Render form in read-only mode.

#### 3.2. Rendering by form slug (recommended pattern)

This pattern matches the conceptual flow in `formio-renderer-integration.md`.

```typescript
'use client'

import { useEffect, useState } from 'react'
import { FormRenderer, type FormRendererSchema } from 'kolea-shared-package'

type Props = {
  slug: string
}

export function FormIORenderSingleWithSlug({ slug }: Props) {
  const [schema, setSchema] = useState<FormRendererSchema | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSchema() {
      try {
        setError(null)
        setSchema(null)

        const base = process.env.NEXT_PUBLIC_FORMBUILDER_API // e.g. https://cms.example.com/api/formBuilder
        const url = `${base}?where[slug][equals]=${encodeURIComponent(slug)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Form not found: ${slug}`)

        const json = await res.json()
        const doc = json.docs?.[0] ?? json
        const schema = (doc.schema ?? doc) as FormRendererSchema

        if (!cancelled) setSchema(schema)
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load form')
      }
    }

    void loadSchema()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (error) return <div>Error: {error}</div>
  if (!schema) return <div>Loading form…</div>

  return (
    <FormRenderer
      schema={schema}
      onSubmit={async (data) => {
        await fetch('/api/forms/submit', {
          method: 'POST',
          body: JSON.stringify({ formSlug: slug, data }),
        })
      }}
    />
  )
}
```

**Precautions:**

- Always show a **loading** state while fetching the schema.
- Always handle **errors** (network issues, missing forms).
- Prefer **slugs** (stable identifiers) rather than raw numeric IDs in URLs.

---

### 4. Database & API configuration

The renderer does **not** talk to the database directly. Instead, it uses APIs exposed by your **FormBuilder CMS** (often a Payload CMS instance using this same package).

#### 4.1. External FormBuilder API (`formsListUrl`)

`formsListUrl` points to an API that lists forms, e.g.:

```text
https://cms.example.com/api/formBuilder
```

The renderer (and tooling) expect to be able to query:

```text
GET {formsListUrl}?where[slug][equals]=<slug>
```

This should return something like:

```json
{
  "docs": [
    {
      "id": "123",
      "title": "User Registration",
      "slug": "user-registration",
      "schema": {
        "display": "form",
        "components": [ /* Form.io components */ ]
      }
    }
  ]
}
```

You configure this in `configure()` or `registerCustomComponents()`:

```typescript
configure({
  formsListUrl: process.env.NEXT_PUBLIC_FORMBUILDER_API, // e.g. https://cms.example.com/api/formBuilder
})
```

**Precautions:**

- Ensure CORS on the CMS allows your Next.js origin if you call it directly from the browser.
- Alternatively, hide the CMS behind your own Next.js API routes.

#### 4.2. App Detail Reference runtime API (`formApiBasePath`)

The **runtime App Detail Ref** component (used in the renderer) is responsible for embedding another form inside the current form.

- It expects each `appDetailRef` component in the schema to have:
  - `selectedFormId`: the ID of the form to embed.
  - `formApiBasePath`: optional; defaults to `'/api/forms'`.

At runtime, it constructs:

```text
${window.location.origin}${formApiBasePath}/${selectedFormId}
```

and fetches that URL to retrieve the embedded form schema.

**Recommended setup:**

Create a Next.js route:

```text
GET /api/forms/:id
  → proxies to your FormBuilder CMS
  → returns a JSON with a `schema` property
```

Example (simplified):

```typescript
// app/api/forms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

const CMS_BASE = process.env.FORMBUILDER_INTERNAL_API // e.g. http://cms:3000/api/formBuilder

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const res = await fetch(`${CMS_BASE}/${encodeURIComponent(params.id)}`)
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const doc = await res.json()
  return NextResponse.json(doc)
}
```

**Precautions:**

- Use an **internal** CMS URL (`FORMBUILDER_INTERNAL_API`) so you can keep credentials and auth hidden from the browser.
- Apply authentication/authorization in this proxy if needed.

#### 4.3. Database configuration (FormBuilder CMS side)

On the **FormBuilder** project (typically a Payload CMS app):

- Configure your database (e.g. PostgreSQL) in `payload.config.ts` as usual.
- Ensure:
  - A `FormBuilder` (or equivalent) collection exists and is exposed via API.
  - The `/api/formBuilder` and `/api/formBuilder/:id` endpoints are reachable from the renderer app or your Next.js proxy routes.

**Precautions:**

- Database credentials must live **only** in the CMS environment config, not in the renderer app.
- If the CMS is not public, the renderer should always call a **Next.js API proxy** that can attach any required tokens/cookies.

---

### 5. Additional precautions & performance notes

- **Client-only usage:** `FormRenderer` and the registration functions are designed for client components (`'use client'`).
- **One-time registration:** Use the `initFormioRenderer` pattern to avoid repeated registrations and maintain predictable performance.
- **Schema sizes:** Extremely large forms will naturally be heavier to render. Consider using wizards (multi-step forms) for better UX and performance.
- **App Detail Ref runtime:**
  - The library automatically converts `appDetailRef` components in the schema into a dedicated runtime implementation when rendering.
  - This is done via a lightweight traversal (`runAppDetailRefInjection`) before calling `Formio.createForm`, with negligible runtime overhead for typical form sizes.

For more advanced usage patterns (wizards, higher-level wrappers), see `formio-renderer-integration.md` in this repository.

