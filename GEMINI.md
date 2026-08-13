# Loofi Creator Studio — Gemini CLI Instructions

> **Canonical instructions**: `.ai/INSTRUCTIONS.md`
> This file contains Gemini-specific overrides only. Read `.ai/INSTRUCTIONS.md` first.

---

## Quick Start

1. Read `.ai/INSTRUCTIONS.md` (shared instructions)
2. Read `.ai/WORKFLOW.md` (pipeline definitions)
3. Check `.ai/ROADMAP.md` (current version status)
4. Follow: **PLAN -> IMPLEMENT -> VERIFY -> DOCUMENT -> COMMIT -> PUSH**

---

## Gemini Runtime Defaults

- Use workspace-scoped skills before global skills when both apply.
- Keep edits minimal and targeted; do not refactor unrelated areas.
- Run validation before finalizing changes:

```bash
npm run validate
```

---

## Skills

Gemini should use the same repository conventions as the other supported tools. The canonical
workflow and agent definitions are in `.ai/`; tool-specific skills may be supplied by the local CLI.

### Claude Workflow Skills (`.claude/skills/`)

- `new-feature`
- `refactor`
- `verify`

If a user request clearly matches a repository workflow, follow the corresponding process in
`.ai/WORKFLOW.md` first.

---

## Shared References

| Purpose            | Path                  |
| ------------------ | --------------------- |
| Full instructions  | `.ai/INSTRUCTIONS.md` |
| Workflow pipelines | `.ai/WORKFLOW.md`     |
| Agent specs        | `.ai/AGENT_SPECS.md`  |
| Decisions          | `.ai/DECISIONS.md`    |
| Roadmap            | `.ai/ROADMAP.md`      |
| Claude skills      | `.claude/skills/`     |
| App skills catalog | `skills/`             |
| Changelog          | `CHANGELOG.md`        |
