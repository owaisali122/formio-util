/**
 * Reverts all changes made by the package: config, payload-types, created files.
 * Run before uninstalling: pnpm run kolea-cms-formio-builder:remove
 */

const fs = require('fs');
const path = require('path');

const PKG_SHORT = 'kolea-cms-formio-builder';
const BACKUP_EXT = '.kolea-backup';
const REMOVE_SCRIPT_KEY = 'kolea-cms-formio-builder:remove';
const FORMBUILDER_FIELDTEST_RELATIVE = path.join('src', 'components', 'admin', 'FormBuilderFieldtest.tsx');
const FORMSTEST_RELATIVE = path.join('src', 'collections', 'Formstest.ts');

function findConsumerRoot() {
  let dir = path.dirname(__dirname);
  const rootDir = path.parse(dir).root;
  for (let i = 0; i < 20; i++) {
    if (dir === rootDir) break;
    const hasPkg = fs.existsSync(path.join(dir, 'package.json'));
    const hasNodeModules = fs.existsSync(path.join(dir, 'node_modules'));
    if (hasPkg && hasNodeModules) {
      const usHere = fs.existsSync(path.join(dir, 'node_modules', 'kolea-cms-formio-builder'))
        || fs.existsSync(path.join(dir, 'node_modules', '@owaisali122', 'kolea-cms-formio-builder'));
      if (usHere) return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function findPayloadConfig(root) {
  const candidates = [
    path.join(root, 'src', 'payload.config.ts'),
    path.join(root, 'src', 'payload.config.js'),
    path.join(root, 'payload.config.ts'),
    path.join(root, 'payload.config.js'),
    path.join(root, 'src', 'payload', 'payload.config.ts'),
    path.join(root, 'src', 'payload', 'payload.config.js'),
    path.join(root, 'payload', 'payload.config.ts'),
    path.join(root, 'payload', 'payload.config.js'),
    path.join(root, 'apps', 'cms', 'src', 'payload.config.ts'),
    path.join(root, 'apps', 'cms', 'src', 'payload.config.js'),
    path.join(root, 'apps', 'cms', 'payload.config.ts'),
    path.join(root, 'apps', 'cms', 'payload.config.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
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

function revertConfig(configPath) {
  const backupPath = configPath + BACKUP_EXT;
  if (fs.existsSync(backupPath)) {
    const original = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(configPath, original, 'utf8');
    fs.unlinkSync(backupPath);
    console.log(`[${PKG_SHORT}] ✓ Reverted payload.config from backup.`);
    return;
  }
  // No backup — strip our changes in place
  let src = fs.readFileSync(configPath, 'utf8');
  const hasOurChanges = src.includes('myProductsPlugin') || src.includes("from './collections/Formstest'");
  if (!hasOurChanges) return;
  // Remove plugin import
  src = src.replace(/\n?import\s*\{\s*myProductsPlugin\s*\}\s*from\s*['"]kolea-cms-formio-builder\/payload['"]\s*;?\n?/g, '\n');
  // Remove myProductsPlugin() from plugins array
  src = src.replace(/,?\s*myProductsPlugin\(\)\s*,?/g, (m) => (m.trim() === ',' ? '' : ''));
  src = src.replace(/\[\s*myProductsPlugin\(\)\s*\]/g, '[]');
  // Remove Formstest import
  src = src.replace(/\n?import\s*\{\s*Forms\s+as\s+FormsTest\s*\}\s*from\s*['"]\.\/collections\/Formstest['"]\s*;?\n?/g, '\n');
  // Remove FormsTest from collections array
  src = src.replace(/,?\s*FormsTest\s*,?/g, (m) => (m.trim() === ',' ? '' : ''));
  src = src.replace(/\[\s*FormsTest\s*\]/g, '[]');
  fs.writeFileSync(configPath, src, 'utf8');
  console.log(`[${PKG_SHORT}] ✓ Removed our changes from payload.config.`);
}

function revertPayloadTypes(typesPath) {
  let src = fs.readFileSync(typesPath, 'utf8');
  const marker = '/** Added by kolea-cms-formio-builder';
  const idx = src.indexOf(marker);
  if (idx === -1) return;
  const endIdx = src.indexOf('}\n', idx) + 2;
  if (endIdx <= 1) return;
  src = src.slice(0, idx).trimEnd() + '\n';
  fs.writeFileSync(typesPath, src, 'utf8');
  console.log(`[${PKG_SHORT}] ✓ Removed FormTest interface from payload-types.ts.`);
}

function removeCreatedFiles(consumerRoot) {
  const files = [FORMBUILDER_FIELDTEST_RELATIVE, FORMSTEST_RELATIVE];
  for (const rel of files) {
    const filePath = path.join(consumerRoot, rel);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[${PKG_SHORT}] ✓ Removed ${rel}`);
    }
  }
}

function removeRemoveScript(consumerRoot) {
  const pkgPath = path.join(consumerRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts || !pkg.scripts[REMOVE_SCRIPT_KEY]) return;
  delete pkg.scripts[REMOVE_SCRIPT_KEY];
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[${PKG_SHORT}] ✓ Removed script from package.json.`);
}

function main() {
  const consumerRoot = findConsumerRoot() || process.cwd();
  console.log(`[${PKG_SHORT}] Uninstall patch — reverting in: ${consumerRoot}`);

  const configPath = findPayloadConfig(consumerRoot);
  if (configPath) revertConfig(configPath);

  const typesPath = findPayloadTypes(consumerRoot);
  if (typesPath) revertPayloadTypes(typesPath);

  removeCreatedFiles(consumerRoot);
  removeRemoveScript(consumerRoot);
  console.log(`[${PKG_SHORT}] ✓ Cleanup done. Package will be removed by pnpm.`);
}

main();
