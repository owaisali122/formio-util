# Local development & debugging

Use this package from a local path in your consumer app so you can debug and extend components without publishing.

## 1. Add the package as a local dependency

In your **consumer app's** `package.json`:

```json
"dependencies": {
  "kolea-cms-formio-builder": "file:../kolea-cms-formio-builder"
}
```

Use the correct path (e.g. `../kolea-cms-formio-builder` or `../../kolea-cms-formio-builder`) from your consumer project root to this repo.

Then in the consumer folder:

```bash
pnpm install
```

## 2. Build the package

In **this repo** (kolea-cms-formio-builder):

```bash
pnpm run build
```

Run this after any change so the consumer gets updated `dist/`. For live rebuilds:

```bash
pnpm run dev
```

## 3. Run both

- **Terminal A** (this repo): `pnpm run dev` — keeps `dist/` up to date.
- **Terminal B** (consumer app): `pnpm run dev` — your app uses the local package.

## 4. Extend or add components

1. Add or edit files under `src/` (e.g. `src/components/`, `src/registries/`).
2. Export new components from `src/index.ts` if needed.
3. Run `pnpm run build` (or keep `pnpm run dev` running).
4. Consumer app will pick up changes on next reload.

## 5. Switch back to the published package

In the consumer's `package.json`, replace the `file:` dependency with the version from your registry, e.g.:

```json
"kolea-cms-formio-builder": "^3.42.0"
```

Then run `pnpm install`.
