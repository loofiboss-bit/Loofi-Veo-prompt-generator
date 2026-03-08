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
- No tracked multi-root `*.code-workspace` files

### Local workspace scope (untracked)

Keep personal and orchestration concerns outside tracked repo files:

- Multi-root workspace file at `C:\Users\<you>\Documents\Dev\Loofi.code-workspace`
- Personal editor settings and color themes
- Cross-repo sync/release helper tasks
- Machine-specific paths and tooling commands
- Archived legacy workspace files under `C:\Users\<you>\Documents\Dev\archive\workspace-legacy`

## Recommended local structure

Use `C:\Users\<you>\Documents\Dev` as the workspace home:

- `C:\Users\<you>\Documents\Dev\Loofi.code-workspace`
- `C:\Users\<you>\Documents\Dev\workspace-tools\...`
- `C:\Users\<you>\Documents\Dev\repos\loofi\...`
- `C:\Users\<you>\Documents\Dev\archive\workspace-legacy\...`

## How to set up

1. Create `C:\Users\<you>\Documents\Dev\Loofi.code-workspace`.
2. Point its folders at `repos\loofi\...` paths relative to `C:\Users\<you>\Documents\Dev`.
3. Keep personal settings, tasks, and theme overrides in that local file instead of inside repo roots.
4. Open VS Code using `C:\Users\<you>\Documents\Dev\Loofi.code-workspace`.

## Intentional exception

Per-repo generated files like `.vscode/mcp.json` can still exist inside repositories because VS Code resolves those integrations from workspace folders. Keep the human-managed multi-root workspace file at the `Dev` root, and let the repo sync scripts manage per-repo generated config.

## Git policy

This repo ignores personal workspace files with:

- `*.code-workspace`

This keeps local workspace churn out of commits while the shared repo stays focused on product code and generated repo-local config.
