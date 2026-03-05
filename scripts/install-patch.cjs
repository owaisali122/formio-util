/**
 * postinstall script — patches the consumer's payload.config.ts/js
 * to import and register myProductsPlugin from this package.
 *
 * Safe: does nothing when the plugin is already present or no config is found.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PKG_NAME = 'kolea-cms-formio-builder/payload';
const PKG_SHORT = 'kolea-cms-formio-builder';
const PLUGIN_FN = 'myProductsPlugin';
const IMPORT_LINE = `import { ${PLUGIN_FN} } from '${PKG_NAME}'`;
const FORMSTEST_IMPORT = "import { Forms as FormsTest } from './collections/Formstest'";
const BACKUP_EXT = '.kolea-backup';
const REMOVE_SCRIPT_KEY = 'kolea-cms-formio-builder:remove';

const FORMBUILDER_FIELDTEST_CONTENT = `'use client'

import { useField } from '@payloadcms/ui'
import { FormBuilder } from 'kolea-cms-formio-builder'
import type { FormBuilderSchema } from 'kolea-cms-formio-builder'
import { getFormsListUrl } from '@/config/formio'

function FormBuilderFieldtest() {
  const { value, setValue } = useField<FormBuilderSchema>()

  return (
    <FormBuilder
      value={value}
      setValue={setValue as (schema: FormBuilderSchema) => void}
      formsListUrl={getFormsListUrl()}
    />
  )
}

export default FormBuilderFieldtest
`;
const FORMBUILDER_FIELDTEST_RELATIVE = path.join('src', 'components', 'admin', 'FormBuilderFieldtest.tsx');

const FORMSTEST_CONTENT = `import type { CollectionConfig } from 'payload'

export const Forms: CollectionConfig = {
  slug: 'forms-test',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    group: 'Form Management',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-safe identifier used by the API (e.g. benefits-application).',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Internal reference only.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'schema',
      type: 'json',
      required: true,
      defaultValue: { display: 'form', components: [] },
      admin: {
        description: 'Form.io schema — use the Form Builder below to edit.',
        components: {
          Field: '/components/admin/FormBuilderFieldtest',
        },
      },
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'submitButtonText',
          type: 'text',
          defaultValue: 'Submit',
        },
        {
          name: 'successMessage',
          type: 'textarea',
        },
        {
          name: 'allowMultipleSubmissions',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
  ],
}
`;
const FORMSTEST_RELATIVE = path.join('src', 'collections', 'Formstest.ts');

const FORMTEST_INTERFACE_APPEND = `

/** Added by kolea-cms-formio-builder — FormTest (forms-test collection) */
export interface FormTest {
  id: number;
  title: string;
  /**
   * URL-safe identifier used by the API (e.g. benefits-application).
   */
  slug: string;
  /**
   * Internal reference only.
   */
  description?: string | null;
  status: 'draft' | 'published';
  /**
   * Form.io schema — use the Form Builder below to edit.
   */
  schema:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  settings?: {
    submitButtonText?: string | null;
    successMessage?: string | null;
    allowMultipleSubmissions?: boolean | null;
  };
  updatedAt: string;
  createdAt: string;
}
`;

// ---------------------------------------------------------------------------
// 1. Locate consumer project root (works for npm/yarn and pnpm)
// When pnpm runs postinstall, cwd is inside node_modules/.pnpm/... so we
// walk up from __dirname until we find a dir with package.json + node_modules.
// ---------------------------------------------------------------------------
function findConsumerRoot() {
  let dir = path.dirname(__dirname); // package root (e.g. .../kolea-cms-formio-builder)
  const rootDir = path.parse(dir).root;

  for (let i = 0; i < 20; i++) {
    if (dir === rootDir) break;
    const hasPkg = fs.existsSync(path.join(dir, 'package.json'));
    const hasNodeModules = fs.existsSync(path.join(dir, 'node_modules'));
    if (hasPkg && hasNodeModules) {
      // Only treat as consumer if this project has us in node_modules (avoids using our own repo root when linking)
      const usHere = fs.existsSync(path.join(dir, 'node_modules', 'kolea-cms-formio-builder'))
        || fs.existsSync(path.join(dir, 'node_modules', '@owaisali122', 'kolea-cms-formio-builder'));
      if (usHere) return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Locate payload.config.ts or .js in common locations
// ---------------------------------------------------------------------------
function findPayloadConfig(root) {
  const candidates = [
    // Common single-app layouts
    path.join(root, 'src', 'payload.config.ts'),
    path.join(root, 'src', 'payload.config.js'),
    path.join(root, 'payload.config.ts'),
    path.join(root, 'payload.config.js'),
    // Some projects keep it under src/payload or payload/
    path.join(root, 'src', 'payload', 'payload.config.ts'),
    path.join(root, 'src', 'payload', 'payload.config.js'),
    path.join(root, 'payload', 'payload.config.ts'),
    path.join(root, 'payload', 'payload.config.js'),
    // Monorepo-ish patterns (apps/cms, apps/admin, etc.)
    path.join(root, 'apps', 'cms', 'src', 'payload.config.ts'),
    path.join(root, 'apps', 'cms', 'src', 'payload.config.js'),
    path.join(root, 'apps', 'cms', 'payload.config.ts'),
    path.join(root, 'apps', 'cms', 'payload.config.js'),
  ];

  console.log(
    `[${PKG_NAME}] Looking for payload.config in:`,
    '\n  root =',
    root,
    '\n  candidates =',
    candidates.join('\n              '),
  );

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`[${PKG_NAME}] ✓ Found payload config at: ${p}`);
      return p;
    }
  }
  console.log(`[${PKG_NAME}] ✗ No payload.config found in any of the candidate paths.`);
  return null;
}

function findPayloadTypes(root) {
  const candidates = [
    path.join(root, 'src', 'payload-types.ts'),
    path.join(root, 'payload-types.ts'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. Patch the config file
// ---------------------------------------------------------------------------
function patchConfig(configPath) {
  let src = fs.readFileSync(configPath, 'utf8');

  if (src.includes(PLUGIN_FN)) {
    console.log(`[${PKG_NAME}] ✓ ${PLUGIN_FN} already present in ${path.basename(configPath)} — skipping.`);
    return;
  }

  // Save backup for clean revert on uninstall
  fs.writeFileSync(configPath + BACKUP_EXT, src, 'utf8');

  // --- Add import at the top (after last existing import) ---
  const importInsertIndex = findLastImportEnd(src);
  src =
    src.slice(0, importInsertIndex) +
    '\n' + IMPORT_LINE + '\n' +
    src.slice(importInsertIndex);

  // --- Add plugin call into plugins array ---
  src = injectPlugin(src);

  fs.writeFileSync(configPath, src, 'utf8');
  console.log(`[${PKG_NAME}] ✓ Patched ${configPath}`);
  console.log(`  → added import { ${PLUGIN_FN} } and registered in plugins array.`);
}

function addRemoveScript(consumerRoot) {
  const pkgPath = path.join(consumerRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  if (scripts[REMOVE_SCRIPT_KEY]) return;
  scripts[REMOVE_SCRIPT_KEY] = `node node_modules/${PKG_SHORT}/scripts/uninstall-patch.cjs && pnpm remove ${PKG_SHORT}`;
  pkg.scripts = scripts;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[${PKG_NAME}] ✓ To uninstall cleanly, run: pnpm run ${REMOVE_SCRIPT_KEY}`);
}

function patchFormstestInConfig(configPath) {
  let src = fs.readFileSync(configPath, 'utf8');
  if (src.includes("from './collections/Formstest'") && src.includes('FormsTest')) {
    return;
  }
  if (!src.includes("from './collections/Formstest'")) {
    const importInsertIndex = findLastImportEnd(src);
    src =
      src.slice(0, importInsertIndex) +
      '\n' + FORMSTEST_IMPORT + '\n' +
      src.slice(importInsertIndex);
  }
  src = injectFormstestCollection(src);
  fs.writeFileSync(configPath, src, 'utf8');
  console.log(`[${PKG_NAME}] ✓ Registered FormsTest collection in config.`);
}

function injectFormstestCollection(src) {
  const collectionsRegex = /collections\s*:\s*\[([^\]]+)\]/;
  const match = collectionsRegex.exec(src);
  if (!match) return src;
  const inner = match[1].trimEnd();
  const trailing = inner.endsWith(',') ? ' ' : ', ';
  return src.replace(collectionsRegex, `collections: [${inner}${trailing}FormsTest]`);
}

function createFormBuilderFieldtest(consumerRoot) {
  const filePath = path.join(consumerRoot, FORMBUILDER_FIELDTEST_RELATIVE);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, FORMBUILDER_FIELDTEST_CONTENT, 'utf8');
  console.log(`[${PKG_NAME}] ✓ Created ${FORMBUILDER_FIELDTEST_RELATIVE}`);
}

function createFormstest(consumerRoot) {
  const filePath = path.join(consumerRoot, FORMSTEST_RELATIVE);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, FORMSTEST_CONTENT, 'utf8');
  console.log(`[${PKG_NAME}] ✓ Created ${FORMSTEST_RELATIVE}`);
}

function patchPayloadTypes(consumerRoot) {
  const typesPath = findPayloadTypes(consumerRoot);
  if (!typesPath) {
    return;
  }
  let src = fs.readFileSync(typesPath, 'utf8');
  if (src.includes('export interface FormTest')) {
    return;
  }
  src = src.trimEnd() + FORMTEST_INTERFACE_APPEND;
  fs.writeFileSync(typesPath, src, 'utf8');
  console.log(`[${PKG_NAME}] ✓ Registered FormTest in payload-types.ts`);
}

function runGenerateImportmap(consumerRoot) {
  const pkgPath = path.join(consumerRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const script = (pkg.scripts && pkg.scripts['generate:importmap']) || (pkg.scripts && pkg.scripts.generateImportmap);
  if (!script) return;
  try {
    const hasPnpm = fs.existsSync(path.join(consumerRoot, 'pnpm-lock.yaml'));
    const cmd = hasPnpm ? 'pnpm run generate:importmap' : 'npm run generate:importmap';
    execSync(cmd, { cwd: consumerRoot, stdio: 'inherit', windowsHide: true });
    console.log(`[${PKG_NAME}] ✓ Ran generate:importmap — FormBuilderFieldtest is in the import map.`);
  } catch (err) {
    console.warn(`[${PKG_NAME}] ⚠ Could not run generate:importmap. Run it manually: pnpm run generate:importmap`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the character index right after the last top-level import statement. */
function findLastImportEnd(src) {
  const importRegex = /^import\s.+$/gm;
  let lastIndex = 0;
  let match;
  while ((match = importRegex.exec(src)) !== null) {
    lastIndex = match.index + match[0].length;
  }
  return lastIndex;
}

/**
 * Insert `myProductsPlugin()` into the plugins array.
 *
 * Handles three shapes:
 *   plugins: [existingPlugin()]          → plugins: [existingPlugin(), myProductsPlugin()]
 *   plugins: []                          → plugins: [myProductsPlugin()]
 *   (no plugins key at all)              → adds `plugins: [myProductsPlugin()],` after buildConfig({
 */
function injectPlugin(src) {
  // Case A: plugins array with existing entries — append before closing bracket
  const withEntries = /plugins\s*:\s*\[([^\]]+)\]/;
  const matchA = withEntries.exec(src);
  if (matchA) {
    const inner = matchA[1].trimEnd();
    const trailing = inner.endsWith(',') ? ' ' : ', ';
    const replacement = `plugins: [${inner}${trailing}${PLUGIN_FN}()]`;
    return src.replace(withEntries, replacement);
  }

  // Case B: empty plugins array
  const empty = /plugins\s*:\s*\[\s*\]/;
  if (empty.test(src)) {
    return src.replace(empty, `plugins: [${PLUGIN_FN}()]`);
  }

  // Case C: no plugins key — insert after buildConfig({
  const buildCfg = /(buildConfig\s*\(\s*\{)/;
  if (buildCfg.test(src)) {
    return src.replace(buildCfg, `$1\n  plugins: [${PLUGIN_FN}()],`);
  }

  console.warn(`[${PKG_NAME}] ⚠ Could not locate plugins array or buildConfig() — please add ${PLUGIN_FN}() manually.`);
  return src;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const consumerRoot = findConsumerRoot() || process.cwd();
  console.log(`[${PKG_NAME}] Using consumer root: ${consumerRoot}`);

  const configPath = findPayloadConfig(consumerRoot);
  if (configPath) {
    patchConfig(configPath);
    patchFormstestInConfig(configPath);
    addRemoveScript(consumerRoot);
  } else {
    console.log(`[${PKG_NAME}] No payload.config found — skipping auto-patch.`);
  }

  createFormBuilderFieldtest(consumerRoot);
  createFormstest(consumerRoot);
  patchPayloadTypes(consumerRoot);
  runGenerateImportmap(consumerRoot);
}

main();
