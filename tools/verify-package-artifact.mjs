import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [, , packageDirArg] = process.argv;

if (!packageDirArg) {
  throw new Error('Usage: bun tools/verify-package-artifact.mjs <package-dir>');
}

const packageDir = resolve(packageDirArg);
const packageJsonPath = join(packageDir, 'package.json');

if (!existsSync(packageJsonPath)) {
  throw new Error(`Missing package.json in ${packageDir}`);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

if (packageJson.name !== '@cacic-fct/ngx-umami') {
  throw new Error(`Unexpected package name: ${packageJson.name}`);
}

if (packageJson.private) {
  throw new Error('Package artifact must not be private.');
}

if (packageJson.publishConfig?.registry !== 'https://registry.npmjs.org') {
  throw new Error(`Package must publish to npm. Found: ${packageJson.publishConfig?.registry}`);
}

if (packageJson.publishConfig?.access !== 'public') {
  throw new Error(`Package must publish publicly. Found: ${packageJson.publishConfig?.access}`);
}

const expectedPeerDependencies = {
  '@angular/common': '>=17.0.0',
  '@angular/core': '>=17.0.0',
  '@angular/router': '>=17.0.0',
};

for (const [name, range] of Object.entries(expectedPeerDependencies)) {
  if (packageJson.peerDependencies?.[name] !== range) {
    throw new Error(`Expected peer dependency ${name}@${range}. Found: ${packageJson.peerDependencies?.[name]}`);
  }
}

if (packageJson.peerDependenciesMeta?.['@angular/router']?.optional !== true) {
  throw new Error('@angular/router must be marked as an optional peer dependency.');
}

const requiredFiles = [
  'fesm2022/cacic-fct-ngx-umami.mjs',
  'types/cacic-fct-ngx-umami.d.ts',
];

const forbiddenFiles = [
  'angular.json',
  'projects/ngx-umami/src/public-api.ts',
  'node_modules/@angular/core/package.json',
  'coverage/ngx-umami/index.html',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(join(packageDir, file)));
if (missingFiles.length > 0) {
  throw new Error(`Package artifact is missing required files: ${missingFiles.join(', ')}`);
}

const presentForbiddenFiles = forbiddenFiles.filter((file) => existsSync(join(packageDir, file)));
if (presentForbiddenFiles.length > 0) {
  throw new Error(`Package artifact contains source/project files: ${presentForbiddenFiles.join(', ')}`);
}

console.log(`Verified ${packageJson.name}@${packageJson.version} in ${packageDir}`);
