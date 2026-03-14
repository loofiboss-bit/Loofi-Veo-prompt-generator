#!/usr/bin/env node

import process from 'node:process';

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8').trim();
};

const safeParse = (value) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const pickFirstString = (...values) =>
  values.find((value) => typeof value === 'string' && value.length > 0);

const buildResponse = (systemMessage) => {
  const response = { continue: true };
  if (systemMessage) {
    response.systemMessage = systemMessage;
  }
  return response;
};

const input = safeParse(await readStdin());
const eventName = pickFirstString(
  input.hookEventName,
  input.eventName,
  input.hook_event_name,
  input.hookSpecificInput?.hookEventName,
);

const serialized = JSON.stringify(input);
const customizationPattern =
  /AGENTS\.md|CLAUDE\.md|CHATGPT\.md|CODEX\.md|\.github[\\/](copilot-instructions\.md|agents[\\/]|instructions[\\/]|prompts[\\/]|skills[\\/]|hooks[\\/])/i;

if (eventName === 'SessionStart') {
  console.log(
    JSON.stringify(
      buildResponse(
        'Workspace customization source-of-truth lives in the Veo repo. If you edit prompts, agents, instructions, skills, hooks, or repo AGENTS files, finish by running `npm run customizations:check` from `veo-prompt-generator`.',
      ),
    ),
  );
  process.exit(0);
}

if (eventName === 'PostToolUse' && customizationPattern.test(serialized)) {
  console.log(
    JSON.stringify(
      buildResponse(
        'Customization file change detected. Before ending the task, run `npm run customizations:check` in `veo-prompt-generator` to catch workspace sync or agent-config drift.',
      ),
    ),
  );
  process.exit(0);
}

console.log(JSON.stringify(buildResponse()));
