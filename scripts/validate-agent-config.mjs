#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const AGENTS = [
  'project-coordinator',
  'architecture-advisor',
  'backend-builder',
  'frontend-integration-builder',
  'code-implementer',
  'test-writer',
  'release-planner',
];

const AI_FILES = [
  '.ai/INSTRUCTIONS.md',
  '.ai/WORKFLOW.md',
  '.ai/AGENT_SPECS.md',
  '.ai/DECISIONS.md',
  '.ai/ONBOARDING.md',
  '.ai/ROADMAP.md',
  '.ai/model-versions.json',
];

const SHIMS = ['CLAUDE.md', 'CHATGPT.md', 'CODEX.md', '.github/copilot-instructions.md'];

const exists = async (relativePath) => {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

const fileContains = async (relativePath, pattern) => {
  try {
    const content = await readFile(path.join(root, relativePath), 'utf8');
    return pattern.test(content);
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
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      Agent Configuration Validator       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  console.log('── 1. Source Agent Files (.ai/agents/) ──');
  for (const agent of AGENTS) {
    const file = `.ai/agents/${agent}.md`;
    (await exists(file)) ? pass(`${agent}.md`) : fail(`Missing source: ${file}`);
  }
  console.log('');

  console.log('── 2. Claude Agent Files (.claude/agents/) ──');
  for (const agent of AGENTS) {
    const file = `.claude/agents/${agent}.md`;
    (await exists(file)) ? pass(`${agent}.md`) : fail(`Missing: ${file}`);
  }
  console.log('');

  console.log('── 3. ChatGPT Agent Files (.chatgpt/agents/) ──');
  for (const agent of AGENTS) {
    const file = `.chatgpt/agents/${agent}.md`;
    (await exists(file)) ? pass(`${agent}.md`) : fail(`Missing: ${file}`);
  }
  console.log('');

  console.log('── 4. Duplicate Check ──');
  let duplicateCount = 0;
  for (const agent of AGENTS) {
    const claudeDupe = `.claude/${agent}.md`;
    const chatgptDupe = `.chatgpt/${agent}.md`;
    if (await exists(claudeDupe)) {
      fail(`Duplicate found: ${claudeDupe} (canonical: .claude/agents/${agent}.md)`);
      duplicateCount += 1;
    }
    if (await exists(chatgptDupe)) {
      fail(`Duplicate found: ${chatgptDupe} (canonical: .chatgpt/agents/${agent}.md)`);
      duplicateCount += 1;
    }
  }
  if (duplicateCount === 0) {
    pass('No duplicate agent files');
  }
  console.log('');

  console.log('── 5. Agent Memory Directories ──');
  for (const dir of ['.claude/agent-memory', '.chatgpt/agent-memory']) {
    (await exists(dir))
      ? pass(`${dir}/`)
      : warn(`Missing: ${dir}/ (will be created on first agent run)`);
  }
  console.log('');

  console.log('── 6. Canonical AI Instruction Files (.ai/) ──');
  for (const file of AI_FILES) {
    (await exists(file)) ? pass(file) : fail(`Missing: ${file}`);
  }
  console.log('');

  console.log('── 7. Platform-Specific Shims ──');
  for (const file of SHIMS) {
    if (!(await exists(file))) {
      fail(`Missing: ${file}`);
      continue;
    }
    if (await fileContains(file, /\.ai\/INSTRUCTIONS\.md|ai\/INSTRUCTIONS/)) {
      pass(`${file} (references .ai/INSTRUCTIONS.md)`);
    } else {
      warn(`${file} exists but doesn't reference .ai/INSTRUCTIONS.md`);
    }
  }
  console.log('');

  console.log('── 8. Platform Settings ──');
  for (const file of ['.claude/settings.json', '.chatgpt/settings.json']) {
    (await exists(file)) ? pass(file) : fail(`Missing: ${file}`);
  }
  console.log('');

  console.log('── 9. MCP Server Configuration ──');
  (await exists('.vscode/mcp.json'))
    ? pass('.vscode/mcp.json')
    : warn('Missing: .vscode/mcp.json (optional — created per-workspace)');
  console.log('');

  console.log('══════════════════════════════════════════');
  if (errors === 0) {
    console.log(`✅ Agent configuration valid (${warnings} warnings)`);
  } else {
    console.log(`❌ Agent configuration invalid: ${errors} errors, ${warnings} warnings`);
  }
  console.log('══════════════════════════════════════════');

  process.exit(errors);
};

await run();
