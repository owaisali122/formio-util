const fs = require('fs');
const path = require('path');
const { PKG_NAME_UNSCOPED } = require('./publish-config.cjs');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.name = PKG_NAME_UNSCOPED;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('postpublish: name restored to', PKG_NAME_UNSCOPED, 'for local/link');
