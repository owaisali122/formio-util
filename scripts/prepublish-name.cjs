const fs = require('fs');
const path = require('path');
const { getPublishName, getPublishScope } = require('./publish-config.cjs');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const publishName = getPublishName();
if (!getPublishScope()) {
  console.warn('prepublish: publishScope not set in package.json (or NPM_PUBLISH_SCOPE). Publishing with unscoped name:', publishName);
}
pkg.name = publishName;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('prepublish: name set to', publishName, 'for publishing');

