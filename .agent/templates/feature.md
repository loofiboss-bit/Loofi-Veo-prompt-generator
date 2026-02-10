# Template: Implement Feature

## Pipeline

```
PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT
```

## Checklist

- [ ] Feature planned (task breakdown if complex)
- [ ] Types/interfaces defined
- [ ] Service layer implemented (if needed)
- [ ] Store layer implemented (if needed)
- [ ] Component layer implemented (if needed)
- [ ] Integration verified
- [ ] `npm run build` passes
- [ ] CHANGELOG.md updated (### Added section)
- [ ] README.md updated (if user-facing)
- [ ] Committed with `feat(scope): description`
- [ ] Pushed to branch

## Agent Routing

| Complexity | Agents Used | Models |
|------------|-------------|--------|
| Simple (follows pattern) | code-implementer + test-writer | sonnet + haiku |
| Medium (new component) | backend/frontend-builder + test-writer | sonnet + haiku |
| Complex (new system) | coordinator + architect + builders + test-writer | opus + sonnet + haiku |

## Commit Format

```
feat(scope): short description of feature

- Detail 1
- Detail 2
```
