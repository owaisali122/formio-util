# Renderer Developer Guide (Library Maintainers)

This document is for developers working on `kolea-shared-package` renderer internals.
For consumer app setup, use `RENDERER-SETUP.md`.

## Scope

Renderer flow in this library includes:
- `FormRenderer` core mount/render lifecycle
- Wrapper APIs:
  - `FormIORenderWithSlug` (unified entry point for both single form and wizard)
- Runtime custom component:
  - `appDetailRefRuntime`
- CSS/runtime assets via `BootstrapProvider`

## Source files you will touch most

- `src/components/FormRenderer.tsx`
- `src/components/BootstrapProvider.tsx`
- `src/styles/formio-overrides.ts`
- `src/components/AppDetailRefRuntime.ts`
- `src/utils/formio-app-detail-ref-logic.ts`
- `src/client/FormIORenderWithSlug.tsx`
- `src/registry.ts`

## Build and local dev

Install:

```bash
pnpm install
```

Build once:

```bash
pnpm build
```

Watch mode:

```bash
pnpm dev
```

Typecheck:

```bash
pnpm typecheck
```

## Renderer architecture notes

### 1) `FormRenderer` is self-contained

- `FormRenderer` wraps itself in `BootstrapProvider`.
- Consumer app should not need to mount provider separately.
- `injectFormioOverrides()` runs on mount and writes `formio-overrides` style tag.

### 2) Component registration

- `registerCustomComponents()` is called before `Formio.createForm`.
- Runtime component is registered as `appDetailRefRuntime`.
- `runAppDetailRefInjection()` rewrites schema components from `appDetailRef` to `appDetailRefRuntime` for renderer use.

### 3) CSS and asset loading

- `BootstrapProvider` fetches Bootstrap and Form.io CSS with CDN fallback.
- CSS asset URLs are rewritten to absolute URLs to avoid broken relative assets.
- Font Awesome URLs are rewritten to use configured `fontAwesomeFontsUrl` (default CDN).
- Provider root intentionally uses only `bootstrap-scope` (do not add builder classes on renderer root).

### 4) Wizard managed mode contracts

`FormIORenderWithSlug` with wizard display managed mode:
- Edit flow: `loadRecord`, `saveRecord`, `getWizardEditUrl`, `onExit`
- New flow: `createRecord`, `onRecordCreated`, optional `saveRecord`, `onExit`
- `_wizardStep` is written by library before save calls.

## API assumptions from consumer app

Renderer wrappers expect these routes in consumer app:

- `GET /api/forms/get-by-slug?slug=<slug>` -> `{ id, schema }`
- `GET /api/forms/[id]` -> `{ id, schema }` (used by App Detail Ref runtime)

Wizard persistence endpoints (`/api/forms/user-detail...`) are consumer-owned and intentionally not enforced by library.

## Release checklist for renderer changes

1. Update source files in `src/`.
2. Run `pnpm build` to refresh `dist/*`.
3. Run `pnpm typecheck`.
4. Validate in consumer app:
   - Single form render by slug
   - Wizard new -> edit transition
   - Wizard step save/load with `_wizardStep`
   - App Detail Ref render (no dashed/gray builder styling)
   - No `/fonts/fontawesome-webfont...` 404 in browser network tab
5. Update `RENDERER-SETUP.md` if any consumer-facing behavior changed.

## Common regressions to avoid

- Re-adding builder classes on renderer root (`formio-builder`, `formbuilder`) causes dashed/preview styling leakage.
- Using relative CSS `url(...)` paths without rewrite can break fonts/icons in consumer apps.
- Requiring consumer app to mount `BootstrapProvider` manually introduces duplicated styles and ordering issues.
- Changing wrapper endpoint expectations without documenting them breaks existing integrations.

