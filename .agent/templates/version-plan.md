# Template: Version Planning

## Pipeline

```
ANALYZE → DECOMPOSE → SEQUENCE → OUTPUT
```

## Checklist

- [ ] Read ROADMAP.md for version goals
- [ ] Analyze current codebase state
- [ ] Decompose into sprints (1-2 weeks each)
- [ ] Each sprint has 3-7 atomic tasks
- [ ] Tasks ordered by dependency
- [ ] Each task has: description, affected files, size (S/M/L), dependencies
- [ ] Agent assignments per task
- [ ] Model assignments per task (cost-optimized)
- [ ] Total effort estimated

## Agent Routing

Always use: project-coordinator (opus)

## Output Format

```markdown
## vX.Y.Z — [Theme Name]

### Sprint 1: [Name] (Week N)
| # | Task | Agent | Model | Size | Depends |
|---|------|-------|-------|------|---------|
| 1 | ... | backend-builder | sonnet | M | — |
| 2 | ... | frontend-builder | sonnet | L | 1 |
| 3 | ... | test-writer | haiku | S | 1,2 |

### Sprint 2: [Name] (Week N+1)
...

### Release Sprint
| # | Task | Agent | Model | Size |
|---|------|-------|-------|------|
| N | Update CHANGELOG | release-planner | haiku | S |
| N+1 | Update README | release-planner | haiku | S |
| N+2 | Version bump | release-planner | haiku | S |
| N+3 | Tag + push | release-planner | haiku | S |
```
