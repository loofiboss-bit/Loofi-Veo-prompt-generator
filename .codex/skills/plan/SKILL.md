---
name: plan
description: Decompose an ACTIVE version from ROADMAP.md into atomic tasks with dependencies.
---

# Plan Phase (P1)

## Steps

1. Read `.ai/ROADMAP.md` — find the `[ACTIVE]` version
2. Read all deliverables listed for that version
3. Decompose into atomic tasks (max 15)
4. Assign each task: agent, layer, size (S/M/L), dependencies
5. Save to session workspace or `.ai/` directory

## Output Format

```markdown
# Tasks for v{VERSION}

| #   | Task | Agent                        | Layer    | Size | Depends | Files                  | Done |
| --- | ---- | ---------------------------- | -------- | ---- | ------- | ---------------------- | ---- |
| 1   | ...  | backend-builder              | services | S    | -       | src/core/services/x.ts | [ ]  |
| 2   | ...  | frontend-integration-builder | features | M    | 1       | src/features/x/X.tsx   | [ ]  |
```

## Rules

- Each task: 1 agent, 1 layer, clear acceptance criteria
- Order by dependency (no cycles)
- Include test tasks paired with implementation tasks
- Include doc tasks (CHANGELOG, README)
- Layer options: services, store, types, features, shared, infrastructure, cli
- Reference `.ai/AGENT_SPECS.md` for agent capabilities
