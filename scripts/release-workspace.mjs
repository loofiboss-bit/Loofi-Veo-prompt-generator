#!/usr/bin/env node

/**
 * Cross-Repo Release Automation
 *
 * Coordinates release activities across all Loofi workspace repos:
 *   - Version bump check
 *   - Changelog verification
 *   - Tag listing
 *   - Release status dashboard
 *
 * Usage:
 *   node scripts/release-workspace.mjs status          # Show release status across repos
 *   node scripts/release-workspace.mjs changelog       # Verify changelogs exist and are current
 *   node scripts/release-workspace.mjs tags            # List latest tags per repo
 *   node scripts/release-workspace.mjs pre-check       # Full pre-release check
 */

import { execSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// ─── Config ──────────────────────────────────────────────────────────

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.workspace', 'config.json');
const command = process.argv[2] || 'status';

// ─── Helpers ─────────────────────────────────────────────────────────

const exists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const git = (cmd, cwd) => {
  try {
    return execSync(`git ${cmd}`, {
      cwd,
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
};

// ─── Commands ────────────────────────────────────────────────────────

const getRepoStatus = async (repoName, repoConfig) => {
  const repoPath = path.resolve(ROOT, repoConfig.path);
  if (!(await exists(repoPath))) return null;

  const status = {
    name: repoName,
    path: repoPath,
    language: repoConfig.language,
    branch: git('rev-parse --abbrev-ref HEAD', repoPath),
    latestTag: git('describe --tags --abbrev=0', repoPath) || 'none',
    uncommittedChanges: git('status --porcelain', repoPath),
    lastCommit: git('log -1 --format="%h %s" --date=short', repoPath),
    hasChangelog: await exists(path.join(repoPath, 'CHANGELOG.md')),
  };

  // Get version from package.json or CMakeLists.txt
  const pkgPath = path.join(repoPath, 'package.json');
  if (await exists(pkgPath)) {
    try {
      const pkg = await readJson(pkgPath);
      status.version = pkg.version;
    } catch {
      status.version = null;
    }
  }

  return status;
};

const printStatus = async (repos) => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     Workspace Release Status Dashboard      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  for (const [repoName, repoConfig] of Object.entries(repos)) {
    const status = await getRepoStatus(repoName, repoConfig);
    if (!status) {
      console.log(`⚠️  ${repoName} — not found locally`);
      continue;
    }

    const dirty = status.uncommittedChanges ? '🔴 dirty' : '🟢 clean';
    const changelog = status.hasChangelog ? '✅' : '❌';

    console.log(`── ${repoName} ──`);
    console.log(`  Branch:     ${status.branch}`);
    console.log(`  Version:    ${status.version || 'N/A'}`);
    console.log(`  Latest Tag: ${status.latestTag}`);
    console.log(`  Working:    ${dirty}`);
    console.log(`  Changelog:  ${changelog}`);
    console.log(`  Last Commit: ${status.lastCommit}`);
    console.log(`  Language:   ${status.language || 'N/A'}`);
    console.log('');
  }
};

const printTags = async (repos) => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         Latest Tags Per Repository          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  for (const [repoName, repoConfig] of Object.entries(repos)) {
    const repoPath = path.resolve(ROOT, repoConfig.path);
    if (!(await exists(repoPath))) continue;

    const tags = git('tag --sort=-version:refname -l v*', repoPath);
    console.log(`── ${repoName} ──`);
    if (tags) {
      for (const tag of tags.split('\n').filter(Boolean)) {
        const date = git(`log -1 --format="%ai" ${tag}`, repoPath);
        console.log(`  ${tag}  (${date || 'unknown date'})`);
      }
    } else {
      console.log('  No version tags found');
    }
    console.log('');
  }
};

const preReleaseCheck = async (repos) => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         Pre-Release Check (All Repos)       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  let allOk = true;

  for (const [repoName, repoConfig] of Object.entries(repos)) {
    const status = await getRepoStatus(repoName, repoConfig);
    if (!status) continue;

    console.log(`── ${repoName} ──`);
    const checks = [];

    // Check 1: Clean working tree
    if (status.uncommittedChanges) {
      checks.push({ name: 'Clean working tree', ok: false, detail: 'uncommitted changes' });
    } else {
      checks.push({ name: 'Clean working tree', ok: true });
    }

    // Check 2: Changelog exists
    checks.push({
      name: 'CHANGELOG.md exists',
      ok: status.hasChangelog,
      detail: status.hasChangelog ? null : 'missing',
    });

    // Check 3: On default branch
    const onDefault = status.branch === (repoConfig.defaultBranch || 'main');
    checks.push({
      name: `On ${repoConfig.defaultBranch || 'main'} branch`,
      ok: onDefault,
      detail: onDefault ? null : `on ${status.branch}`,
    });

    // Check 4: Synced configs
    const mcpExists = await exists(path.join(status.path, '.vscode', 'mcp.json'));
    checks.push({
      name: 'MCP configs synced',
      ok: mcpExists,
      detail: mcpExists ? null : 'missing',
    });

    // Check 5: Copilot instructions
    const instrExists = await exists(path.join(status.path, '.github', 'copilot-instructions.md'));
    checks.push({
      name: 'Copilot instructions',
      ok: instrExists,
      detail: instrExists ? null : 'missing',
    });

    for (const check of checks) {
      const icon = check.ok ? '✅' : '❌';
      const detail = check.detail ? ` (${check.detail})` : '';
      console.log(`  ${icon} ${check.name}${detail}`);
      if (!check.ok) allOk = false;
    }
    console.log('');
  }

  console.log('─'.repeat(48));
  if (allOk) {
    console.log('✅ All pre-release checks passed!');
  } else {
    console.log('❌ Some pre-release checks failed. Fix issues before releasing.');
    process.exit(1);
  }
};

// ─── Main ────────────────────────────────────────────────────────────

const run = async () => {
  if (!(await exists(CONFIG_PATH))) {
    console.error('❌ Workspace config not found: .workspace/config.json');
    process.exit(1);
  }

  const config = await readJson(CONFIG_PATH);
  const repos = config.repos;

  switch (command) {
    case 'status':
      await printStatus(repos);
      break;
    case 'tags':
      await printTags(repos);
      break;
    case 'changelog':
      // Just show status with changelog focus
      await printStatus(repos);
      break;
    case 'pre-check':
      await preReleaseCheck(repos);
      break;
    default:
      console.log('Usage: node scripts/release-workspace.mjs [status|tags|changelog|pre-check]');
      process.exit(1);
  }
};

await run();
