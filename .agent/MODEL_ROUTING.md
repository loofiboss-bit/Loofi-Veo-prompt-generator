# Model Routing Strategy — Cost Optimization

## Goal

Minimize token costs while maintaining quality and speed.
Use the cheapest model that can handle the task correctly.

---

## Cross-Model Equivalency

Use the same routing logic across assistants:

| Tier | Claude | ChatGPT |
|------|--------|---------|
| High reasoning | opus | gpt-5 |
| Default implementation | sonnet | gpt-5-mini |
| Low-cost templated | haiku | gpt-5-nano |

---

## Model Tiers

| Model | Cost Tier | Use For | Avoid For |
|-------|-----------|---------|-----------|
| **opus** | $$$ High | Complex reasoning, multi-step planning, architectural decisions requiring deep analysis | Simple implementations, repetitive tasks, templated work |
| **sonnet** | $$ Medium | Code implementation, design review, integration work, moderate complexity tasks | Simple lookups, version bumps, test generation from templates |
| **haiku** | $ Low | Tests, docs updates, version bumps, status checks, simple code changes, templated operations | Complex architectural decisions, multi-file refactors |

---

## Agent → Model Assignments

### project-coordinator → opus (only when planning)

**When opus**: Multi-version planning, complex feature decomposition, roadmap strategy
**When haiku**: Simple status checks, reviewing existing plans

Decision rule: If the task requires reasoning about 5+ interdependent components → opus. Otherwise → haiku.

### architecture-advisor → sonnet

**When sonnet**: Design decisions, pattern evaluation, structural review
**When haiku**: Simple "does this follow existing patterns?" checks

Decision rule: If introducing a new pattern or making a structural change → sonnet. If verifying existing patterns → haiku.

### backend-builder → sonnet

**When sonnet**: New services, complex business logic, database schema changes
**When haiku**: Adding a method to existing service following established pattern

Decision rule: If creating something new or complex → sonnet. If extending existing code with established patterns → haiku.

### frontend-integration-builder → sonnet

**When sonnet**: New components, complex state management, multi-store integration
**When haiku**: Adding props to existing component, simple UI tweaks

Decision rule: Same as backend-builder.

### code-implementer → sonnet

**When sonnet**: Bug diagnosis, refactors, integration work
**When haiku**: Simple fixes where the cause is already known

Decision rule: If diagnosis required → sonnet. If fix is obvious → haiku.

### test-writer → haiku (default)

**When haiku**: All standard test writing (unit tests, mocking, assertions)
**When sonnet**: Only if testing complex async flows or edge cases requiring deep analysis

Decision rule: Default haiku. Upgrade to sonnet only if haiku produces incorrect tests.

### release-planner → haiku (default)

**When haiku**: Version bumps, changelog updates, release prep, docs
**When sonnet**: Only if release involves migration strategy or breaking changes

Decision rule: Default haiku. Upgrade to sonnet only for complex releases.

---

## Cost Reduction Tactics

### 1. Agent Skipping

Not every task needs every agent. Skip agents that add no value:

| Task Type | Required Agents | Skip |
|-----------|----------------|------|
| Simple bug fix | code-implementer | All others |
| Add method to existing service | backend-builder | coordinator, architect |
| New feature (follows pattern) | backend-builder, frontend-builder | coordinator, architect |
| New feature (new pattern) | ALL agents | None |
| Version release | release-planner | All others |
| Status check | project-coordinator (haiku) | All others |

### 2. Batch Operations

- Combine related test writes into one test-writer call
- Combine all doc updates into one release-planner call
- Don't use separate agents for each file — batch by operation type

### 3. Context Minimization

- Pass file paths, not file contents, between agents
- Use agent memory for recurring context (no need to re-explain the stack)
- Reference sections of ROADMAP.md by header, not by copying text
- Keep agent prompts under 500 tokens where possible

### 4. Memory-Based Shortcuts

If agent memory contains the answer, skip the exploration:

```
[backend-builder] Checking MEMORY.md...
→ Found: "Service pattern: class with static methods, IndexedDB via idb-keyval"
→ Skipping architecture review, proceeding with implementation
```

### 5. Progressive Escalation

Start with cheapest model. Escalate only on failure:

```
Attempt 1: haiku
→ If incorrect/incomplete: sonnet
→ If still failing: opus
→ If still failing: report to user
```

---

## Estimated Cost Profile Per Operation

| Operation | Agents Used | Models | Relative Cost |
|-----------|-------------|--------|---------------|
| Simple bug fix | 1 | haiku | $ |
| Add tests | 1 | haiku | $ |
| Version bump + docs | 1 | haiku | $ |
| Single feature (existing pattern) | 2 | sonnet + haiku | $$ |
| Single feature (new pattern) | 3-4 | sonnet × 2 + haiku | $$$ |
| Full version planning | 1 | opus | $$$ |
| Full version implementation | 5-7 | opus + sonnet × 3 + haiku × 2 | $$$$ |

---

## Monthly Cost Targets

Assuming ~20 working days, 3-5 tasks/day:

- **Development phase** (heavy implementation): ~60% sonnet, ~25% haiku, ~15% opus
- **Maintenance phase** (bug fixes, docs): ~20% sonnet, ~70% haiku, ~10% opus
- **Release phase** (prep, version bumps): ~10% sonnet, ~80% haiku, ~10% opus

Target: Keep opus usage under 15% of total agent calls.
