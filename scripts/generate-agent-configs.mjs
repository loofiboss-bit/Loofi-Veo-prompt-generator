#!/usr/bin/env node

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, '.ai', 'agents');
const checkMode = process.argv.includes('--check');

let errors = 0;
let generated = 0;

const exists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (relativePath) => {
  const content = await readFile(path.join(root, relativePath), 'utf8');
  return JSON.parse(content);
};

const parseFrontmatter = (content) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yaml = match[1];
  const body = match[2] ?? '';
  const lines = yaml.split(/\r?\n/);
  const frontmatter = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const keyValue = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!keyValue) {
      continue;
    }

    const [, key, rawValue] = keyValue;
    if (rawValue === '>') {
      const descriptionLines = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^\s+/.test(lines[cursor])) {
        descriptionLines.push(lines[cursor].replace(/^\s{2}/, ''));
        cursor += 1;
      }
      frontmatter[key] = descriptionLines.join('\n').trim();
      index = cursor - 1;
    } else {
      frontmatter[key] = rawValue.replace(/^"|"$/g, '').trim();
    }
  }

  return { frontmatter, body };
};

const topicFilesByAgent = {
  'project-coordinator': '`roadmap.md`, `patterns.md`',
  'architecture-advisor': '`patterns.md`, `services.md`',
  'backend-builder': '`patterns.md`, `services.md`',
  'frontend-integration-builder': '`components.md`, `stores.md`',
  'code-implementer': '`patterns.md`, `components.md`',
  'test-writer': '`mocking.md`, `patterns.md`',
  'release-planner': '`roadmap.md`, `patterns.md`',
};

const memorySection = (agentName, memoryDir) => {
  const topicFiles = topicFilesByAgent[agentName] ?? '`notes.md`';
  return `

# Persistent Agent Memory

You have a persistent Agent Memory directory at \`${memoryDir}/${agentName}/\`. Its contents persist across conversations.

As you work, consult your memory files to build on previous experience. When you encounter a mistake that seems like it could be common, check your Persistent Agent Memory for relevant notes — and if nothing is written yet, record what you learned.

Guidelines:

- \`MEMORY.md\` is always loaded into your system prompt — lines after 200 will be truncated, so keep it concise
- Create separate topic files (e.g., ${topicFiles}) for detailed notes and link to them from MEMORY.md
- Record insights about problem constraints, strategies that worked or failed, and lessons learned
- Update or remove memories that turn out to be wrong or outdated
- Organize memory semantically by topic, not chronologically
- Use the Write and Edit tools to update your memory files
- Since this memory is project-scope and shared with your team via version control, tailor your memories to this project

## MEMORY.md

Your MEMORY.md is currently empty. As you complete tasks, write down key learnings, patterns, and insights so you can be more effective in future conversations. Anything saved in MEMORY.md will be included in your system prompt next time.
`;
};

const buildAgentFile = ({ agentName, description, model, color, body, memoryDir }) => `---
name: ${agentName}
description: "${description}"
model: ${model}
color: ${color}
memory: project
---

${body.trimEnd()}${memorySection(agentName, memoryDir)}`;

const generateForPlatform = async (platformDir) => {
  const settingsPath = path.join(root, platformDir, 'settings.json');
  if (!(await exists(settingsPath))) {
    console.log(`⚠  Skipping ${platformDir} (no settings.json)`);
    return;
  }

  const settings = await readJson(path.join(platformDir, 'settings.json'));
  const platform = settings.platform ?? platformDir;
  const memoryDir = settings.memoryDir ?? `${platformDir}/agent-memory`;
  console.log(`Platform: ${platform} (${platformDir})`);

  const sourceFiles = (await readdir(sourceDir)).filter((file) => file.endsWith('.md'));

  for (const sourceFileName of sourceFiles) {
    const sourcePath = path.join(sourceDir, sourceFileName);
    const sourceContent = await readFile(sourcePath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(sourceContent);

    const agentName = frontmatter.name || sourceFileName.replace(/\.md$/, '');
    const description = frontmatter.description ?? '';
    const model = settings.agents?.[agentName]?.model ?? '';
    const color = settings.agents?.[agentName]?.color ?? '';

    if (!model) {
      console.log(`  ✗ No model mapping for ${agentName} in ${platformDir}/settings.json`);
      errors += 1;
      continue;
    }

    const outputPath = path.join(root, platformDir, 'agents', `${agentName}.md`);
    const outputContent = `${buildAgentFile({
      agentName,
      description,
      model,
      color,
      body,
      memoryDir,
    })}\n`;

    if (checkMode) {
      if (!(await exists(outputPath))) {
        console.log(
          `  ✗ DRIFT: ${platformDir}/agents/${agentName}.md does not exist (would be generated)`,
        );
        errors += 1;
        continue;
      }

      const current = await readFile(outputPath, 'utf8');
      if (current !== outputContent) {
        console.log(
          `  ✗ DRIFT: ${platformDir}/agents/${agentName}.md differs from generated content`,
        );
        console.log('    Run: npm run agents:sync');
        errors += 1;
      } else {
        console.log(`  ✓ ${platformDir}/agents/${agentName}.md is up-to-date`);
      }
      continue;
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, outputContent, 'utf8');
    console.log(`  ✓ Generated ${platformDir}/agents/${agentName}.md`);
    generated += 1;
  }

  console.log('');
};

const run = async () => {
  console.log('═══════════════════════════════════════════');
  console.log(checkMode ? '  Agent Config Drift Check' : '  Agent Config Generator');
  console.log('═══════════════════════════════════════════');
  console.log('');

  if (!(await exists(sourceDir))) {
    console.log(`✗ Source directory ${sourceDir} not found`);
    process.exit(1);
  }

  await generateForPlatform('.claude');
  await generateForPlatform('.chatgpt');

  console.log('═══════════════════════════════════════════');
  if (checkMode) {
    if (errors > 0) {
      console.log(`  ✗ ${errors} drift issue(s) found`);
      console.log('  Run: npm run agents:sync');
      process.exit(1);
    }
    console.log('  ✓ All agent configs are up-to-date');
  } else {
    console.log(`  ✓ Generated ${generated} agent config(s)`);
    if (errors > 0) {
      console.log(`  ✗ ${errors} error(s) occurred`);
      process.exit(1);
    }
  }
  console.log('═══════════════════════════════════════════');
};

await run();
