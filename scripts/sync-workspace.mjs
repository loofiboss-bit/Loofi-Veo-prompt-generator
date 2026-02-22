#!/usr/bin/env node

/**
 * Workspace Config Sync v3.1
 *
 * Reads the canonical workspace config (.workspace/config.json) and syncs
 * infrastructure to repos in the multi-root workspace.
 *
 * ⚠️  WORKSPACE DUPLICATION GUARD:
 * VS Code multi-root workspaces MERGE these from ALL workspace folders:
 *   - .vscode/mcp.json          (MCP servers)
 *   - .copilot/mcp-config.json  (Copilot CLI MCP servers)
 *   - .github/agents/           (VS Code Chat agents)
 *   - .github/instructions/     (VS Code Chat instructions)
 *   - .github/prompts/          (VS Code Chat prompts)
 *   - .github/skills/           (VS Code Chat skills)
 *
 * To prevent duplicates, COMMON configs (MCP servers, agents) are ONLY
 * written to the PRIMARY repo (Loofi-Veo-prompt-generator). Secondary
 * repos only get repo-SPECIFIC configs (e.g. Fedora's custom MCP servers).
 *
 * Shared instructions (e.g. code-commenting, context-engineering) are
 * synced from the primary repo to secondary repos that lack their own
 * hand-crafted versions. Repos listed in sharedInstructions.skip are
 * excluded. This ensures standalone usage works outside the workspace.
 *
 * Safe to sync to all repos (no duplication risk):
 *   - .github/copilot-instructions.md (unique per repo)
 *   - .github/dependabot.yml          (unique per repo)
 *   - .github/workflows/              (unique per repo)
 *   - .github/labeler.yml             (unique per repo)
 *   - .github/instructions/*.md       (shared, with skip list)
 *
 * Usage:
 *   node scripts/sync-workspace.mjs              # Generate all configs
 *   node scripts/sync-workspace.mjs --check      # CI mode — check for drift
 *   node scripts/sync-workspace.mjs --mcp-only   # Sync only MCP configs
 *   node scripts/sync-workspace.mjs --repo=NAME  # Sync only one repo
 *   node scripts/sync-workspace.mjs --dry-run    # Show what would change
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// ─── Config ──────────────────────────────────────────────────────────

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.workspace', 'config.json');

const checkMode = process.argv.includes('--check');
const mcpOnly = process.argv.includes('--mcp-only');
const dryRun = process.argv.includes('--dry-run');
const repoFlag = process.argv.find((a) => a.startsWith('--repo='));
const targetRepo = repoFlag ? repoFlag.split('=')[1] : null;

// ─── Helpers ─────────────────────────────────────────────────────────

const stripJsonComments = (str) => str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const readJson = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(stripJsonComments(raw));
};

const writeJson = async (filePath, data) => {
  if (dryRun) return;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

const writeText = async (filePath, content) => {
  if (dryRun) return;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
};

const exists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const resolveArgs = (args, placeholder) =>
  args.map((arg) => arg.replace('${workspaceFolder}', placeholder));

// ─── MCP Config Builders ────────────────────────────────────────────

const buildVscodeMcp = (servers, repoMcp = {}) => {
  const result = { servers: {} };
  for (const [name, server] of Object.entries(servers)) {
    if (server.command) {
      result.servers[name] = {
        type: 'stdio',
        command: server.command,
        args: [...server.args],
      };
    } else {
      result.servers[name] = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', server.package, ...resolveArgs(server.args, '${workspaceFolder}')],
      };
    }
    if (server.env && Object.keys(server.env).length > 0) {
      result.servers[name].env = server.env;
    }
  }
  for (const [name, server] of Object.entries(repoMcp)) {
    result.servers[name] = { type: 'stdio', ...server };
  }
  return result;
};

const buildCopilotMcp = (servers, repoMcp = {}) => {
  const result = { mcpServers: {} };
  for (const [name, server] of Object.entries(servers)) {
    if (server.command) {
      result.mcpServers[name] = {
        type: 'stdio',
        command: server.command,
        args: [...server.args],
      };
    } else {
      result.mcpServers[name] = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', server.package, ...resolveArgs(server.args, '${workspaceFolder}')],
      };
    }
    if (server.env && Object.keys(server.env).length > 0) {
      result.mcpServers[name].env = server.env;
    }
  }
  for (const [name, server] of Object.entries(repoMcp)) {
    result.mcpServers[name] = { type: 'stdio', ...server };
  }
  return result;
};

const buildClaudeMcp = (servers, repoMcp = {}) => {
  const result = { mcpServers: {} };
  for (const [name, server] of Object.entries(servers)) {
    if (server.command) {
      result.mcpServers[name] = {
        command: server.command,
        args: [...server.args],
      };
    } else {
      result.mcpServers[name] = {
        command: 'npx',
        args: ['-y', server.package, ...resolveArgs(server.args, '.')],
      };
    }
    if (server.env && Object.keys(server.env).length > 0) {
      result.mcpServers[name].env = server.env;
    }
  }
  for (const [name, server] of Object.entries(repoMcp)) {
    result.mcpServers[name] = { ...server };
  }
  return result;
};

// ─── Copilot Instructions Builder ───────────────────────────────────

const buildCopilotInstructions = (repoName, repo, agents, servers, isPrimary = false) => {
  const lines = [
    `# ${repoName} — Copilot Instructions`,
    '',
    `> Auto-generated by workspace sync. Source: \`.workspace/config.json\``,
    `> Do not edit manually — run: \`node scripts/sync-workspace.mjs\``,
    '',
    '## Project',
    '',
    `**${repoName}** — ${repo.description || 'No description'}`,
    '',
  ];

  // Tech stack
  const stack = [repo.language, repo.framework].filter(Boolean).join(' + ');
  if (stack) lines.push(`Tech stack: ${stack}`, '');

  // Commands
  const cmds = [];
  if (repo.buildCmd) cmds.push(`- Build: \`${repo.buildCmd}\``);
  if (repo.testCmd) cmds.push(`- Test: \`${repo.testCmd}\``);
  if (repo.lintCmd) cmds.push(`- Lint: \`${repo.lintCmd}\``);
  if (repo.validateCmd) cmds.push(`- Validate: \`${repo.validateCmd}\``);
  if (cmds.length > 0) {
    lines.push('## Commands', '', ...cmds, '');
  }

  // Code style based on language
  lines.push('## Code Style', '');
  if (repo.language === 'TypeScript') {
    lines.push(
      '- Strict TypeScript — no implicit `any`, strict null checks',
      '- Named exports only — default exports prohibited',
      '- `interface` for object shapes, `type` for unions/intersections',
      `- Formatter: ${repo.formatter || 'prettier'} — 2-space indent, single quotes, trailing commas`,
      `- Linter: ${repo.linter || 'eslint'} — zero warnings in CI`,
      '- Path aliases: `@core/`, `@features/`, `@shared/`, `@infrastructure/`, `@/`',
      '- Functional React components only, hooks at top, `ErrorBoundary` wraps panels',
      '',
    );
  } else if (repo.language === 'Python') {
    lines.push(
      '- Python 3.12+ with type hints',
      `- Formatter: ${repo.formatter || 'black'} — line length 150`,
      `- Linter: ${repo.linter || 'ruff'}`,
      '- Use `logging` module, never `print()` in production code',
      '- Docstrings: Google style',
      '- Imports: stdlib → third-party → local, one blank line between groups',
      '',
    );
  } else if (repo.language === 'QML/C++') {
    lines.push(
      '- C++20 standard, Qt6/KF6 APIs',
      '- QML: follow KDE HIG guidelines',
      `- Formatter: ${repo.formatter || 'clang-format'}`,
      `- Linter: ${repo.linter || 'clang-tidy'}`,
      '- CMake: use modern target-based API',
      '',
    );
  }

  // Testing
  if (repo.testFramework) {
    lines.push('## Testing', '');
    if (repo.testFramework === 'vitest') {
      lines.push(
        '- Framework: Vitest + @testing-library/react + jsdom',
        '- Test files: co-located as `[name].test.ts(x)`',
        '- Mock external deps with `vi.mock()`',
        '',
      );
    } else if (repo.testFramework === 'pytest') {
      lines.push(
        '- Framework: pytest',
        '- Test files: `tests/` directory, `test_*.py` naming',
        '- Use fixtures and parametrize for data-driven tests',
        '',
      );
    } else if (repo.testFramework === 'Qt Test') {
      lines.push(
        '- Framework: Qt Test / CTest',
        '- Tests alongside source in `tests/` directory',
        '',
      );
    }
  }

  // Commit conventions
  lines.push(
    '## Commits',
    '',
    'Format: `type(scope): description`',
    'Types: feat, fix, refactor, docs, test, chore, ci, perf, revert, style',
    'Scope: kebab-case, max 100 chars subject.',
    '',
  );

  // MCP servers — only list full table in primary repo to avoid workspace duplication
  if (isPrimary) {
    lines.push('## MCP Servers', '', '| Server | Purpose |', '| --- | --- |');
    for (const [name, server] of Object.entries(servers)) {
      lines.push(`| **${name}** | ${server.description} |`);
    }
    lines.push('');
  } else {
    lines.push('## MCP Servers', '');
    if (repo.repoMcp && Object.keys(repo.repoMcp).length > 0) {
      lines.push(
        'Workspace-level MCP config in primary repo `.vscode/mcp.json`. Repo-specific servers in `.vscode/mcp.json` (local).',
      );
    } else {
      lines.push('Workspace-level MCP config in primary repo `.vscode/mcp.json`.');
    }
    lines.push('');
  }

  // Agents — only list full table in primary repo to avoid workspace duplication
  if (isPrimary) {
    lines.push('## AI Agents', '', '| Agent | Model | Description |', '| --- | --- | --- |');
    for (const agent of agents) {
      lines.push(`| ${agent.name} | ${agent.model} | ${agent.description} |`);
    }
    lines.push('');
  } else {
    lines.push(
      '## AI Agents',
      '',
      'See `AGENTS.md` and `.github/agents/` for agent definitions.',
      '',
    );
  }

  return lines.join('\n');
};

// ─── Dependabot Config Builder ──────────────────────────────────────

const buildDependabot = (repo) => {
  const updates = [];

  // Always add github-actions ecosystem
  updates.push({
    'package-ecosystem': 'github-actions',
    directory: '/',
    schedule: { interval: 'weekly', day: 'monday' },
    labels: ['ci/cd', 'dependencies'],
    'commit-message': { prefix: 'ci' },
  });

  // Add language-specific ecosystem
  if (repo.packageManager === 'npm') {
    updates.push({
      'package-ecosystem': 'npm',
      directory: '/',
      schedule: { interval: 'weekly', day: 'monday' },
      labels: ['dependencies'],
      'commit-message': { prefix: 'deps' },
      'open-pull-requests-limit': 10,
    });
  } else if (repo.packageManager === 'pip') {
    updates.push({
      'package-ecosystem': 'pip',
      directory: '/',
      schedule: { interval: 'weekly', day: 'monday' },
      labels: ['dependencies'],
      'commit-message': { prefix: 'deps' },
      'open-pull-requests-limit': 5,
    });
  }

  // Docker if applicable
  if (repo.framework && repo.framework.includes('FastAPI')) {
    updates.push({
      'package-ecosystem': 'docker',
      directory: '/',
      schedule: { interval: 'weekly', day: 'monday' },
      labels: ['dependencies', 'docker'],
      'commit-message': { prefix: 'deps(docker)' },
    });
  }

  // Build YAML manually for cleaner output
  let yaml = '# Auto-generated by workspace sync. Source: .workspace/config.json\n';
  yaml += '# Do not edit manually — run: node scripts/sync-workspace.mjs\n';
  yaml += 'version: 2\n';
  yaml += 'updates:\n';

  for (const update of updates) {
    yaml += `  - package-ecosystem: "${update['package-ecosystem']}"\n`;
    yaml += `    directory: "${update.directory}"\n`;
    yaml += '    schedule:\n';
    yaml += `      interval: "${update.schedule.interval}"\n`;
    yaml += `      day: "${update.schedule.day}"\n`;
    yaml += '    labels:\n';
    for (const label of update.labels) {
      yaml += `      - "${label}"\n`;
    }
    yaml += '    commit-message:\n';
    yaml += `      prefix: "${update['commit-message'].prefix}"\n`;
    if (update['open-pull-requests-limit']) {
      yaml += `    open-pull-requests-limit: ${update['open-pull-requests-limit']}\n`;
    }
    yaml += '\n';
  }

  return yaml;
};

// ─── CI Workflow Builders ───────────────────────────────────────────

const buildAutoMergeWorkflow = () => {
  return `# Auto-generated by workspace sync. Source: .workspace/config.json
name: Auto-merge Dependabot

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}

      - name: Auto-approve patch updates
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
        run: gh pr review --approve "\$PR_URL"
        env:
          PR_URL: \${{ github.event.pull_request.html_url }}
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}

      - name: Auto-merge patch updates
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
        run: gh pr merge --auto --squash "\$PR_URL"
        env:
          PR_URL: \${{ github.event.pull_request.html_url }}
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
};

const buildAutoLabelWorkflow = () => {
  return `# Auto-generated by workspace sync. Source: .workspace/config.json
name: Auto Label

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  label:
    name: Label PR
    runs-on: ubuntu-latest
    steps:
      - name: Apply path-based labels
        uses: actions/labeler@v5
        with:
          configuration-path: .github/labeler.yml
          sync-labels: true
`;
};

const buildConfigDriftWorkflow = (repoName) => {
  return `# Auto-generated by workspace sync. Source: .workspace/config.json
name: Config Drift Check

on:
  pull_request:
    paths:
      - '.vscode/mcp.json'
      - '.copilot/mcp-config.json'
      - '.mcp.json'
      - '.github/copilot-instructions.md'
      - '.github/dependabot.yml'
      - '.github/agents/**'
  schedule:
    - cron: '0 6 * * 1' # Weekly Monday 6am UTC

permissions:
  contents: read

jobs:
  drift-check:
    name: Config sync check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Verify config fingerprint
        run: |
          echo "Checking config sync status for ${repoName}..."
          echo "Configs were last synced from loofitheboss/Loofi-Veo-prompt-generator"
          echo "To re-sync: clone the workspace repo and run 'node scripts/sync-workspace.mjs'"

          # Check that key config files exist
          for f in .vscode/mcp.json .copilot/mcp-config.json .mcp.json .github/copilot-instructions.md; do
            if [ ! -f "$f" ]; then
              echo "::warning::Missing synced config: $f"
            else
              echo "✅ $f exists"
            fi
          done
`;
};

const buildLabelerConfig = (repo) => {
  let yaml = '# Auto-generated by workspace sync. Source: .workspace/config.json\n';
  yaml += '# Path-based auto-labeling for PRs\n\n';

  if (repo.language === 'TypeScript') {
    yaml += `'area: source':\n  - changed-files:\n      - any-glob-to-any-file: 'src/**'\n\n`;
    yaml += `'area: tests':\n  - changed-files:\n      - any-glob-to-any-file:\n          - 'src/**/*.test.ts'\n          - 'src/**/*.test.tsx'\n          - 'e2e/**'\n\n`;
    yaml += `'area: config':\n  - changed-files:\n      - any-glob-to-any-file:\n          - '*.config.*'\n          - 'tsconfig.json'\n          - 'package.json'\n\n`;
  } else if (repo.language === 'Python') {
    yaml += `'area: source':\n  - changed-files:\n      - any-glob-to-any-file:\n          - '**/*.py'\n          - '!tests/**'\n\n`;
    yaml += `'area: tests':\n  - changed-files:\n      - any-glob-to-any-file: 'tests/**'\n\n`;
    yaml += `'area: config':\n  - changed-files:\n      - any-glob-to-any-file:\n          - 'pyproject.toml'\n          - 'setup.py'\n          - 'requirements*.txt'\n\n`;
  } else if (repo.language === 'QML/C++') {
    yaml += `'area: source':\n  - changed-files:\n      - any-glob-to-any-file:\n          - '**/*.cpp'\n          - '**/*.h'\n          - '**/*.qml'\n\n`;
    yaml += `'area: cmake':\n  - changed-files:\n      - any-glob-to-any-file: '**/CMakeLists.txt'\n\n`;
  }

  // Common labels for all repos
  yaml += `'infra: ci':\n  - changed-files:\n      - any-glob-to-any-file: '.github/workflows/**'\n\n`;
  yaml += `'infra: ai-config':\n  - changed-files:\n      - any-glob-to-any-file:\n          - '.vscode/mcp.json'\n          - '.copilot/**'\n          - '.mcp.json'\n          - '.github/copilot-instructions.md'\n          - '.github/agents/**'\n\n`;
  yaml += `'documentation':\n  - changed-files:\n      - any-glob-to-any-file:\n          - '**/*.md'\n          - 'docs/**'\n`;

  return yaml;
};

// ─── Sync Logic ─────────────────────────────────────────────────────

const PRIMARY_REPO = 'Loofi-Veo-prompt-generator';

const syncMcpForRepo = async (repoName, repoConfig, servers) => {
  const repoPath = path.resolve(ROOT, repoConfig.path);
  const results = [];
  const repoMcp = repoConfig.repoMcp || {};
  const isPrimary = repoName === PRIMARY_REPO;

  // Common MCP servers go ONLY in the primary repo to avoid
  // VS Code workspace duplication. Secondary repos get only
  // their repo-specific servers (repoMcp).
  const serversForRepo = isPrimary ? servers : {};

  const targets = [
    { file: '.vscode/mcp.json', builder: buildVscodeMcp },
    { file: '.copilot/mcp-config.json', builder: buildCopilotMcp },
    { file: '.mcp.json', builder: buildClaudeMcp },
  ];

  for (const { file, builder } of targets) {
    const targetPath = path.join(repoPath, file);
    const expected = builder(serversForRepo, repoMcp);

    if (checkMode) {
      if (await exists(targetPath)) {
        try {
          const actual = await readJson(targetPath);
          if (jsonEqual(actual, expected)) {
            results.push({ file, status: 'ok' });
          } else {
            results.push({ file, status: 'drift' });
          }
        } catch {
          results.push({ file, status: 'parse-error' });
        }
      } else {
        results.push({ file, status: 'missing' });
      }
    } else {
      await writeJson(targetPath, expected);
      results.push({ file, status: 'written' });
    }
  }

  return results;
};

const syncAgentDefs = async (_repoName, _repoConfig, _agents) => {
  const results = [];

  // Agent definitions are maintained manually per repo.
  // Primary repo has hand-crafted .agent.md files in .github/agents/.
  // Secondary repos either have their own hand-crafted agents or none.
  // Auto-generating thin stubs causes duplicates in VS Code Chat's
  // agent picker — skip entirely.
  results.push({
    file: '.github/agents/*',
    status: 'skipped (agents are hand-crafted, not auto-generated)',
  });
  return results;
};

const syncCopilotInstructions = async (repoName, repoConfig, agents, servers) => {
  const repoPath = path.resolve(ROOT, repoConfig.path);
  const results = [];
  const filePath = path.join(repoPath, '.github', 'copilot-instructions.md');
  const isPrimary = repoName === PRIMARY_REPO;

  const content = buildCopilotInstructions(repoName, repoConfig, agents, servers, isPrimary);

  if (checkMode) {
    // Veo has hand-crafted instructions — skip drift check
    if (repoName === 'Loofi-Veo-prompt-generator') {
      results.push({
        file: '.github/copilot-instructions.md',
        status: 'ok (hand-crafted)',
      });
    } else if (await exists(filePath)) {
      const actual = await readFile(filePath, 'utf8');
      results.push({
        file: '.github/copilot-instructions.md',
        status: actual.trim() === content.trim() ? 'ok' : 'drift',
      });
    } else {
      results.push({ file: '.github/copilot-instructions.md', status: 'missing' });
    }
  } else {
    // Only write for non-Veo repos (Veo has its own hand-crafted instructions)
    if (repoName === 'Loofi-Veo-prompt-generator') {
      results.push({
        file: '.github/copilot-instructions.md',
        status: 'skipped (hand-crafted)',
      });
    } else {
      await writeText(filePath, content);
      results.push({ file: '.github/copilot-instructions.md', status: 'written' });
    }
  }

  return results;
};

const syncDependabot = async (repoName, repoConfig) => {
  const repoPath = path.resolve(ROOT, repoConfig.path);
  const results = [];
  const filePath = path.join(repoPath, '.github', 'dependabot.yml');

  // Skip repos with no package manager
  if (!repoConfig.packageManager) {
    results.push({ file: '.github/dependabot.yml', status: 'skipped (no pkg mgr)' });
    return results;
  }

  const content = buildDependabot(repoConfig);

  if (checkMode) {
    if (await exists(filePath)) {
      results.push({ file: '.github/dependabot.yml', status: 'ok (exists)' });
    } else {
      results.push({ file: '.github/dependabot.yml', status: 'missing' });
    }
  } else {
    // Skip fedora — it already has a hand-crafted dependabot config
    if (repoName === 'loofi-fedora-tweaks') {
      results.push({ file: '.github/dependabot.yml', status: 'skipped (hand-crafted)' });
    } else {
      await writeText(filePath, content);
      results.push({ file: '.github/dependabot.yml', status: 'written' });
    }
  }

  return results;
};

const syncCiWorkflows = async (repoName, repoConfig) => {
  const repoPath = path.resolve(ROOT, repoConfig.path);
  const results = [];
  const workflowsDir = path.join(repoPath, '.github', 'workflows');

  if (!repoConfig.packageManager) {
    results.push({ file: '.github/workflows/*', status: 'skipped (no pkg mgr)' });
    return results;
  }

  if (!checkMode) {
    await mkdir(workflowsDir, { recursive: true });
  }

  // 1. Auto-merge Dependabot (all repos with dependabot)
  const autoMergePath = path.join(workflowsDir, 'auto-merge-dependabot.yml');
  if (checkMode) {
    results.push({
      file: '.github/workflows/auto-merge-dependabot.yml',
      status: (await exists(autoMergePath)) ? 'ok' : 'missing',
    });
  } else {
    // Skip repos that already have it
    if (repoName === 'loofi-fedora-tweaks') {
      results.push({
        file: '.github/workflows/auto-merge-dependabot.yml',
        status: 'skipped (exists)',
      });
    } else {
      await writeText(autoMergePath, buildAutoMergeWorkflow());
      results.push({
        file: '.github/workflows/auto-merge-dependabot.yml',
        status: 'written',
      });
    }
  }

  // 2. Auto Label (all repos)
  const autoLabelPath = path.join(workflowsDir, 'auto-label.yml');
  if (checkMode) {
    results.push({
      file: '.github/workflows/auto-label.yml',
      status: (await exists(autoLabelPath)) ? 'ok' : 'missing',
    });
  } else {
    if (repoName === 'Loofi-Veo-prompt-generator') {
      results.push({
        file: '.github/workflows/auto-label.yml',
        status: 'skipped (exists)',
      });
    } else {
      await writeText(autoLabelPath, buildAutoLabelWorkflow());
      results.push({ file: '.github/workflows/auto-label.yml', status: 'written' });
    }
  }

  // 3. Config drift check (all repos except Veo which has the SSoT)
  if (repoName !== 'Loofi-Veo-prompt-generator') {
    const driftPath = path.join(workflowsDir, 'config-drift.yml');
    if (checkMode) {
      results.push({
        file: '.github/workflows/config-drift.yml',
        status: (await exists(driftPath)) ? 'ok' : 'missing',
      });
    } else {
      await writeText(driftPath, buildConfigDriftWorkflow(repoName));
      results.push({ file: '.github/workflows/config-drift.yml', status: 'written' });
    }
  }

  // 4. Labeler config
  const labelerPath = path.join(repoPath, '.github', 'labeler.yml');
  if (checkMode) {
    results.push({
      file: '.github/labeler.yml',
      status: (await exists(labelerPath)) ? 'ok' : 'missing',
    });
  } else {
    if (repoName === 'Loofi-Veo-prompt-generator') {
      results.push({ file: '.github/labeler.yml', status: 'skipped (hand-crafted)' });
    } else {
      await writeText(labelerPath, buildLabelerConfig(repoConfig));
      results.push({ file: '.github/labeler.yml', status: 'written' });
    }
  }

  return results;
};

// ─── Shared Instructions Sync ───────────────────────────────────────

const INSTRUCTION_HEADER =
  '# Auto-synced from primary repo (Loofi-Veo-prompt-generator).\n# Source: .workspace/config.json → sharedInstructions\n# Do not edit manually — run: node scripts/sync-workspace.mjs\n';

const syncSharedInstructions = async (repoName, repoConfig, sharedConfig) => {
  const results = [];

  if (!sharedConfig || !sharedConfig.files || sharedConfig.files.length === 0) {
    results.push({
      file: '.github/instructions/*',
      status: 'skipped (no sharedInstructions config)',
    });
    return results;
  }

  if (repoName === PRIMARY_REPO) {
    results.push({
      file: '.github/instructions/*',
      status: 'skipped (primary repo — source of truth)',
    });
    return results;
  }

  if (sharedConfig.skip && sharedConfig.skip[repoName]) {
    results.push({
      file: '.github/instructions/*',
      status: `skipped (${sharedConfig.skip[repoName]})`,
    });
    return results;
  }

  const repoPath = path.resolve(ROOT, repoConfig.path);
  const srcDir = path.join(ROOT, '.github', 'instructions');
  const destDir = path.join(repoPath, '.github', 'instructions');

  for (const fileName of sharedConfig.files) {
    const srcPath = path.join(srcDir, fileName);
    const destPath = path.join(destDir, fileName);
    const relFile = `.github/instructions/${fileName}`;

    if (!(await exists(srcPath))) {
      results.push({ file: relFile, status: 'source missing' });
      continue;
    }

    const srcContent = await readFile(srcPath, 'utf8');

    if (checkMode) {
      if (await exists(destPath)) {
        const destContent = await readFile(destPath, 'utf8');
        results.push({
          file: relFile,
          status: destContent.trim() === srcContent.trim() ? 'ok' : 'drift',
        });
      } else {
        results.push({ file: relFile, status: 'missing' });
      }
    } else {
      await writeText(destPath, srcContent);
      results.push({ file: relFile, status: 'written' });
    }
  }

  return results;
};

// ─── Main ────────────────────────────────────────────────────────────

const run = async () => {
  if (!(await exists(CONFIG_PATH))) {
    console.error('❌ Workspace config not found: .workspace/config.json');
    process.exit(1);
  }

  const config = await readJson(CONFIG_PATH);
  const servers = config.mcp.servers;
  const agents = config.agents.definitions;
  const repos = config.repos;
  const sharedInstructions = config.sharedInstructions || null;

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║    Workspace Config Sync v3.1 (Dedup-Safe + Instr)    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Source:  .workspace/config.json`);
  console.log(`Mode:    ${dryRun ? 'DRY RUN' : checkMode ? 'CHECK (CI)' : 'GENERATE'}`);
  console.log(
    `Scope:   ${mcpOnly ? 'MCP only' : 'Full (MCP + Agents + CI + Dependabot + Instructions)'}`,
  );
  console.log(`Repos:   ${targetRepo || 'all'}`);
  console.log('');

  let totalDrift = 0;
  let totalWritten = 0;
  let totalSkipped = 0;

  for (const [repoName, repoConfig] of Object.entries(repos)) {
    if (targetRepo && repoName !== targetRepo) continue;

    const repoPath = path.resolve(ROOT, repoConfig.path);
    if (!(await exists(repoPath))) {
      console.log(`⚠️  Skipping ${repoName} (not found at ${repoConfig.path})`);
      continue;
    }

    console.log(`── ${repoName} ──`);

    // MCP sync
    const mcpResults = await syncMcpForRepo(repoName, repoConfig, servers);
    for (const r of mcpResults) {
      const icon =
        r.status === 'ok'
          ? '✅'
          : r.status === 'written'
            ? '📝'
            : r.status === 'drift'
              ? '❌'
              : '⚠️';
      console.log(`  ${icon} ${r.file} (${r.status})`);
      if (r.status === 'drift' || r.status === 'missing') totalDrift++;
      if (r.status === 'written') totalWritten++;
    }

    // Everything below skipped in MCP-only mode
    if (!mcpOnly) {
      // Agent definitions
      const agentResults = await syncAgentDefs(repoName, repoConfig, agents);
      for (const r of agentResults) {
        console.log(`  📝 ${r.file} (${r.status})`);
        if (r.status === 'written') totalWritten++;
      }

      // Copilot instructions
      const instrResults = await syncCopilotInstructions(repoName, repoConfig, agents, servers);
      for (const r of instrResults) {
        const icon = r.status.includes('skip')
          ? '⏭️'
          : r.status === 'ok'
            ? '✅'
            : r.status === 'written'
              ? '📝'
              : r.status === 'drift'
                ? '❌'
                : '⚠️';
        console.log(`  ${icon} ${r.file} (${r.status})`);
        if (r.status === 'drift' || r.status === 'missing') totalDrift++;
        if (r.status === 'written') totalWritten++;
        if (r.status.includes('skip')) totalSkipped++;
      }

      // Dependabot
      const depResults = await syncDependabot(repoName, repoConfig);
      for (const r of depResults) {
        const icon = r.status.includes('skip')
          ? '⏭️'
          : r.status === 'ok' || r.status.includes('ok')
            ? '✅'
            : r.status === 'written'
              ? '📝'
              : r.status === 'drift'
                ? '❌'
                : '⚠️';
        console.log(`  ${icon} ${r.file} (${r.status})`);
        if (r.status === 'drift' || r.status === 'missing') totalDrift++;
        if (r.status === 'written') totalWritten++;
        if (r.status.includes('skip')) totalSkipped++;
      }

      // CI Workflows + Labeler
      const ciResults = await syncCiWorkflows(repoName, repoConfig);
      for (const r of ciResults) {
        const icon =
          r.status.includes('skip') || r.status.includes('exists')
            ? '⏭️'
            : r.status === 'ok'
              ? '✅'
              : r.status === 'written'
                ? '📝'
                : r.status === 'drift'
                  ? '❌'
                  : '⚠️';
        console.log(`  ${icon} ${r.file} (${r.status})`);
        if (r.status === 'drift' || r.status === 'missing') totalDrift++;
        if (r.status === 'written') totalWritten++;
        if (r.status.includes('skip') || r.status.includes('exists')) totalSkipped++;
      }

      // Shared instructions (cross-repo)
      const instrSyncResults = await syncSharedInstructions(
        repoName,
        repoConfig,
        sharedInstructions,
      );
      for (const r of instrSyncResults) {
        const icon =
          r.status.includes('skip') || r.status.includes('exists')
            ? '⏭️'
            : r.status === 'ok'
              ? '✅'
              : r.status === 'written'
                ? '📝'
                : r.status === 'drift'
                  ? '❌'
                  : '⚠️';
        console.log(`  ${icon} ${r.file} (${r.status})`);
        if (r.status === 'drift' || r.status === 'missing') totalDrift++;
        if (r.status === 'written') totalWritten++;
        if (r.status.includes('skip')) totalSkipped++;
      }
    }

    console.log('');
  }

  // Also sync the local repo's own .ai/mcp-servers.json to stay in sync
  if (!checkMode && !dryRun && !targetRepo) {
    const aiMcpPath = path.join(ROOT, '.ai', 'mcp-servers.json');
    if (await exists(aiMcpPath)) {
      const aiSource = {
        $schema: 'https://veo-studio.dev/schemas/mcp-servers.json',
        _comment:
          'Canonical MCP server definitions — synced from .workspace/config.json. Run: node scripts/sync-workspace.mjs',
        servers,
      };
      await writeJson(aiMcpPath, aiSource);
      console.log('📝 Synced .ai/mcp-servers.json from workspace config');
      totalWritten++;
    }
  }

  // Summary
  console.log('─'.repeat(48));
  if (checkMode) {
    if (totalDrift > 0) {
      console.error(`❌ ${totalDrift} config(s) out of sync.`);
      console.error('   Run: node scripts/sync-workspace.mjs');
      process.exit(1);
    }
    console.log('✅ All configs in sync across workspace.');
  } else {
    console.log(`✅ ${totalWritten} file(s) written, ${totalSkipped} skipped across workspace.`);
    if (dryRun) console.log('   (dry run — no files actually written)');
  }
};

await run();
