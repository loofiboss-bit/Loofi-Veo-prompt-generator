# CLI Skills Reference

> All commands accessible via `node --import tsx src/cli/`
> CLI mode: `src/cli/`

## Project Management

| Command  | Description                        |
| -------- | ---------------------------------- |
| `create` | Create a new project from template |
| `open`   | Open an existing project           |
| `list`   | List all saved projects            |
| `export` | Export project as bundle           |
| `import` | Import project from bundle         |

## Prompt Operations

| Command    | Description                          |
| ---------- | ------------------------------------ |
| `generate` | Generate video from prompt           |
| `batch`    | Batch generate from multiple prompts |
| `score`    | Score prompt quality                 |
| `enhance`  | AI-enhance a prompt via Gemini       |
| `template` | Apply/list/save templates            |

## Export

| Command        | Description                   |
| -------------- | ----------------------------- |
| `render`       | Render timeline to video file |
| `export-clip`  | Export single clip            |
| `export-batch` | Batch export with profiles    |

## Utilities

| Command   | Description                  |
| --------- | ---------------------------- |
| `info`    | Show project/app information |
| `health`  | App health and diagnostics   |
| `config`  | View/set configuration       |
| `version` | Show version information     |

## Usage Examples

```bash
# Generate video from prompt
node --import tsx src/cli/ generate --prompt "A drone shot over mountains at sunset" --model veo3

# Batch generate from file
node --import tsx src/cli/ batch --input prompts.json --output ./renders/

# Score a prompt
node --import tsx src/cli/ score --prompt "A cat walking on a beach"

# Export project bundle
node --import tsx src/cli/ export --project "My Project" --output ./bundle.zip

# Show app health
node --import tsx src/cli/ health --json
```

## JSON Output

All commands support `--json` flag for machine-readable output:

```bash
node --import tsx src/cli/ info --json
node --import tsx src/cli/ list --json
```
