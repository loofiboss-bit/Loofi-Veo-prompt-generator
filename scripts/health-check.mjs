#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const fixMode = process.argv.includes('--fix');

let errors = 0;
let warnings = 0;
let checks = 0;

const exists = async (relativePath) => {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

const pass = (message) => {
  checks += 1;
  console.log(`  ✅ ${message}`);
};

const fail = (message) => {
  checks += 1;
  errors += 1;
  console.log(`  ❌ ${message}`);
};

const warn = (message) => {
  checks += 1;
  warnings += 1;
  console.log(`  ⚠️  ${message}`);
};

const runCmd = (command) => {
  try {
    execSync(command, { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const run = async () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   AI Infrastructure Health Check             ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(
    `║   Mode: ${fixMode ? 'FIX (auto-repair)'.padEnd(36, ' ') : 'CHECK (read-only)'.padEnd(36, ' ')}║`,
  );
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  console.log('── 1. Core Instruction Files ──');
  const coreFiles = [
    '.ai/INSTRUCTIONS.md',
    '.ai/WORKFLOW.md',
    '.ai/AGENT_SPECS.md',
    '.ai/DECISIONS.md',
    '.ai/ROADMAP.md',
    '.ai/ONBOARDING.md',
    '.ai/mcp-servers.json',
    'AGENTS.md',
    'CLAUDE.md',
    'CODEX.md',
    'CHATGPT.md',
    '.github/copilot-instructions.md',
  ];

  for (const file of coreFiles) {
    (await exists(file)) ? pass(file) : fail(`Missing: ${file}`);
  }
  console.log('');

  console.log('── 2. Agent Definitions ──');
  const agents = [
    'project-coordinator',
    'architecture-advisor',
    'backend-builder',
    'frontend-integration-builder',
    'code-implementer',
    'test-writer',
    'release-planner',
  ];

  for (const agent of agents) {
    (await exists(`.ai/agents/${agent}.md`))
      ? pass(`.ai/agents/${agent}.md`)
      : fail(`Missing source: .ai/agents/${agent}.md`);
    (await exists(`.claude/agents/${agent}.md`))
      ? pass(`.claude/agents/${agent}.md`)
      : fail(`Missing: .claude/agents/${agent}.md`);
    (await exists(`.chatgpt/agents/${agent}.md`))
      ? pass(`.chatgpt/agents/${agent}.md`)
      : fail(`Missing: .chatgpt/agents/${agent}.md`);
  }
  console.log('');

  console.log('── 3. Platform Settings ──');
  for (const file of ['.claude/settings.json', '.chatgpt/settings.json']) {
    (await exists(file)) ? pass(file) : fail(`Missing: ${file}`);
  }
  console.log('');

  console.log('── 4. MCP Config Sync ──');
  if (runCmd('npm run mcp:check')) {
    pass('All MCP configs in sync');
  } else if (fixMode) {
    runCmd('npm run mcp:sync');
    warn('MCP configs were out of sync — auto-fixed');
  } else {
    fail('MCP configs out of sync (run: npm run mcp:sync)');
  }
  console.log('');

  console.log('── 5. Agent Config Drift ──');
  if (runCmd('npm run agents:check')) {
    pass('Agent configs in sync');
  } else if (fixMode) {
    runCmd('npm run agents:sync');
    warn('Agent configs were out of sync — auto-fixed');
  } else {
    fail('Agent configs out of sync (run: npm run agents:sync)');
  }
  console.log('');

  console.log('── 6. Skills ──');
  const skillDirs = [
    '.claude/skills/verify',
    '.claude/skills/new-feature',
    '.claude/skills/refactor',
    '.copilot/skills/verify',
    '.copilot/skills/new-feature',
    '.copilot/skills/refactor',
    '.codex/skills/validate',
    '.codex/skills/implement',
    '.codex/skills/test',
  ];

  for (const dir of skillDirs) {
    (await exists(`${dir}/SKILL.md`)) ? pass(`${dir}/SKILL.md`) : fail(`Missing: ${dir}/SKILL.md`);
  }
  console.log('');

  console.log('── 7. CI/CD Workflows ──');
  for (const workflow of [
    '.github/workflows/validate.yml',
    '.github/workflows/build.yml',
    '.github/workflows/auto-label.yml',
  ]) {
    (await exists(workflow)) ? pass(workflow) : warn(`Missing: ${workflow}`);
  }
  console.log('');

  console.log('── 8. Git Hooks ──');
  for (const hook of ['.husky/pre-commit', '.husky/commit-msg']) {
    (await exists(hook)) ? pass(hook) : fail(`Missing: ${hook}`);
  }
  (await exists('commitlint.config.js'))
    ? pass('commitlint.config.js')
    : fail('Missing: commitlint.config.js');
  console.log('');

  console.log('── 9. Automation Scripts ──');
  const scripts = [
    'scripts/validate-agent-config.mjs',
    'scripts/generate-agent-configs.mjs',
    'scripts/sync-mcp-configs.mjs',
    'scripts/sync-version.mjs',
    'scripts/lint-changed-strict.mjs',
    'scripts/lint-ci.mjs',
  ];

  for (const script of scripts) {
    (await exists(script)) ? pass(script) : fail(`Missing: ${script}`);
  }
  console.log('');

  console.log('── 10. Version Consistency ──');
  const versionOk = runCmd(
    "node -e \"const pkg=require('./package.json').version; const meta=require('./metadata.json').version; const manifest=require('./manifest.json').version; process.exit(pkg===meta&&pkg===manifest?0:1);\"",
  );
  if (versionOk) {
    const version = execSync('node -e "console.log(require(\'./package.json\').version)"', {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    pass(`All versions match: ${version}`);
  } else {
    fail('Version mismatch: package.json, metadata.json, manifest.json');
  }
  console.log('');

  console.log('═══════════════════════════════════════════════');
  console.log(
    `  Checks: ${checks}  |  Passed: ${checks - errors - warnings}  |  Warnings: ${warnings}  |  Errors: ${errors}`,
  );
  console.log('═══════════════════════════════════════════════');

  if (errors > 0) {
    console.log('');
    console.log(`❌ Health check FAILED with ${errors} error(s).`);
    if (!fixMode) {
      console.log('   Try: npm run health:fix');
    }
    process.exit(1);
  }

  console.log('');
  console.log('✅ AI infrastructure is healthy!');
};

await run();
