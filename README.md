# formio-custom-components

Shared Form.io custom components for builder and renderer. Use this package to embed the Form.io designer (e.g. in Payload admin), scope Bootstrap/Form.io CSS so it doesn’t affect the host app, and render saved forms in React.

## Installation

In the project that will use the builder and/or renderer (e.g. CMS or portal):

```bash
pnpm add formiojs bootstrap@5.3.8 formio-custom-components
```

Or with npm:

```bash
npm install formiojs bootstrap@5.3.8 formio-custom-components
```

**From a local path** (development):

```bash
pnpm add formio-custom-components@file:../formio-util
```

**From GitHub** (if you publish the repo):

```bash
pnpm add formio-custom-components@github:your-org/formio-util#v1.0.0
```

## Configuration

**No static URLs.** The package does not hardcode any API or CSS URLs. You set them where you use the package.

**Option 1 – once at app startup (e.g. layout):**
```ts
import { configure } from 'formio-custom-components'

configure({
  formsListUrl: process.env.NEXT_PUBLIC_FORMS_API_URL || '/api/forms',  // required for App Detail Ref
  bootstrapCssUrl: '/api/bootstrap-css',   // optional; BootstrapProvider default
  formioCssUrl: '/api/formio-css',          // optional; BootstrapProvider default
})
```

**Option 2 – where you init the form builder (dynamic):**
```ts
const FormioInstance = await registerCustomComponents({
  formsListUrl: getFormsListUrlFromYourApp(),  // e.g. from env or props
})
```

If you don’t set `formsListUrl`, App Detail Ref will not load forms and will show a message to set it. If your app serves Bootstrap and Form.io CSS at the default paths above, you can omit `bootstrapCssUrl` and `formioCssUrl`. The host app must provide API routes (or equivalent) that serve:

- Bootstrap CSS (e.g. from `node_modules/bootstrap/dist/css/bootstrap.min.css`)
- Form.io CSS (e.g. from `formiojs/dist/formio.full.min.css`)

## Form builder styles (wizard pages, sidebar, layout)

Import the package CSS once so the Form.io builder and wizard page tabs look correct. You do **not** need to add your own FormBuilderField.module.scss for builder layout if you use this.

```ts
// In your app entry or layout (e.g. app/layout.tsx, _app.tsx, or the page that renders the builder)
import 'formio-custom-components/styles/formio-overrides.css'
```

This includes: dialog/nav fixes, builder background, sidebar, wizard pages (Page 1, Page 2, + PAGE) visibility and styling. Toolbar styles (e.g. "Display as" dropdown) stay in your app if you use a custom toolbar.

## BootstrapProvider

Wrap the Form.io builder (or renderer) with `BootstrapProvider` so Bootstrap and Form.io styles are loaded and scoped. They will not leak into the rest of the app (e.g. Payload admin).

```tsx
import { BootstrapProvider, registerCustomComponents, getBuilderConfig } from 'formio-custom-components'

// Before rendering the builder:
await registerCustomComponents()

<BootstrapProvider>
  <div ref={builderRef} />
  {/* Formio.FormBuilder mounted on builderRef */}
</BootstrapProvider>
```

## FormRenderer

Render a saved Form.io schema (from the builder) in any React app:

```tsx
import { FormRenderer } from 'formio-custom-components/FormRenderer'

<FormRenderer
  schema={form.schema}
  onSubmit={(data) => console.log(data)}
  readOnly={false}
  submission={{ firstName: 'Jane' }}
/>
```

- **schema** — Form.io JSON (e.g. `{ display: 'form', components: [...] }`).
- **onSubmit** — Called with submitted data when the user submits the form.
- **submission** — Optional prefill data.
- **readOnly** — When `true`, the form is read-only.

`FormRenderer` calls `registerCustomComponents()` once internally, so custom components (when added) will be available when the form renders.

## Builder config

Use `getBuilderConfig()` when creating the Form.io builder so the sidebar and template are correct (e.g. `template: 'bootstrap'` for wizards). Wizard schema is fixed automatically so "Page 1" and "+ PAGE" show.

If you see **"Cannot set property FormBuilder"** (FormBuilder is read-only in your bundle), use `createFormBuilder` instead of `new Formio.FormBuilder`:

```ts
import { registerCustomComponents, getBuilderConfig, createFormBuilder } from 'formio-custom-components'

const FormioInstance = await registerCustomComponents()
const builderConfig = getBuilderConfig()
const formBuilder = createFormBuilder(FormioInstance, container, schemaWithDisplay, builderConfig)
const instance = await formBuilder.ready
```

## Custom components

Custom Form.io components (Document Upload, Document Viewer, Searchable Dropdown, SSN, etc.) will be added in a later release. The registry and builder config are set up so they can be registered and listed in the builder sidebar once implemented.

## Peer dependencies

- `formiojs` ^4.21.0
- `react` >=18
- `react-dom` >=18

Consuming projects must install these themselves. Use `bootstrap@5.3.8` in the host app for Form.io’s Bootstrap template.

## Scripts

- `pnpm build` — Build the package (output in `dist/`).
- `pnpm dev` — Watch and rebuild on changes.
- `pnpm typecheck` — Run `tsc --noEmit`.

## License

Private / use as needed.
