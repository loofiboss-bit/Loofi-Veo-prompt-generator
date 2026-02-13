# Template: Bug Fix

## Pipeline

```
DIAGNOSE → FIX → VERIFY → DOCUMENT → COMMIT
```

## Checklist

- [ ] Root cause identified
- [ ] Fix implemented
- [ ] `npm run build` passes
- [ ] Regression test added (if applicable)
- [ ] CHANGELOG.md updated (### Fixed section)
- [ ] Committed with `fix(scope): description`
- [ ] Pushed to branch

## Agent Routing

| Complexity               | Agents Used                  | Models |
| ------------------------ | ---------------------------- | ------ |
| Simple (known cause)     | code-implementer             | haiku  |
| Medium (needs diagnosis) | code-implementer             | sonnet |
| Complex (systemic)       | architect + code-implementer | sonnet |

## Commit Format

```
fix(scope): short description of fix
```
