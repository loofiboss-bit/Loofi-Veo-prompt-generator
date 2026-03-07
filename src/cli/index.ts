#!/usr/bin/env node

/**
 * Veo CLI — Headless Prompt Generation
 *
 * Entry point for the CLI. Parses arguments using Node.js built-in `parseArgs`
 * and routes to the appropriate command handler.
 *
 * Usage:
 *   veo generate --idea "A drone shot over misty mountains" [options]
 *   veo export --input prompt.json --format markdown [options]
 *   veo --help
 *   veo --version
 *
 * @module cli/index
 * @since v1.8.0
 */

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ModelProfile } from '../core/config/modelProfiles';
import type { GenerateOptions, ExportOptions, OutputFormat } from './types';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// ---------------------------------------------------------------------------
// Help Text
// ---------------------------------------------------------------------------

function buildHelpText(modelProfiles: ModelProfile[]): string {
  return `
Veo CLI — Headless Prompt Generation

Usage:
  veo <command> [options]

Commands:
  generate    Generate an AI video prompt via Gemini API
  export      Convert prompt data between formats
  profiles    List available generation profiles

Global Options:
  --help, -h       Show this help message
  --version, -V    Show version number
  --verbose, -v    Enable verbose logging

Generate Options:
  --idea <text>           Creative idea / prompt input (required)
  --profile <id>          Apply a model profile preset
  --target-model <model>  Target AI model: veo | sora | local (default: veo)
  --model <name>          Gemini model name override
  --provider <name>       LLM provider: gemini | ollama (default: gemini)
  --aspect-ratio <ratio>  Aspect ratio (e.g., 16:9, 9:16)
  --art-style <style>     Art style override
  --camera <movement>     Camera movement override
  --lighting <style>      Lighting style override
  --api-key <key>         Gemini API key (or set VEO_API_KEY env)
  --output, -o <file>     Write output to file (default: stdout)
  --format, -f <fmt>      Output format: json | txt | markdown (default: txt)
  --offline               Build prompt locally without API call

Export Options:
  --input, -i <file>      Input file path (default: stdin)
  --output, -o <file>     Output file path (default: stdout)
  --format, -f <fmt>      Export format: json | txt | markdown (default: json)

Available Profiles:
${modelProfiles.map((p) => `  ${p.id.padEnd(20)} ${p.description}`).join('\n')}

Examples:
  # Generate a prompt with API
  veo generate --idea "Drone shot over misty mountains at dawn" --api-key YOUR_KEY

  # Generate with a profile
  veo generate --idea "A neon-lit street" --profile veo-cinematic --api-key YOUR_KEY

  # Offline mode (no API call)
  veo generate --idea "Ocean waves" --art-style cinematic --offline

  # Export to markdown
  veo generate --idea "Sunset" --api-key KEY -f json -o prompt.json
  veo export -i prompt.json -f markdown -o prompt.md

  # Local Ollama (no cloud API needed)
  veo generate --idea "Forest at dusk" --provider ollama

  # Pipe-friendly
  veo generate --idea "Forest" --offline | veo export -f markdown
`.trimStart();
}

async function loadModelProfiles(): Promise<ModelProfile[]> {
  const { MODEL_PROFILES } = await import('../core/config/modelProfiles');
  return MODEL_PROFILES;
}

async function printHelp(): Promise<void> {
  const modelProfiles = await loadModelProfiles();
  process.stdout.write(buildHelpText(modelProfiles));
}

// ---------------------------------------------------------------------------
// Argument Parsing
// ---------------------------------------------------------------------------

function parseCliArgs(argv: string[]) {
  return parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'V', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      // Generate options
      idea: { type: 'string' },
      profile: { type: 'string' },
      'target-model': { type: 'string' },
      model: { type: 'string' },
      'aspect-ratio': { type: 'string' },
      'art-style': { type: 'string' },
      camera: { type: 'string' },
      lighting: { type: 'string' },
      'api-key': { type: 'string' },
      provider: { type: 'string' },
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f' },
      offline: { type: 'boolean', default: false },
      // Export options
      input: { type: 'string', short: 'i' },
    },
  });
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateOutputFormat(value?: string): OutputFormat {
  const valid: OutputFormat[] = ['json', 'txt', 'markdown'];
  if (!value) return 'txt';
  if (valid.includes(value as OutputFormat)) return value as OutputFormat;
  throw new Error(`Invalid format: "${value}". Valid formats: ${valid.join(', ')}`);
}

function validateTargetModel(value?: string): 'veo' | 'sora' | 'local' {
  if (!value || value === 'veo') return 'veo';
  if (value === 'sora') return 'sora';
  if (value === 'local') return 'local';
  throw new Error(`Invalid target model: "${value}". Valid: veo, sora, local`);
}

function validateProvider(value?: string): 'gemini' | 'ollama' | undefined {
  if (!value) return undefined;
  if (value === 'gemini' || value === 'ollama') return value;
  throw new Error(`Invalid provider: "${value}". Valid: gemini, ollama`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { values, positionals } = parseCliArgs(process.argv.slice(2));

  // Global flags
  if (values.help) {
    await printHelp();
    return;
  }

  if (values.version) {
    process.stdout.write(`veo v${getVersion()}\n`);
    return;
  }

  const command = positionals[0];

  if (!command) {
    await printHelp();
    return;
  }

  switch (command) {
    case 'generate': {
      if (!values.idea) {
        process.stderr.write('Error: --idea is required for the generate command.\n');
        process.stderr.write('Usage: veo generate --idea "Your creative idea"\n');
        process.exitCode = 1;
        return;
      }

      const generateOpts: GenerateOptions = {
        idea: values.idea,
        profile: values.profile,
        targetModel: validateTargetModel(values['target-model']),
        model: values.model,
        aspectRatio: values['aspect-ratio'],
        artStyle: values['art-style'],
        cameraMovement: values.camera,
        lightingStyle: values.lighting,
        apiKey: values['api-key'],
        provider: validateProvider(values.provider),
        output: values.output,
        format: validateOutputFormat(values.format),
        offline: values.offline ?? false,
        verbose: values.verbose ?? false,
      };

      const { executeGenerate } = await import('./commands/generate');
      await executeGenerate(generateOpts);
      break;
    }

    case 'export': {
      const exportOpts: ExportOptions = {
        input: values.input,
        output: values.output,
        format: validateOutputFormat(values.format ?? 'json'),
        verbose: values.verbose ?? false,
      };

      const { executeExport } = await import('./commands/export');
      await executeExport(exportOpts);
      break;
    }

    case 'profiles': {
      // Quick command to list available profiles
      const modelProfiles = await loadModelProfiles();
      const targetFilter = values['target-model'];
      const profiles = targetFilter
        ? modelProfiles.filter((p) => p.targetModel === targetFilter)
        : modelProfiles;

      for (const p of profiles) {
        process.stdout.write(`${p.id.padEnd(20)} [${p.targetModel}] ${p.description}\n`);
      }
      break;
    }

    default:
      process.stderr.write(`Unknown command: "${command}"\n`);
      process.stderr.write('Available commands: generate, export, profiles\n');
      process.stderr.write('Run "veo --help" for usage information.\n');
      process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

main().catch((error) => {
  process.stderr.write(`Fatal: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
