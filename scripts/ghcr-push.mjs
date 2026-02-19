#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const TOKEN_ENV_VARS = ['GHCR_TOKEN', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'CR_PAT', 'GH_TOKEN', 'GITHUB_TOKEN'];
const DEFAULT_IMAGE = 'ghcr.io/loofitheboss/loofi-veo-prompt-generator-veo-generator:latest';

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return undefined;
  }
  return process.argv[index + 1];
};

const getImageOwner = (image) => {
  const parts = image.split('/');
  if (parts.length < 2) {
    return undefined;
  }
  return parts[1];
};

const getToken = () => {
  for (const varName of TOKEN_ENV_VARS) {
    const value = process.env[varName];
    if (value) {
      return value;
    }
  }
  return undefined;
};

const printHelp = () => {
  console.log('Usage: node scripts/ghcr-push.mjs [--image <ref>] [--username <user>]');
  console.log('');
  console.log(`Default image: ${DEFAULT_IMAGE}`);
  console.log(`Token env vars (first found wins): ${TOKEN_ENV_VARS.join(', ')}`);
};

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

const image = getArgValue('--image') ?? DEFAULT_IMAGE;
const username = getArgValue('--username') ?? process.env.GHCR_USERNAME ?? process.env.GITHUB_ACTOR ?? getImageOwner(image);
const token = getToken();

if (!username) {
  console.error('❌ Could not determine GHCR username. Pass --username or set GHCR_USERNAME.');
  process.exit(1);
}

if (!token) {
  console.error(`❌ No token found. Set one of: ${TOKEN_ENV_VARS.join(', ')}`);
  process.exit(1);
}

const auth = Buffer.from(`${username}:${token}`, 'utf8').toString('base64');
const dockerAuthConfig = JSON.stringify({ auths: { 'ghcr.io': { auth } } });

console.log(`🚀 Pushing image: ${image}`);
console.log(`👤 GHCR user: ${username}`);

const push = spawnSync('docker', ['image', 'push', image], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DOCKER_AUTH_CONFIG: dockerAuthConfig,
  },
});

if (push.error) {
  console.error(`❌ Failed to run docker: ${push.error.message}`);
  process.exit(1);
}

if ((push.status ?? 1) !== 0) {
  process.exit(push.status ?? 1);
}

console.log('✅ GHCR push completed.');
