# kolea-cms-formio-builder

Shared Form.io custom components for builder and renderer. Use this package to embed the Form.io designer (e.g. in Payload admin), scope Bootstrap/Form.io CSS so it doesn’t affect the host app, and render saved forms in React.

## Installation

**1. Add this line to your project's `.npmrc`** (required for re-install to work properly):

```
side-effects-cache=false
```

**2. Install the package:**

```bash
pnpm add kolea-cms-formio-builder@npm:@your-scope/kolea-cms-formio-builder@^3.0.0
```

Replace `@your-scope` with your GitHub org/user scope (e.g. `@owaisali122`).

**What postinstall does automatically:**
- Patches `payload.config` — adds `formBuilderPlugin()` and `FormBuilder` collection (slug: `forms`, API: `/api/forms`)
- Creates `src/components/admin/FormBuilderField.tsx`
- Creates `src/collections/form-builder.ts`
- Creates `src/config/formio.ts` — Form.io API URL helpers
- Appends `FormBuilder` interface to `payload-types.ts`
- Saves a backup of your original `payload.config` as `payload.config.ts.kolea-backup`

## Uninstalling

Run the package manager remove command, then manually clean up:

```bash
pnpm remove kolea-cms-formio-builder
```

Then delete or revert as needed:
- `src/components/admin/FormBuilderField.tsx`
- `src/collections/form-builder.ts`
- `src/config/formio.ts`
- The `FormBuilder` block at the bottom of `payload-types.ts`
- The `formBuilderPlugin()` and `FormBuilder` lines from `payload.config.ts`
  _(or restore from `payload.config.ts.kolea-backup` if it exists)_


## Custom components

**Previous version** included:

- **Form Reference** (App Detail Ref) — create form reference / link to other forms.
- **Server-side dropdown** (Searchable Dropdown) — dropdown with server-side data.

**This version** includes:

- **SSN** — custom SSN component.


**Next version**:

- --

The registry and builder config are set up so these components are registered and available in the Form.io builder sidebar.

## Peer dependencies

- `formiojs` ^4.21.0
- `react` >=18
- `react-dom` >=18

Consuming projects must install these themselves. Use `bootstrap@5.3.8` in the host app for Form.io’s Bootstrap template.

## License

Private / use as needed.
