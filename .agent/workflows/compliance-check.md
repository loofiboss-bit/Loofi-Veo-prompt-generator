---
description: Validate compliance with .agent/instructions.md
---

# Instructions Compliance Validation

This workflow ensures all AI conversations follow the mandatory guidelines in `.agent/instructions.md`.

## Purpose

Verify that the current conversation and code changes comply with:

- Agent delegation model
- Token discipline
- Mandatory output format
- Agent memory usage
- Project roadmap adherence
- Global rules (docs, tests, versioning)

## Steps

### 1. Review Instructions File

```bash
cat .agent/instructions.md | head -n 100
```

Check for:

- Current version (line 4)
- Current roadmap phase
- Agent delegation requirements
- Output format requirements

### 2. Verify Agent Delegation

Review recent responses and check:

- [ ] Explicit agent delegation statements present
- [ ] Format: `[agent-name] doing task...`
- [ ] No monolithic operation
- [ ] Multiple agents used for complex tasks

### 3. Check Output Format Compliance

Every implementation response should have:

- [ ] Version Checklist (✅ / ⬜)
- [ ] Agent Execution Summary
- [ ] Changes (max 10 bullets)
- [ ] Commands (copy/paste ready)
- [ ] Diff or file list
- [ ] Release Notes (max 8 bullets)

### 4. Verify Agent Memory Usage

```bash
ls -la .claude/agent-memory/*/MEMORY.md 2>/dev/null || true
ls -la .chatgpt/agent-memory/*/MEMORY.md 2>/dev/null || true
```

Check that agents referenced their memory:

- [ ] Architecture decisions from `architecture-advisor/MEMORY.md`
- [ ] Service patterns from `backend-builder/MEMORY.md`
- [ ] UI patterns from `frontend-integration-builder/MEMORY.md`
- [ ] Testing strategy from `test-writer/MEMORY.md`

### 5. Validate Global Rules

For any version work, verify:

```bash
# Check version consistency
grep -r "version" package.json package-lock.json
```

- [ ] Code updated
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped everywhere
- [ ] Tests updated/added
- [ ] Build passes

### 6. Check Token Discipline

Review responses for:

- [ ] Concise (no long explanations)
- [ ] Bullet lists used
- [ ] No roadmap repetition
- [ ] Diffs over narrative
- [ ] Batched work

### 7. Verify Roadmap Alignment

```bash
cat .agent/instructions.md | grep -A 20 "ROADMAP"
```

Check:

- [ ] Current phase identified correctly
- [ ] Tasks align with roadmap
- [ ] Progress tracking updated
- [ ] No scope creep beyond current version

## Remediation

If compliance issues found:

1. **Missing agent delegation**: Restart with explicit delegation
2. **Wrong output format**: Reformat response per template
3. **No memory usage**: Review agent memory files and incorporate
4. **Missing docs**: Update README.md, CHANGELOG.md immediately
5. **Token bloat**: Condense to bullets and diffs only

## Validation Command

// turbo

```bash
echo "✅ Instructions Compliance Check"
echo "================================"
echo ""
echo "📄 Instructions file:"
ls -lh .agent/instructions.md
echo ""
echo "📋 Pre-flight checklist:"
ls -lh .agent/PRE_FLIGHT_CHECKLIST.md
echo ""
echo "🤖 Agent memory files:"
find .claude/agent-memory .chatgpt/agent-memory -name "MEMORY.md" -exec ls -lh {} \; 2>/dev/null
echo ""
echo "📚 Current version:"
grep '"version"' package.json
echo ""
echo "✅ Compliance check complete"
```

## Success Criteria

- All checklist items marked ✅
- Agent delegation explicit in all responses
- Output format matches template
- Documentation updated
- Build passes
- No token bloat

---

**Last Updated**: 2026-02-10
