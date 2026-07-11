#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const readJson = async (relativePath) => {
  const content = await readFile(path.join(root, relativePath), 'utf8');
  return JSON.parse(content);
};

const exists = async (relativePath) => {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

const runQuiet = (command) => {
  try {
    execSync(command, {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 200 * 1024 * 1024,
    });
    return true;
  } catch (error) {
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim();
    if (output) {
      console.error(output.slice(-12_000));
    }
    return false;
  }
};

const hasGitChanges = () => {
  try {
    const output = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
    return output.trim().length > 0;
  } catch {
    return false;
  }
};

let errors = 0;
let warnings = 0;

const fail = (message) => {
  console.log(`  ❌ ${message}`);
  errors += 1;
};

const pass = (message) => {
  console.log(`  ✅ ${message}`);
};

const warn = (message) => {
  console.log(`  ⚠️  ${message}`);
  warnings += 1;
};

const run = async () => {
  const packageJson = await readJson('package.json');
  const version = packageJson.version;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║        Pre-Release Validation            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`Version: ${version}`);
  console.log('');

  console.log('── 1. Version Consistency ──');
  const pkgVersion = packageJson.version;
  console.log(`  package.json: ${pkgVersion}`);

  if (await exists('metadata.json')) {
    const metadata = await readJson('metadata.json');
    console.log(`  metadata.json: ${metadata.version}`);
    if (pkgVersion !== metadata.version) {
      fail(`Version mismatch: package.json (${pkgVersion}) != metadata.json (${metadata.version})`);
    }
  } else {
    warn('metadata.json not found');
  }

  if (await exists('manifest.json')) {
    const manifest = await readJson('manifest.json');
    console.log(`  manifest.json: ${manifest.version}`);
    if (pkgVersion !== manifest.version) {
      fail(`Version mismatch: package.json (${pkgVersion}) != manifest.json (${manifest.version})`);
    }
  } else {
    warn('manifest.json not found');
  }

  if (await exists('sw.js')) {
    const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
    const match = sw.match(/const CACHE_NAME = 'veo-prompt-generator-v([^']+)'/);
    if (!match) {
      warn('sw.js cache version not found');
    } else {
      console.log(`  sw.js cache: ${match[1]}`);
      if (pkgVersion !== match[1]) {
        fail(`Version mismatch: package.json (${pkgVersion}) != sw.js cache (${match[1]})`);
      }
    }
  } else {
    warn('sw.js not found');
  }
  console.log('');

  console.log('── 2. CHANGELOG ──');
  const changelog = await readFile(path.join(root, 'CHANGELOG.md'), 'utf8');
  const cleanVersion = version.replace(/-beta.*/, '').replace(/-alpha.*/, '');
  if (changelog.includes(`[${cleanVersion}]`) || changelog.includes(`[${version}]`)) {
    pass(`CHANGELOG.md has entry for ${version}`);
  } else {
    fail(`CHANGELOG.md missing entry for ${version}`);
  }
  console.log('');

  console.log('── 3. Lint (strict) ──');
  runQuiet('npm run lint:ci') ? pass('Lint passed (zero warnings)') : fail('Lint failed');
  console.log('');

  console.log('── 4. Type Check ──');
  runQuiet('npm run typecheck') ? pass('TypeScript check passed') : fail('TypeScript check failed');
  console.log('');

  console.log('── 5. Tests + Coverage Gates ──');
  runQuiet('npm run test:ci')
    ? pass('Tests passed with coverage gates')
    : fail('Tests/coverage gates failed');
  console.log('');

  console.log('── 6. Format Check ──');
  runQuiet('npm run format:check')
    ? pass('Formatting consistent')
    : fail('Formatting inconsistent — run: npm run format');
  console.log('');

  console.log('── 7. Build ──');
  runQuiet('npm run build') ? pass('Build succeeded') : fail('Build failed');
  console.log('');

  console.log('── 8. Fedora/RHEL RPM Metadata ──');
  runQuiet('npm run package:rpm:check')
    ? pass('RPM dependency metadata is valid')
    : fail('RPM dependency metadata is invalid');
  console.log('');

  console.log('── 9. Optional E2E Smoke ──');
  if (process.env.PRE_RELEASE_E2E === '1') {
    runQuiet('npm run test:e2e') ? pass('E2E smoke tests passed') : fail('E2E smoke tests failed');
  } else {
    warn('E2E smoke tests skipped (set PRE_RELEASE_E2E=1 to enable)');
  }
  console.log('');

  console.log('── 10. Git Status ──');
  hasGitChanges() ? warn('Uncommitted changes detected') : pass('Working tree clean');
  console.log('');

  console.log('══════════════════════════════════════════');
  if (errors === 0) {
    console.log(`✅ RELEASE READY (${warnings} warnings)`);
    console.log('');
    console.log('Next steps:');
    console.log(`  git commit -m "chore(release): v${version}"`);
    console.log(`  git tag v${version}`);
    console.log('  git push origin main --tags');
  } else {
    console.log(`❌ NOT READY: ${errors} errors, ${warnings} warnings`);
    console.log('Fix all errors before releasing.');
  }
  console.log('══════════════════════════════════════════');

  process.exit(errors);
};

await run();
