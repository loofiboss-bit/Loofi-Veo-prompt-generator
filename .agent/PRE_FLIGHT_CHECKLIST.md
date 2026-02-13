# Pre-Flight Checklist

**Purpose**: Ensure every AI conversation follows the mandatory guidelines in `instructions.md`

---

## ✅ Before Starting ANY Work

### 1. Instructions Compliance

- [ ] Read `.agent/instructions.md` in full
- [ ] Understand current project phase (check ROADMAP section)
- [ ] Identify which agents to delegate to
- [ ] Review agent memory files for context

### 2. Agent Delegation Model

- [ ] **NEVER** operate as monolithic assistant
- [ ] Explicitly state which agent is handling each task
- [ ] Use format: `[agent-name] doing task...`
- [ ] Check agent memory before delegation

**Available Agents**:

- `project-coordinator` - Planning, task breakdown
- `architecture-advisor` - Design, patterns, structure
- `backend-builder` - Services, business logic
- `frontend-integration-builder` - UI components, stores
- `test-writer` - Testing, validation
- `release-planner` - Releases, versioning, CI/CD
- `code-implementer` - Implementation, bug fixes

### 3. Token Discipline

- [ ] Be concise (no essays)
- [ ] Use bullet lists
- [ ] No repetition of roadmap text
- [ ] Only ask questions if blocked
- [ ] Prefer diffs over narrative
- [ ] Batch work per version

### 4. Mandatory Output Format

Every response MUST contain:

1. **Version Checklist** (✅ / ⬜)
2. **Agent Execution Summary** (which agent did what)
3. **Changes** (max 10 bullets)
4. **Commands** (copy/paste ready)
5. **Diff** (or key file list if large)
6. **Release Notes** (max 8 bullets)

### 5. Project Context Verification

- [ ] Current version: Check `instructions.md` ROADMAP section
- [ ] Current sprint: Check progress tracking files
- [ ] Stack: React 18 + TypeScript + Vite + Electron + Zustand
- [ ] Package manager: npm

### 6. Global Rules (Every Version)

- [ ] Code updated
- [ ] README.md updated
- [ ] CHANGELOG.md updated (Keep-a-Changelog format)
- [ ] Version bumped everywhere
- [ ] Tests updated/added
- [ ] Build passes
- [ ] Release branch: `release/vX.Y.Z`
- [ ] Tag prepared: `vX.Y.Z`
- [ ] GitHub Release notes drafted

---

## 🚨 Red Flags (STOP if you see these)

- ❌ Long explanatory paragraphs
- ❌ No agent delegation mentioned
- ❌ Missing output format sections
- ❌ Undocumented changes
- ❌ No reference to agent memory
- ❌ Ignoring current roadmap phase
- ❌ Operating without checking instructions.md

---

## 📋 Quick Reference

**Current Phase**: Check `instructions.md` line 4
**Current Tasks**: Check `.agent/v1.X.0-tasks.md`
**Progress**: Check `.agent/v1.X.0-progress.md`
**Agent Memory**:

- Claude: `.claude/agent-memory/{agent-name}/MEMORY.md`
- ChatGPT: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`

---

## 🔄 Workflow Template

````
[project-coordinator] Analyzing request...
- Current phase: vX.Y.Z
- Scope: [brief description]
- Agents needed: [list]

[architecture-advisor] Checking MEMORY.md...
- [context from memory]
- [design decision]

[backend-builder] Implementing...
- [file changes]

[test-writer] Adding tests...
- [test files]

[release-planner] Updating docs...
- CHANGELOG.md
- README.md
- Version bump

✅ Version Checklist:
⬜ Code
⬜ Tests
⬜ Docs
⬜ Build

📝 Changes:
- [bullet 1]
- [bullet 2]

🔧 Commands:
```bash
npm run build
npm test
````

📦 Release Notes:

- [feature 1]
- [fix 1]

```

---

**Last Updated**: 2026-02-10
```
