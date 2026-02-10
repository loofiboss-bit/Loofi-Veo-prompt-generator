# Automated Workflow Pipeline

## Overview

This defines the exact steps every task follows. Agents execute these automatically.
No stage is skipped. No manual intervention needed unless blocked.

---

## Pipeline: Full Version Release

**Trigger**: `Start vX.Y.Z`

```
Step 1: [project-coordinator] (opus)
   → Read ROADMAP.md for version goals
   → Decompose into sprints with task breakdown
   → Output: ordered task list with dependencies

Step 2: [architecture-advisor] (sonnet)
   → Review task list for architectural concerns
   → Flag any design decisions needed
   → Output: approved plan or required changes

Step 3: For each sprint:
   3a: [backend-builder] (sonnet)
       → Implement services, types, business logic
       → Output: working service code

   3b: [frontend-integration-builder] (sonnet)
       → Implement components, stores, UI wiring
       → Depends on 3a completion
       → Output: working UI code

   3c: [test-writer] (haiku)
       → Write tests for new code
       → Output: test files

   3d: [code-implementer] (sonnet)
       → Integration, bug fixes, cleanup
       → Build verification: npm run build
       → Output: verified working build

Step 4: [release-planner] (haiku)
   → Update CHANGELOG.md
   → Update README.md
   → Bump package.json version
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
Step 1: [project-coordinator] (opus) — only if complex
         OR skip to Step 2 if straightforward

Step 2: [architecture-advisor] (sonnet) — only if structural
         OR skip to Step 3 if follows existing patterns

Step 3: Implementation
   [backend-builder] (sonnet) → services/types if needed
   [frontend-integration-builder] (sonnet) → components/stores if needed
   [code-implementer] (sonnet) → general code changes

Step 4: [test-writer] (haiku) → tests for new code

Step 5: Verify
   → npm run build
   → Fix any errors

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
Step 1: [code-implementer] (sonnet)
   → Diagnose root cause
   → Implement fix
   → Verify build passes

Step 2: [test-writer] (haiku)
   → Add regression test if applicable

Step 3: Document
   → CHANGELOG.md fix entry

Step 4: Commit + Push
```

---

## Pipeline: Release Only

**Trigger**: `Release vX.Y.Z`

```
Step 1: [release-planner] (haiku)
   → Verify all features for version are complete
   → Update CHANGELOG.md with release date
   → Update README.md version references
   → Bump package.json
   → Bump metadata.json
   → Bump manifest.json

Step 2: Build verification
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
Step 1: [release-planner] (haiku)
   → Identify what changed since last docs update
   → Update CHANGELOG.md
   → Update README.md
   → Update USER_GUIDE.md if workflows changed
   → Update docs/ARCHITECTURE.md if structural changes

Step 2: Commit + Push
```

---

## Pipeline: Planning Only

**Trigger**: `Plan [feature or version]`

```
Step 1: [project-coordinator] (opus)
   → Read ROADMAP.md
   → Decompose into tasks
   → Sequence by dependency
   → Output task breakdown

No implementation. No commits. Planning output only.
```

---

## Pipeline: Status Check

**Trigger**: `Review status`

```
Step 1: [project-coordinator] (haiku)
   → Read ROADMAP.md
   → Compare against actual codebase
   → Report: done, in-progress, remaining, blockers

No implementation. No commits. Status output only.
```

---

## Cost Optimization Rules

### Skip expensive agents when possible

| Situation | Skip | Use Instead |
|-----------|------|-------------|
| Feature follows existing pattern | architecture-advisor | code-implementer directly |
| Simple bug fix | project-coordinator, architecture-advisor | code-implementer only |
| Test writing | — | Always haiku |
| Version bump / changelog | — | Always haiku |
| Complex multi-feature planning | — | Always opus for coordinator |

### Batch operations

- Group related file changes into single agent calls
- Don't open separate agents for each small file edit
- Combine test writing for related features into one call

### Context reduction

- Never pass full file contents between agents — pass file paths + line ranges
- Reference ROADMAP.md by section, don't copy text
- Use agent memory for recurring context (stack info, patterns, conventions)

---

## Error Recovery

### Build fails after implementation

```
[code-implementer] (sonnet)
→ Read build error output
→ Fix type errors or import issues
→ Re-verify build
→ If 3 attempts fail: stop and report to user
```

### Agent produces incorrect output

```
→ Do not retry with same instructions
→ Add more specific context
→ If structural problem: escalate to architecture-advisor
→ If still failing: report to user with diagnosis
```

### Git push fails

```
→ Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
→ If persistent: report to user
```
