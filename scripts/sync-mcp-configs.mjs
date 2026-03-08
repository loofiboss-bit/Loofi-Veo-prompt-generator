#!/usr/bin/env node

import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import prettier from 'prettier';

const root = process.cwd();
const sourcePath = path.join(root, '.ai', 'mcp-servers.json');
const checkMode = process.argv.includes('--check');

const configFiles = ['.copilot/mcp-config.json', '.mcp.json', '.vscode/mcp.json', 'opencode.json'];

const readJson = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const resolveArgs = (args, placeholder) =>
  args.map((arg) => arg.replace('${workspaceFolder}', placeholder));

const cloneObject = (value) => (value ? JSON.parse(JSON.stringify(value)) : undefined);

const isHttpServer = (server) =>
  server.type === 'http' || server.type === 'sse' || Boolean(server.url);

const getClientOverride = (server, client) => server[client] || {};

const buildHttpConfig = (server, client) => {
  const override = getClientOverride(server, client);
  const config = {
    type: override.type || server.type || 'http',
    url: override.url || server.url,
  };

  const headers = cloneObject(override.headers || server.headers);
  if (headers && Object.keys(headers).length > 0) {
    config.headers = headers;
  }

  if (client === 'copilot' && server.tools?.length) {
    config.tools = [...server.tools];
  }

  return config;
};

const formatJson = async (value) => {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  return prettier.format(json, { parser: 'json' });
};

const buildConfigs = async (servers) => {
  const copilot = { mcpServers: {} };
  const mcp = { mcpServers: {} };
  const vscode = { servers: {} };
  const opencode = { $schema: 'https://opencode.ai/config.json', mcp: {} };

  for (const [name, server] of Object.entries(servers)) {
    if (isHttpServer(server)) {
      copilot.mcpServers[name] = buildHttpConfig(server, 'copilot');
      mcp.mcpServers[name] = buildHttpConfig(server, 'mcp');
      vscode.servers[name] = buildHttpConfig(server, 'vscode');

      const opencodeOverride = getClientOverride(server, 'opencode');
      opencode.mcp[name] = {
        type: opencodeOverride.type || 'remote',
        url: opencodeOverride.url || server.url,
        enabled: true,
      };

      const opencodeHeaders = cloneObject(opencodeOverride.headers || server.headers);
      if (opencodeHeaders && Object.keys(opencodeHeaders).length > 0) {
        opencode.mcp[name].headers = opencodeHeaders;
      }

      continue;
    }

    const isNpx = Boolean(server.package);

    if (isNpx) {
      copilot.mcpServers[name] = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', server.package, ...resolveArgs(server.args, '${workspaceFolder}')],
      };

      mcp.mcpServers[name] = {
        command: 'npx',
        args: ['-y', server.package, ...resolveArgs(server.args, '.')],
      };

      vscode.servers[name] = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', server.package, ...resolveArgs(server.args, '${workspaceFolder}')],
      };

      opencode.mcp[name] = {
        type: 'local',
        command: ['npx', '-y', server.package, ...resolveArgs(server.args, '.')],
        enabled: true,
      };
    } else {
      // Docker MCP Toolkit or other direct-command servers
      const args = server.args || [];

      copilot.mcpServers[name] = {
        type: 'stdio',
        command: server.command,
        args: [...args],
      };

      mcp.mcpServers[name] = {
        type: 'stdio',
        command: server.command,
        args: [...args],
      };

      vscode.servers[name] = {
        type: 'stdio',
        command: server.command,
        args: [...args],
      };

      opencode.mcp[name] = {
        type: 'local',
        command: [server.command, ...args],
        enabled: true,
      };
    }

    if (server.env && Object.keys(server.env).length > 0) {
      copilot.mcpServers[name].env = server.env;
      mcp.mcpServers[name].env = server.env;
      vscode.servers[name].env = server.env;
    }
  }

  return {
    '.copilot/mcp-config.json': await formatJson(copilot),
    '.mcp.json': await formatJson(mcp),
    '.vscode/mcp.json': await formatJson(vscode),
    'opencode.json': await formatJson(opencode),
  };
};

const ensureSource = async () => {
  try {
    await stat(sourcePath);
  } catch {
    console.error('❌ Source file not found: .ai/mcp-servers.json');
    process.exit(1);
  }
};

const checkDrift = async (expectedFiles) => {
  let drift = 0;

  console.log('── Checking MCP config drift ──');
  for (const file of configFiles) {
    const targetPath = path.join(root, file);
    try {
      const actual = await readJson(targetPath);
      const expected = expectedFiles[file];
      if (JSON.stringify(actual) === JSON.stringify(JSON.parse(expected))) {
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ❌ Drift detected: ${file}`);
        drift += 1;
      }
    } catch {
      console.log(`  ❌ Missing: ${file}`);
      drift += 1;
    }
  }

  if (drift > 0) {
    console.error(`\n❌ ${drift} MCP config(s) out of sync.`);
    console.error('   Run: npm run mcp:sync');
    process.exit(1);
  }

  console.log('\n✅ All MCP configs in sync with .ai/mcp-servers.json');
};

const generateConfigs = async (expectedFiles) => {
  console.log('── Generating MCP configs ──');
  for (const file of configFiles) {
    const targetPath = path.join(root, file);
    await writeFile(targetPath, expectedFiles[file], 'utf8');
    console.log(`Generated: ${file}`);
  }
  console.log('\n✅ All MCP configs regenerated from .ai/mcp-servers.json');
};

const run = async () => {
  await ensureSource();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║        MCP Config Sync (SSoT)           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Source: .ai/mcp-servers.json');
  console.log(`Mode:   ${checkMode ? 'CHECK (CI)' : 'GENERATE'}`);
  console.log('');

  const source = await readJson(sourcePath);
  const expectedFiles = await buildConfigs(source.servers);

  if (checkMode) {
    await checkDrift(expectedFiles);
  } else {
    await generateConfigs(expectedFiles);
  }
};

await run();
