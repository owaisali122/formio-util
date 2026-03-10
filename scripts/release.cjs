const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');

// Optional: set version from first argument (e.g. pnpm run publish -- 1.0.1)
const requestedVersion = process.argv[2];
if (requestedVersion) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = requestedVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('version set to', requestedVersion);
}

// 1. Set name to publishScope/kolea-cms-formio-builder for publishing (see package.json publishScope)
require('./prepublish-name.cjs');

let exitCode = 0;
try {
  // 2. Publish to GitHub Packages (runs once)
  execSync('npm publish --ignore-scripts', { cwd: root, stdio: 'inherit' });
} catch (err) {
  exitCode = err.status ?? 1;
} finally {
  // 3. Restore name to kolea-cms-formio-builder for local/link (root, no scope)
  require('./postpublish-name.cjs');
  if (exitCode !== 0) process.exit(exitCode);
}

