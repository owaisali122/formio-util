const fs = require('fs');
const path = require('path');

const PKG_SHORT = 'kolea-shared-package';
const PLUGIN_FN = 'formBuilderPlugin';
const IMPORT_LINE = `import { ${PLUGIN_FN} } from '${PKG_SHORT}/payload'`;
const FORM_BUILDER_IMPORT = "import { Forms as FormBuilder } from './collections/form-builder'";
const BACKUP_EXT = '.kolea-backup';

const CREATED_FILES = [
  path.join('src', 'components', 'admin', 'FormBuilderField.tsx'),
  path.join('src', 'collections', 'form-builder.ts'),
  path.join('src', 'config', 'formio.ts'),
];

function readTemplate(filename) {
  return fs.readFileSync(path.join(__dirname, 'templates', filename), 'utf8');
}


/**
 * Find the consumer project root (the directory that ran "pnpm add").
 * 1) INIT_CWD — set by pnpm/npm to the project root.
 * 2) Walk up from this package, skip node_modules / .pnpm paths.
 */
function findConsumerRoot() {
  const initCwd = process.env.INIT_CWD;
  if (initCwd && fs.existsSync(path.join(initCwd, 'package.json'))) return initCwd;

  let dir = path.dirname(__dirname);
  const rootDir = path.parse(dir).root;
  for (let i = 0; i < 25; i++) {
    if (dir === rootDir) break;
    const norm = path.normalize(dir).replace(/\\/g, '/');
    const inStore = /(^|\/)node_modules(\/|$)/.test(norm) || /\.pnpm(\/|$)/.test(norm);
    if (!inStore && fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

const CONFIG_CANDIDATES = [
  ['src', 'payload.config.ts'],
  ['src', 'payload.config.js'],
  ['payload.config.ts'],
  ['payload.config.js'],
  ['src', 'payload', 'payload.config.ts'],
  ['src', 'payload', 'payload.config.js'],
  ['apps', 'cms', 'src', 'payload.config.ts'],
  ['apps', 'cms', 'src', 'payload.config.js'],
];

function findPayloadConfig(root) {
  for (const segments of CONFIG_CANDIDATES) {
    const p = path.join(root, ...segments);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findPayloadTypes(root) {
  for (const rel of ['src/payload-types.ts', 'payload-types.ts']) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findLastImportEnd(src) {
  const importRegex = /^import\s.+$/gm;
  let lastIndex = 0;
  let match;
  while ((match = importRegex.exec(src)) !== null) {
    lastIndex = match.index + match[0].length;
  }
  return lastIndex;
}

module.exports = {
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
};
