const fs = require('fs');
const path = require('path');

/**
 * Copy the project package.json into resources/runtime.
 * It cannot live in extraResources filters as "package.json" — electron-builder
 * treats those patterns as excludes for the app asar, which drops app/package.json.
 */
exports.default = async function afterPack(context) {
  const projectDir = context.packager.projectDir;
  const runtimeDir = path.join(context.appOutDir, 'resources', 'runtime');
  const src = path.join(projectDir, 'package.json');
  const dest = path.join(runtimeDir, 'package.json');

  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);

  const nextBin = path.join(runtimeDir, 'web', 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!fs.existsSync(nextBin)) {
    throw new Error(
      `Packaged Next binary missing at ${nextBin}. ` +
        'Check electron-builder.yml filters (do not exclude node_modules/*/dist).'
    );
  }
};
