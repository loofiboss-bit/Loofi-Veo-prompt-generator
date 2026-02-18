# Workflow Pipelines — Unified Reference

> Consolidates all pipeline definitions. Referenced by `.ai/INSTRUCTIONS.md`.
> All AI tools follow these pipelines regardless of platform (Claude, ChatGPT, Copilot, Codex).

---

## Pipeline Overview

| Pipeline             | Trigger               | Agents Used                        | Steps   |
| -------------------- | --------------------- | ---------------------------------- | ------- |
| Full Version Release | `Start vX.Y.Z`        | All 7                              | 5 steps |
| Single Feature       | `Implement [feature]` | 3-5 (selective)                    | 7 steps |
| Bug Fix              | `Fix [bug]`           | 2 (code-implementer + test-writer) | 4 steps |
| Release Only         | `Release vX.Y.Z`      | 1 (release-planner)                | 4 steps |
| Documentation        | `Document [scope]`    | 1 (release-planner)                | 2 steps |
| Planning             | `Plan [scope]`        | 1 (project-coordinator)            | 1 step  |
| Status Check         | `Review status`       | 1 (project-coordinator)            | 1 step  |
| Test Suite           | `Test [scope]`        | 1 (test-writer)                    | 3 steps |
| Rollback             | `Rollback vX.Y.Z`     | 1 (code-implementer)               | 4 steps |
| Dependency Update    | `Update deps`         | 1 (code-implementer)               | 5 steps |

---

## Pipeline: Full Version Release

**Trigger**: `Start vX.Y.Z`

```
Step 1: [project-coordinator] (high tier)
   → Read .ai/ROADMAP.md for version goals
   → Decompose into sprints with task breakdown
   → Output: ordered task list with dependencies
   → Template: .ai/templates/version-plan.md

Step 2: [architecture-advisor] (medium tier)
   → Review task list for architectural concerns
   → Flag any design decisions needed
   → Update .ai/DECISIONS.md if new decisions made
   → Output: approved plan or required changes

Step 3: For each sprint:
   3a: [backend-builder] (medium tier)
       → Implement services, types, business logic
       → Output: working service code

   3b: [frontend-integration-builder] (medium tier)
       → Implement components, stores, UI wiring
       → Depends on 3a completion
       → Output: working UI code

   3c: [test-writer] (low tier)
       → Write tests for new code
       → Output: test files

   3d: [code-implementer] (medium tier)
       → Integration, bug fixes, cleanup
       → Verify: npm run validate
       → Output: verified working build

Step 4: [release-planner] (low tier)
   → Update CHANGELOG.md
   → Update README.md
   → Run: bash scripts/sync-version.sh
   → Prepare git tag
   → Draft GitHub Release notes
   → Output: release-ready branch

Step 5: Commit + Push + Tag
   → Conventional commit messages
   → Push to release branch
   → Create tag vX.Y.Z
```

---

## Pipeline: Single Feature

**Trigger**: `Implement [feature name]`

```
Step 1: [project-coordinator] (high tier) — ONLY if complex feature
         OR skip if straightforward

Step 2: [architecture-advisor] (medium tier) — ONLY if structural change
         OR skip if follows existing patterns

Step 3: Implementation
   [backend-builder] (medium tier) → services/types if needed
   [frontend-integration-builder] (medium tier) → components/stores if needed
   [code-implementer] (medium tier) → general code changes

Step 4: [test-writer] (low tier) → tests for new code

Step 5: Verify
   → npm run validate
   → Fix any errors (max 3 attempts, then report to user)

Step 6: Document
   → CHANGELOG.md entry
   → README.md if user-facing
   → Code comments where non-obvious

Step 7: Commit + Push
```

---

## Pipeline: Bug Fix

**Trigger**: `Fix [bug description]`

```
Step 1: [code-implementer] (medium tier)
   → Diagnose root cause (read error, trace code path)
   → Implement fix
   → Verify: npm run validate

Step 2: [test-writer] (low tier)
   → Add regression test

Step 3: Document
   → CHANGELOG.md fix entry
   → Code comment at fix site if non-obvious

Step 4: Commit + Push
```

---

## Pipeline: Release Only

**Trigger**: `Release vX.Y.Z`

```
Step 1: [release-planner] (low tier)
   → Verify all features for version are complete
   → Update CHANGELOG.md with release date
   → Update README.md version references
   → Run: bash scripts/sync-version.sh
   → Run: bash scripts/pre-release-check.sh

Step 2: Build verification
   → npm run validate
   → npm run build
   → npm run dist (if desktop release)

Step 3: Git operations
   → Commit: "chore(release): vX.Y.Z"
   → Tag: vX.Y.Z
   → Push branch + tag

Step 4: GitHub Release
   → Draft release notes from CHANGELOG.md
   → Attach build artifacts if available
```

---

## Pipeline: Documentation Only

**Trigger**: `Document [scope]`

```
Step 1: [release-planner] (low tier)
   → Identify what changed since last docs update
   → Update CHANGELOG.md
   → Update README.md
   → Update USER_GUIDE.md if workflows changed
   → Update docs/ARCHITECTURE.md if structural changes

Step 2: Commit + Push
   → Commit: "docs(scope): description"
```

---

## Pipeline: Planning Only

**Trigger**: `Plan [feature or version]`

```
Step 1: [project-coordinator] (high tier)
   → Read .ai/ROADMAP.md
   → Decompose into tasks
   → Sequence by dependency
   → Output task breakdown

No implementation. No commits. Planning output only.
```

---

## Pipeline: Status Check

**Trigger**: `Review status`

```
Step 1: [project-coordinator] (low tier)
   → Read .ai/ROADMAP.md
   → Compare against actual codebase (check implemented features)
   → Report: done, in-progress, remaining, blockers

No implementation. No commits. Status output only.
```

---

## Pipeline: Test Suite (NEW)

**Trigger**: `Test [scope]`

```
Step 1: [test-writer] (low tier)
   → Identify untested code in scope
   → Write unit tests following Vitest patterns
   → Use vi.mock for idb-keyval and external deps

Step 2: Verify
   → npm run test (must pass)
   → npm run test:coverage (report coverage delta)

Step 3: Commit
   → Commit: "test(scope): add tests for [description]"
```

---

## Pipeline: Rollback (NEW)

**Trigger**: `Rollback vX.Y.Z`

```
Step 1: Assess
   → Identify what's broken and why
   → Determine rollback scope (full version or specific commits)

Step 2: [code-implementer] (medium tier)
   → Revert problematic commits (git revert, never force push)
   → OR fix forward if revert is more disruptive

Step 3: Verify
   → npm run validate
   → npm run build

Step 4: Document + Commit
   → CHANGELOG.md entry: "### Reverted"
   → Commit: "revert(scope): description"
```

---

## Pipeline: Dependency Update (NEW)

**Trigger**: `Update deps`

```
Step 1: Audit
   → npm audit (check for vulnerabilities)
   → npm outdated (list available updates)

Step 2: Update
   → Update patch/minor versions: npm update
   → For major versions: update one at a time

Step 3: Verify
   → npm run validate
   → npm run build
   → npm run dist (test desktop build)

Step 4: Test
   → Manual smoke test if UI-affecting deps changed
   → Run full test suite

Step 5: Commit
   → Commit: "chore(deps): update [package] to vX.Y.Z"
   → OR: "chore(deps): security update for [package]"
```

---

## Cost Optimization Rules

### Skip Expensive Agents When Possible

| Situation                        | Skip                                      | Use Instead                      |
| -------------------------------- | ----------------------------------------- | -------------------------------- |
| Feature follows existing pattern | architecture-advisor                      | code-implementer directly        |
| Simple bug fix                   | project-coordinator, architecture-advisor | code-implementer only            |
| Test writing                     | —                                         | Always low tier                  |
| Version bump / changelog         | —                                         | Always low tier                  |
| Complex multi-feature planning   | —                                         | Always high tier for coordinator |

### Batching

- Group related file changes into single agent calls
- Don't open separate agents for each small file edit
- Combine test writing for related features into one call
- Batch docs updates (CHANGELOG + README + comments) in one pass

### Context Reduction

- Never pass full file contents between agents — pass file paths + line ranges
- Reference ROADMAP.md by section, don't copy text
- Use agent memory for recurring context
- Max 3 files open at a time per agent

---

## Error Recovery

### Build Fails After Implementation

```
[code-implementer] (medium tier)
→ Read build error output
→ Fix type errors or import issues
→ Re-verify: npm run validate
→ If 3 attempts fail: STOP and report to user with:
  - Error message
  - What was attempted
  - Suggested next steps
```

### Agent Produces Incorrect Output

```
→ Do NOT retry with same instructions
→ Add more specific context (file content, error messages)
→ If structural problem: escalate to architecture-advisor
→ If still failing: report to user with diagnosis
```

### Git Push Fails

```
→ Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
→ If auth issue: report to user
→ If merge conflict: attempt auto-resolve, if complex report to user
```

### Test Failures

```
→ Read failure output
→ Determine if test is wrong or code is wrong
→ Fix the appropriate side
→ If test was wrong: add comment explaining expected behavior
→ Re-run: npm run test
```

---

## Validation Gates (Enforced)

Every pipeline passes through these gates before a commit is allowed.

### Gate 1: Code Quality

| Check            | Command                | Pass Criteria        |
| ---------------- | ---------------------- | -------------------- |
| Lint             | `npm run lint:ci`      | 0 warnings, 0 errors |
| TypeScript       | `npm run typecheck`    | 0 errors (strict)    |
| Formatting       | `npm run format:check` | 0 diffs              |
| Combined         | `npm run validate`     | All above + tests    |

### Gate 2: Infrastructure Integrity

| Check            | Command                                    | Pass Criteria      |
| ---------------- | ------------------------------------------ | ------------------ |
| MCP sync         | `bash scripts/sync-mcp-configs.sh --check` | 0 drift            |
| Agent sync       | `bash scripts/generate-agent-configs.sh --check` | 0 drift       |
| Version sync     | `bash scripts/sync-version.sh --check`     | All files match    |
| Full health      | `bash scripts/health-check.sh`             | 0 errors           |

### Gate 3: Build Verification

| Check            | Command              | Pass Criteria              |
| ---------------- | -------------------- | -------------------------- |
| Production build | `npm run build`      | Exit code 0, no warnings   |
| Desktop build    | `npm run dist`       | Only for release pipelines |

### Gate Shortcuts

- **Feature/Bug fix**: Gate 1 required, Gate 2 if config changed, Gate 3 recommended
- **Release**: All 3 gates mandatory
- **Docs only**: Gate 1 (format only), Gate 2 skipped, Gate 3 skipped
- **Dependency update**: All 3 gates mandatory

---

## Pre/Post Conditions Per Phase

### Implementation Phase

**Preconditions:**
- [ ] Plan exists (session plan.md or ROADMAP task list)
- [ ] Branch is up to date with main (`git pull --rebase`)
- [ ] All path aliases resolve (`@core/`, `@features/`, `@shared/`, `@infrastructure/`)

**Postconditions:**
- [ ] All new files use named exports (no default exports)
- [ ] Services follow singleton pattern with `getInstance()`
- [ ] Stores use Zustand + Zundo `temporal()` middleware
- [ ] Components wrapped in `ErrorBoundary` where appropriate
- [ ] No `any` types without eslint-disable + justification comment

### Testing Phase

**Preconditions:**
- [ ] Implementation is complete (all files saved)
- [ ] Mocks set up for `idb-keyval`, external services
- [ ] Test setup file (`src/test-setup.ts`) accessible

**Postconditions:**
- [ ] Tests co-located with source: `[name].test.ts(x)`
- [ ] Uses `vi.mock()` + `vi.hoisted()` for mock variables in factories
- [ ] Coverage thresholds met (statements 35%, branches 23%, functions 32%, lines 36%)
- [ ] No flaky tests (deterministic assertions, no `setTimeout` in tests)

### Documentation Phase

**Preconditions:**
- [ ] Implementation and tests complete
- [ ] `npm run validate` passes

**Postconditions:**
- [ ] `CHANGELOG.md` updated under `[Unreleased]` section
- [ ] `README.md` updated if user-facing feature
- [ ] Inline code comments for non-obvious logic only
- [ ] Version references consistent across package.json, metadata.json, manifest.json

### Commit Phase

**Preconditions:**
- [ ] All validation gates passed
- [ ] `git diff --cached` reviewed (no unintended changes)
- [ ] No secrets or credentials in staged files

**Postconditions:**
- [ ] Commit message follows: `type(scope): description`
- [ ] Types: feat, fix, refactor, docs, test, chore, ci, perf, revert, style
- [ ] Scope is kebab-case, subject ≤ 100 chars
- [ ] Co-authored-by trailer included for AI agents

---

## Automation Scripts Reference

| Script                             | Purpose                                  | CI Usage                  |
| ---------------------------------- | ---------------------------------------- | ------------------------- |
| `scripts/sync-mcp-configs.sh`      | Generate MCP configs from `.ai/mcp-servers.json` | `--check` in validate.yml |
| `scripts/generate-agent-configs.sh`| Generate agent configs from `.ai/agents/` | `--check` in validate.yml |
| `scripts/validate-agent-config.sh` | Validate agent configs exist and valid   | validate.yml              |
| `scripts/sync-version.sh`          | Sync version across package/meta/manifest| Release pipeline          |
| `scripts/health-check.sh`          | Master AI infrastructure validator       | Manual / pre-release      |
| `scripts/lint-ci.mjs`              | Custom lint CI with threshold            | validate.yml              |
| `scripts/pre-release-check.sh`     | Pre-release verification                 | Release pipeline          |

---

## Drift Prevention Strategy

### What Drifts

1. **MCP configs** — 4 platform files diverge from SSoT
2. **Agent definitions** — `.claude/agents/` and `.chatgpt/agents/` diverge from `.ai/agents/`
3. **Versions** — package.json, metadata.json, manifest.json go out of sync
4. **Skills** — Platform skills fall behind canonical skills

### How We Prevent Drift

1. **Single Source of Truth** — `.ai/` directory owns canonical definitions
2. **Generation scripts** — Platform configs are generated, not manually edited
3. **CI enforcement** — `validate.yml` runs `--check` mode on every PR
4. **Health check** — `scripts/health-check.sh` validates everything in one pass
5. **Pre-commit hooks** — Husky runs lint-staged + commitlint on every commit

### When to Run What

| Trigger              | Script                            |
| -------------------- | --------------------------------- |
| Changed MCP config   | `bash scripts/sync-mcp-configs.sh`|
| Changed agent spec   | `bash scripts/generate-agent-configs.sh` |
| Before release       | `bash scripts/health-check.sh`    |
| Version bump         | `bash scripts/sync-version.sh`    |
| Before any commit    | `npm run validate` (automatic via Husky) |
