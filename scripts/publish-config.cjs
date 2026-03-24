/**
 * Central config for the published package name (scope + name).
 *
 * Where the scope comes from (first wins):
 * 1. package.json → "publishScope": "@your-org"   (main place; set this when you move repo to client)
 * 2. Environment   → NPM_PUBLISH_SCOPE=@your-org   (optional; e.g. in CI you set this in workflow env/secrets)
 *
 * You set both yourself; nothing provides NPM_PUBLISH_SCOPE automatically.
 */
const path = require('path');
const fs = require('fs');

const PKG_NAME_UNSCOPED = 'kolea-shared-package';
const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');

function getPublishScope() {
  const fromEnv = process.env.NPM_PUBLISH_SCOPE;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const scope = (pkg.publishScope || '').trim();
    return scope || null;
  } catch {
    return null;
  }
}

function getPublishName() {
  const scope = getPublishScope();
  if (scope) return `${scope}/${PKG_NAME_UNSCOPED}`;
  return PKG_NAME_UNSCOPED;
}

function getScopeForResolution() {
  const scope = getPublishScope();
  return scope || null;
}

module.exports = {
  PKG_NAME_UNSCOPED,
  getPublishScope,
  getPublishName,
  getScopeForResolution,
};
