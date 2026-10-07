import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const targetFile = path.resolve(process.argv[2] || 'artifacts/sbom.cdx.json');
const targetDir = path.dirname(targetFile);
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

function tryCommand(cmd) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 20 * 1024 * 1024,
    });
    if (output && output.includes('CycloneDX') && output.includes('components')) {
      return output;
    }
  } catch {
    // continue fallback
  }
  return null;
}

let sbomContent = tryCommand('npm sbom --sbom-format cyclonedx');
if (!sbomContent) {
  sbomContent = tryCommand('npm sbom --omit=dev --sbom-format cyclonedx');
}
if (!sbomContent) {
  sbomContent = tryCommand('npm sbom --package-lock-only --sbom-format cyclonedx');
}

if (!sbomContent) {
  console.log('Generating structured fallback CycloneDX SBOM from lockfile...');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const components = [];

  for (const [key, val] of Object.entries(lock.packages || {})) {
    if (key === '' || !val.version) continue;
    const name = key.replace(/^(?:.*\/)?node_modules\//, '');
    components.push({
      type: 'library',
      name,
      version: val.version,
      purl: `pkg:npm/${name}@${val.version}`,
      scope: val.dev ? 'optional' : 'required',
    });
  }

  const fallbackSbom = {
    $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'npm', name: 'cli' }],
      component: {
        'bom-ref': `${pkg.name}@${pkg.version}`,
        type: 'application',
        name: pkg.name,
        version: pkg.version,
      },
    },
    components,
  };
  sbomContent = JSON.stringify(fallbackSbom, null, 2);
}

writeFileSync(targetFile, sbomContent, 'utf8');
const size = statSync(targetFile).size;
console.log(`Generated SBOM at ${targetFile} (${size} bytes)`);
