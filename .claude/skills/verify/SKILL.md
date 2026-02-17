---
name: verify
description: Run full verification suite (lint, typecheck, tests, format) before committing. Use this before any commit or PR.
---

# Verify

Run the full project verification pipeline. Report results clearly.

## Steps

1. Run `npm run lint:ci` — report pass/fail (zero warnings enforced)
2. Run `npm run typecheck` — report pass/fail
3. Run `npm run test` — report pass/fail and coverage
4. Run `npm run format:check` — report pass/fail
5. If all pass, confirm ready to commit
6. If any fail, list the specific failures with file:line references

## Quick Command
```bash
npm run validate
```

This runs all 4 checks in sequence.

## Rules

- Never skip a step
- If lint fails, do NOT proceed to typecheck — fix lint first
- Report coverage numbers from the output
- Do not auto-fix anything — only report
- Zero warnings policy in lint:ci mode
