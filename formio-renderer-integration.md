# FormRenderer Integration — Usage Patterns

This guide shows how to integrate forms from an external FormBuilder database using the `FormRenderer` component.

---

## Configuration

Configure `FormRenderer` to fetch schemas from your external FormBuilder API:

```typescript
import { registerCustomComponents } from 'kolea-shared-package'

registerCustomComponents({
  formsListUrl: 'https://your-formbuilder-api.com/api/formBuilder',
})
```

**Required Settings:**

| Setting | Description |
|---------|-------------|
| `formsListUrl` | Full URL to FormBuilder API endpoint (external database) |

The renderer will fetch forms via: `{formsListUrl}?where[slug][equals]=your-form-slug`

---

## Wrapper Components

The library provides wrapper components that handle all complexity internally:

### FormIORenderSingleWithSlug
For single-page forms. State management included.

```typescript
interface FormIORenderSingleWithSlug {
  slug: string
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => Promise<void>
  onError?: (error: Error) => void
}
```

### FormIORenderWizardWithSlug
For multi-step forms. Navigation and state managed internally.

```typescript
interface FormIORenderWizardWithSlug {
  slug: string
  onSuccess: () => void
  onError?: (error: Error) => void
  onNext?: (state: { formInstanceRef: RefObject, slug: string }) => void
  onPrevious?: (state: { formInstanceRef: RefObject, slug: string }) => void
  onSaveExit?: (state: { formInstanceRef: RefObject, slug: string }) => void
}
```

---

## How It Works

1. **Wrapper fetches schema** — Uses `formsListUrl` to get form from external database
2. **Wrapper renders FormRenderer** — Passes schema to internal FormRenderer component
3. **User interacts** — Fill form, click Next/Previous/Submit
4. **Wrapper notifies parent** — Callbacks fire on user action
5. **Your code handles** — Submission, navigation, errors

---

## Single Form

Render a form with submit handler:

```typescript
<FormIORenderSingleWithSlug
  slug="user-registration"
  initialData={prefillData}
  onSubmit={async (data) => {
    // Form submitted - save data
    await fetch('/api/forms/submit', {
      method: 'POST',
      body: JSON.stringify({ formSlug: 'user-registration', data }),
    })
    router.push('/forms/list')
  }}
  onError={(err) => console.error(err)}
/>
```

**Your Code:**
- Define `onSubmit` callback
- Form schema fetching handled internally
- Validation and rendering handled internally

---

## Wizard Form

Use a wizard wrapper component. All state and navigation handled internally:

```typescript
<FormIORenderWizardWithSlug
  slug="wizard-form"
  onSuccess={() => router.push('/submissions')}
  onError={(err) => console.error(err)}
  onNext={(state) => {
    // Auto-triggered: Next clicked
    // state.formInstanceRef.current = form instance
    // state.slug = form slug
  }}
  onPrevious={(state) => {
    // Auto-triggered: Previous clicked
  }}
  onSaveExit={(state) => {
    // Auto-triggered: Save & Exit clicked
  }}
/>
```

**The Wrapper Handles:**
- ✅ State (current step, data)
- ✅ Navigation (Next/Previous buttons)
- ✅ Validation before moving steps
- ✅ Step data saving
- ✅ Final submission

**Your Code:**
- Define callbacks (handlers)
- Everything else managed internally

---

## FormRenderer Props

The underlying `FormRenderer` component (used internally by wrappers):

```typescript
interface FormRendererProps {
  schema: FormRendererSchema          // Form.io schema object
  onSubmit?: (data: Record<string, any>) => void
  submission?: Record<string, any>    // Prefilled data
  readOnly?: boolean                  // Read-only mode
}
```

---

## Type Imports

```typescript
import type { FormRendererSchema, FormRendererProps } from 'kolea-shared-package'
import { 
  FormRenderer,
  registerCustomComponents 
} from 'kolea-shared-package'
```

---

## External FormBuilder URL

When FormBuilder CMS and consumer app are separate environments:

```typescript
const FORMBUILDER_API = process.env.NEXT_PUBLIC_FORMBUILDER_API
// Example: https://cms.example.com/api/formBuilder

registerCustomComponents({
  formsListUrl: FORMBUILDER_API,
})
```

**Note:** Custom components are auto-registered from the library. No local registration needed in the consumer app.
