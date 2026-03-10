/**
 * Runs after consumer installs this package (postinstall).
 * - Patches payload.config  (adds plugin + FormBuilder collection, slug forms, API /api/forms)
 * - Creates src/components/admin/FormBuilderField.tsx
 * - Creates src/collections/form-builder.ts
 * - Appends FormBuilder interface to payload-types.ts
 *
 * Each step is independent — one failure does not stop the rest.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const {
  PKG_SHORT,
  PLUGIN_FN,
  IMPORT_LINE,
  FORM_BUILDER_IMPORT,
  BACKUP_EXT,
  CREATED_FILES,
  readTemplate,
  findConsumerRoot,
  findPayloadConfig,
  findPayloadTypes,
  findLastImportEnd,
} = require('./helpers.cjs');

// ---------------------------------------------------------------------------
// payload.config patching
// ---------------------------------------------------------------------------

function patchConfig(configPath) {
  let src = fs.readFileSync(configPath, 'utf8');
  if (src.includes(PLUGIN_FN)) {
    console.log(`[${PKG_SHORT}] plugin already present — skipping config patch.`);
    return;
  }

  // Keep a backup so consumer can manually restore if needed
  fs.writeFileSync(configPath + BACKUP_EXT, src, 'utf8');

  const idx = findLastImportEnd(src);
  src = src.slice(0, idx) + '\n' + IMPORT_LINE + '\n' + src.slice(idx);
  src = injectPlugin(src);

  fs.writeFileSync(configPath, src, 'utf8');
  console.log(`[${PKG_SHORT}] Patched payload.config — added ${PLUGIN_FN}.`);
}

function patchFormBuilderInConfig(configPath) {
  let src = fs.readFileSync(configPath, 'utf8');
  if (src.includes("from './collections/form-builder'") && src.includes('FormBuilder')) return;

  if (!src.includes("from './collections/form-builder'")) {
    const idx = findLastImportEnd(src);
    src = src.slice(0, idx) + '\n' + FORM_BUILDER_IMPORT + '\n' + src.slice(idx);
  }

  src = injectFormBuilderCollection(src);
  fs.writeFileSync(configPath, src, 'utf8');
  console.log(`[${PKG_SHORT}] Registered FormBuilder collection in payload.config.`);
}

function injectPlugin(src) {
  const withEntries = /plugins\s*:\s*\[([^\]]+)\]/;
  const m = withEntries.exec(src);
  if (m) {
    const inner = m[1].trimEnd();
    return src.replace(withEntries, `plugins: [${inner}${inner.endsWith(',') ? ' ' : ', '}${PLUGIN_FN}()]`);
  }
  if (/plugins\s*:\s*\[\s*\]/.test(src))
    return src.replace(/plugins\s*:\s*\[\s*\]/, `plugins: [${PLUGIN_FN}()]`);
  if (/(buildConfig\s*\(\s*\{)/.test(src))
    return src.replace(/(buildConfig\s*\(\s*\{)/, `$1\n  plugins: [${PLUGIN_FN}()],`);
  console.warn(`[${PKG_SHORT}] Could not find plugins array — add ${PLUGIN_FN}() manually.`);
  return src;
}

function injectFormBuilderCollection(src) {
  const m = /collections\s*:\s*\[([^\]]+)\]/.exec(src);
  if (!m) return src;
  const inner = m[1].trimEnd();
  return src.replace(
    /collections\s*:\s*\[([^\]]+)\]/,
    `collections: [${inner}${inner.endsWith(',') ? ' ' : ', '}FormBuilder]`,
  );
}

// ---------------------------------------------------------------------------
// File creation from templates — always writes (safe to run multiple times)
// ---------------------------------------------------------------------------

function writeTemplateFile(consumerRoot, relativePath, templateFilename) {
  const filePath = path.join(consumerRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, readTemplate(templateFilename), 'utf8');
  console.log(`[${PKG_SHORT}] Created ${relativePath}`);
}

// ---------------------------------------------------------------------------
// payload-types.ts patching
// ---------------------------------------------------------------------------

function patchPayloadTypes(consumerRoot) {
  const typesPath = findPayloadTypes(consumerRoot);
  if (!typesPath) return;
  const src = fs.readFileSync(typesPath, 'utf8');
  if (src.includes('export interface FormBuilder')) return;
  fs.writeFileSync(typesPath, src.trimEnd() + '\n' + readTemplate('FormBuilder.interface.txt'), 'utf8');
  console.log(`[${PKG_SHORT}] Appended FormBuilder interface to payload-types.ts.`);
}

// ---------------------------------------------------------------------------
// Disable pnpm side effects cache in consumer's .npmrc so our postinstall
// always runs (pnpm skips postinstall for cached package versions by default).
// ---------------------------------------------------------------------------

function disablePnpmSideEffectsCache(consumerRoot) {
  const npmrcPath = path.join(consumerRoot, '.npmrc');
  const setting = 'side-effects-cache=false';

  if (fs.existsSync(npmrcPath)) {
    const content = fs.readFileSync(npmrcPath, 'utf8');
    if (content.includes('side-effects-cache')) return; // already configured
    fs.writeFileSync(npmrcPath, content.trimEnd() + '\n' + setting + '\n');
  } else {
    fs.writeFileSync(npmrcPath, setting + '\n');
  }
  console.log(`[${PKG_SHORT}] Added side-effects-cache=false to .npmrc`);
}

// ---------------------------------------------------------------------------
// Optional: regenerate importmap if consumer has that script
// ---------------------------------------------------------------------------

function runGenerateImportmap(consumerRoot) {
  const pkgPath = path.join(consumerRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts || !pkg.scripts['generate:importmap']) return;
  try {
    const pm = fs.existsSync(path.join(consumerRoot, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
    execSync(`${pm} run generate:importmap`, { cwd: consumerRoot, stdio: 'inherit', windowsHide: true });
  } catch {
    console.warn(`[${PKG_SHORT}] Could not run generate:importmap — run it manually.`);
  }
}

// ---------------------------------------------------------------------------
// Main — each step is independent
// ---------------------------------------------------------------------------

function main() {
  const consumerRoot = findConsumerRoot();
  if (!consumerRoot) {
    console.error(`[${PKG_SHORT}] ERROR: Could not find project root. Tried INIT_CWD="${process.env.INIT_CWD}" and walk-up.`);
    process.exitCode = 1;
    return;
  }
  console.log(`[${PKG_SHORT}] Installing into: ${consumerRoot}`);

  try {
    const configPath = findPayloadConfig(consumerRoot);
    if (configPath) {
      patchConfig(configPath);
      patchFormBuilderInConfig(configPath);
    } else {
      console.log(`[${PKG_SHORT}] No payload.config found — skipping config patch.`);
    }
  } catch (err) {
    console.error(`[${PKG_SHORT}] Config patch failed: ${err.message}`);
  }

  for (const [rel, tpl] of [
    [CREATED_FILES[0], 'FormBuilderField.tsx.txt'],
    [CREATED_FILES[1], 'form-builder.ts.txt'],
    [CREATED_FILES[2], 'formio.config.ts.txt'],
  ]) {
    try {
      writeTemplateFile(consumerRoot, rel, tpl);
    } catch (err) {
      console.error(`[${PKG_SHORT}] Could not create ${rel}: ${err.message}`);
    }
  }

  try {
    patchPayloadTypes(consumerRoot);
  } catch (err) {
    console.error(`[${PKG_SHORT}] payload-types patch failed: ${err.message}`);
  }

  try {
    runGenerateImportmap(consumerRoot);
  } catch (_) {}

  // Disable pnpm side effects cache so our postinstall always runs on re-install
  try {
    disablePnpmSideEffectsCache(consumerRoot);
  } catch (err) {
    console.error(`[${PKG_SHORT}] Could not update .npmrc: ${err.message}`);
  }
}

main();
