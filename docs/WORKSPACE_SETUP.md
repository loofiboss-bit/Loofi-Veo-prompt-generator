# Workspace Setup

Keep a strict boundary between repository code and personal workspace orchestration.

## Why this matters

- Prevents noisy commits from editor/workspace changes.
- Keeps CI and formatting checks focused on product code.
- Makes multi-repo local workflows easier to evolve without touching application repositories.

## Boundary model

### Repository scope (tracked)

Store only project-relevant files in the repository:

- Source code, tests, package config, CI workflows
- Team-safe VS Code recommendations (`.vscode/extensions.json`)
- Optional workspace template (`Loofi-Veo.code-workspace.example`)

### Local workspace scope (untracked)

Keep personal and orchestration concerns outside tracked repo files:

- Multi-root `*.code-workspace` files
- Personal editor settings and color themes
- Cross-repo sync/release helper tasks
- Machine-specific paths and tooling commands

## Recommended local structure

Use a separate directory outside repo roots for local workspace files and tools:

- `C:\Users\<you>\Documents\Dev\workspaces\Loofi.code-workspace`
- `C:\Users\<you>\Documents\Dev\workspaces\tools\...`

## How to set up

1. Copy `Loofi-Veo.code-workspace.example` to your local workspace directory.
2. Rename it to `Loofi.code-workspace` (or any local name you prefer).
3. Add personal settings/tasks directly in that local file.
4. Open VS Code using that local workspace file.

## Plasma AI Monitor Companion

For full multi-repo local workflows, include the `plasma-ai-usage-monitor` repository in your
workspace and keep its path aligned with the template workspace file.

Expected workspace folder entry:

- Name: `Plasma AI Monitor`
- Path: `../plasma-ai-usage-monitor`

Recommended top-level layout:

```text
<workspace root>/
├── Loofi-Veo-prompt-generator/
└── plasma-ai-usage-monitor/
```

Use this companion reference for setup and usage details:

- [PLASMA_AI_MONITOR.md](./PLASMA_AI_MONITOR.md)
- [FEDORA_SETUP.md](./FEDORA_SETUP.md#7-fedora-specific-plasma-ai-monitor-setup)

![Plasma monitor panel reference](./images/plasma-ai-monitor/plasma-monitor-panel.png)
_Plasma monitor companion reference in the multi-repo workspace._

## Git policy

This repo ignores personal workspace files with:

- `*.code-workspace`
- `!*.code-workspace.example`

This keeps templates shareable while preventing local workspace churn from entering commits.
