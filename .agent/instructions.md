ROLE: You are Claude Code operating inside the repository:
Loofi-Veo-prompt-generator

**Current Version**: v1.3.0 (Workflow Integration - IN PROGRESS)

You MUST actively utilize the agents under:

.claude/

Available agents:
• project-coordinator.md
• architecture-advisor.md
• backend-builder.md
• frontend-integration-builder.md
• test-writer.md
• release-planner.md
• code-implementer.md

You are NOT allowed to operate as a monolithic assistant.
You must delegate.

--------------------------------------------------

TOKEN DISCIPLINE (STRICT)
--------------------------------------------------

- Be concise.
- No long explanations.
- Use bullet lists.
- No repetition of roadmap text.
- Only ask questions if blocked.
- Batch work per version (code + tests + docs + release prep).
- Prefer diffs over narrative.
- Avoid unnecessary context carryover.

--------------------------------------------------

MANDATORY OUTPUT FORMAT
--------------------------------------------------

Every implementation response must contain:

1) Version Checklist (✅ / ⬜)
2) Agent Execution Summary (which agent did what)
3) Changes (max 10 bullets)
4) Commands (copy/paste)
5) Diff (or key file list if large)
6) Release Notes (max 8 bullets)

No essays.

--------------------------------------------------

AGENT UTILIZATION MODEL (MANDATORY)
--------------------------------------------------

You MUST explicitly state delegation like:

[project-coordinator] defining scope...
[architecture-advisor] reviewing schema design...
[backend-builder] implementing schema logic...
[frontend-integration-builder] updating UI...
[test-writer] adding tests...
[release-planner] preparing version bump + changelog...
[code-implementer] final integration + cleanup...

Agents available (must be used):

• project-coordinator
• architecture-advisor
• backend-builder
• frontend-integration-builder
• test-writer
• release-planner
• code-implementer

Do not skip agents.

--------------------------------------------------

AGENT MEMORY SYSTEM
--------------------------------------------------

Each agent has persistent memory at:
`.claude/agent-memory/{agent-name}/MEMORY.md`

**Before delegating**, reference agent memory for context:

Example:

```plaintext
[architecture-advisor] Checking MEMORY.md...
- Current stack: React 18 + TypeScript + Zustand
- Service layer complete (5 services)
- Next: UI components for services

[architecture-advisor] Reviewing integration approach...
```

**Agent Memory Contents**:

• **architecture-advisor** - Stack, services, patterns, next tasks
• **backend-builder** - Completed services, pending work
• **frontend-integration-builder** - Existing components, Sprint 4 tasks
• **project-coordinator** - Version status, sprint breakdown
• **test-writer** - Testing strategy, manual checklist
• **release-planner** - Release process, CI/CD, checklist
• **code-implementer** - Coding standards, current tasks

**Memory is updated** as project evolves.
Always check memory before delegation.

--------------------------------------------------

INITIAL ACTION (ALWAYS FIRST)
--------------------------------------------------

Inspect repo locally and detect:

- Framework (Next.js / Vite / React / TS / etc.)
- Package manager (npm / pnpm / yarn)
- Build scripts
- Existing CI workflows
- Prompt schema format (JSON templates, generators, etc.)

Summarize stack in 3 bullets maximum, then proceed.

--------------------------------------------------

GLOBAL RULES (NON-NEGOTIABLE)
--------------------------------------------------

For EVERY version:

A) Code updated
B) README.md updated
C) CHANGELOG.md updated (Keep-a-Changelog)
D) Version bumped everywhere
E) Tests updated/added
F) Build passes
G) Release branch: release/vX.Y.Z
H) Tag prepared: vX.Y.Z
I) GitHub Release notes drafted

No undocumented changes allowed.

--------------------------------------------------

PROJECT GOALS
--------------------------------------------------

This is a Veo prompt generator.

Primary objectives:

1) Always generate valid structured prompt output.
2) Clean schema logic separated from UI.
3) Presets system.
4) Shareable/exportable prompts.
5) Strong validation + helpful errors.
6) High performance UI.
7) Maintainable architecture.

--------------------------------------------------

ROADMAP (ACTUAL PROJECT STATUS)
--------------------------------------------------

✅ v1.1.0 — Stabilization (RELEASED 2026-02-09)
✅ v1.2.0 — Productivity Layer (RELEASED 2026-02-16)
🔄 v1.3.0 — Workflow Integration (IN PROGRESS - 30% complete)
⏳ v1.4.0 — UX Professionalization (PLANNED)
⏳ v2.0.0 — Major Expansion (PLANNED)

--------------------------------------------------

v1.3.0 — Workflow Integration (COMPLETE ✅)

Status: 100% complete 🎉
Target: 2026-02-23

✅ Sprint 1-3: Core Services (COMPLETE)

- historyService.ts
- diffService.ts
- projectService.ts
- databaseService.ts
- apiExportService.ts

✅ Sprint 4: UI Components (COMPLETE)

- frontend-integration-builder → HistoryPanel.tsx ✅
- frontend-integration-builder → DiffViewer.tsx ✅
- frontend-integration-builder → ProjectManager.tsx ✅
- frontend-integration-builder → Sidebar.tsx ✅
- frontend-integration-builder → ApiExportModal.tsx ✅

✅ Sprint 5: Integration (COMPLETE)

- useProjectStore.ts ✅
- useHistoryStore.ts ✅
- Database initialization ✅
- Auto-save to history ✅

✅ Sprint 6: Additional Features (COMPLETE)

- Sidebar UI wiring ✅
- Navigation state management ✅
- searchService.ts ✅
- Layout adjustments for sidebar ✅

✅ Sprint 7: Release (COMPLETE)

- CHANGELOG.md updated ✅
- README.md updated ✅
- package.json version 1.3.0 ✅
- Progress tracking complete ✅

**Next Steps**:

- Build verification: `npm run dist`
- GitHub Release creation
- Tag and push: `git tag v1.3.0 && git push origin v1.3.0`

--------------------------------------------------

v1.4.0 — UX Professionalization (PLANNED)

Use:

- frontend-integration-builder → UI polish pass
- architecture-advisor → plugin architecture foundation
- test-writer → accessibility tests
- release-planner → auto-update system

Goals:

- Full UI polish
- Onboarding flow
- Accessibility (ARIA, keyboard nav)
- Plugin-ready architecture
- Auto-update system
- Stable/beta channels

--------------------------------------------------

v2.0.0 — Major Expansion (PLANNED)

Use:

- architecture-advisor → modular plugin system
- backend-builder → visual block composer
- frontend-integration-builder → workspace customization
- test-writer → full testing suite
- release-planner → signed builds

Goals:

- Modular plugin system
- Visual block-based prompt composer
- Multi-project workspace
- AI-assisted formatting
- Full testing suite (unit + integration)
- Signed builds for all platforms

--------------------------------------------------

CURRENT FOCUS
--------------------------------------------------

**Phase**: v1.3.0 Sprint 4 (UI Components)
**Next Task**: HistoryPanel Component
**Progress**: 30% → 50% (after Sprint 4)
**Target Release**: 2026-02-23

Refer to:

- `.agent/ROADMAP.md` for detailed status
- `.agent/v1.3.0-tasks.md` for task breakdown
- `.agent/v1.3.0-progress.md` for progress tracking

--------------------------------------------------

STACK SUMMARY
--------------------------------------------------

- **Framework**: React 18 + TypeScript + Vite
- **Desktop**: Electron 40
- **State**: Zustand + Zundo (undo/redo)
- **Storage**: IndexedDB (idb-keyval)
- **Styling**: TailwindCSS
- **Package Manager**: npm
- **Build**: electron-builder
- **CI/CD**: GitHub Actions

--------------------------------------------------

START CONDITION
--------------------------------------------------

When user says:
"Continue v1.3.0" or "Start Sprint 4"

Begin execution using agent delegation.
Do not skip delegation.
Keep output compact.
I’ve reviewed your repository structure. This is no longer a simple prompt generator — it is a full-scale Electron + React + TypeScript production system with:

- Electron desktop wrapper (`electron/main.cjs`)
- Extensive modular component architecture
- Hooks-based state logic
- Timeline system
- Project manager
- Studios (Audio, Video, Image, Generative Canvas, etc.)
- CI workflow already configured
- Documentation discipline in place
- Agent orchestration under `.claude/` and `.agent/`

You are effectively building a creative operating system, not a prompt tool.

Stack Observed:

- React + TypeScript
- Electron desktop shell via Electron
- GitHub CI/CD via GitHub
- Modular feature panels and studio system

Given your current maturity (v1.4.x territory based on files), the next roadmap should move toward performance, modularization, collaboration, and production reliability.

Below is the forward roadmap.

---

NEXT ROADMAP (Post v1.4.x Phase)

Version 1.5.0 – Performance & Stability Consolidation

Objective: Make the system feel fast, reliable, and scalable.

Engineering:

- Introduce strict state boundary isolation (separate UI state from project state).
- Implement lazy loading for heavy studios (VideoAnalysisStudio, Timeline, GenerativeCanvas).
- Introduce performance profiling baseline.
- Reduce Electron main ↔ renderer IPC overhead.
- Memory audit for Timeline + large projects.
- Add structured error boundary system for each major panel.

UX:

- Add loading skeletons instead of blocking spinners.
- Improve Timeline rendering performance.
- Add "Safe Mode" launch option (disable heavy plugins on crash recovery).

Bug Fix Discipline:

- Add centralized error logging service (local file log).
- Fix race conditions in collaborative hooks.
- Improve hotkey conflicts resolution.

DevOps:

- Enforce type coverage thresholds.
- CI must fail if build size increases beyond threshold.
- Publish signed Windows builds + AppImage.
- Add automated changelog validation.

---

Version 1.6.0 – Architecture Hardening & Plugin API v1

Objective: Formalize extension capability.

Engineering:

- Extract plugin interface layer.
- Define StudioPlugin interface contract.
- Convert selected studios into internal plugins (Audio, Image).
- Add plugin registration lifecycle (init, mount, teardown).
- Define version compatibility rules.

UX:

- Add Plugin Manager panel.
- Allow enabling/disabling internal plugins.
- Plugin crash isolation (sandbox boundary).

Security:

- Harden preload scripts in Electron.
- Strict context isolation enforcement.

Documentation:

- Publish Plugin API documentation.
- Add architecture diagram v2.
- Add extension development guide.

---

Version 1.7.0 – Project Intelligence Layer

Objective: Make projects “aware”.

Features:

- Project health scoring (based on structure completeness).
- Scene consistency validator.
- Timeline integrity checker.
- Dependency map visualization.
- Prompt quality scoring refinement (extend QualityMeter).

Engineering:

- Introduce analysis engine service layer.
- Decouple validation logic from UI components.
- Add background worker processing for heavy analysis.

UX:

- Add “Diagnostics” tab.
- Visual graph view of project components.
- Inline issue highlighting in panels.

DevOps:

- Add integration tests for project lifecycle.
- Add regression tests for prompt logic hooks.

---

Version 1.8.0 – Workflow Automation & Batch System

Objective: Move from manual creation to production pipelines.

Features:

- Batch prompt generation system.
- Multi-scene export.
- Export profiles per target model.
- Project export bundles (zip with metadata).
- CLI mode for headless generation.

Engineering:

- Introduce export service abstraction.
- Separate export layer from UI modals.
- Add job queue manager.
- Add background processing status panel.

UX:

- Job manager dashboard.
- Export history log.
- Retry failed jobs.

DevOps:

- CI builds CLI artifact.
- Add versioned export format schema.
- Add migration handler for project version changes.

---

Version 2.0.0 – Platform Transformation Release

Objective: Transition from application to creative platform.

Major Changes:

1. Workspace Engine

- Multi-workspace support.
- Workspace-level settings.
- Custom layouts per workspace.

1. Visual Composer System

- Drag-and-drop prompt block builder.
- Timeline + prompt linked graph.
- Visual dependency editing.

1. Extension Marketplace Foundation

- Remote plugin registry support.
- Plugin signing system.
- Plugin sandbox execution model.

1. Performance Upgrade

- Introduce renderer virtualization for large timelines.
- Worker-thread heavy processing.
- Memory leak monitoring system.

1. Production-Grade Desktop Delivery

- Full auto-update system.
- Differential updates.
- Stable / Beta channels.
- macOS signed DMG builds.

1. Observability

- Local crash reporter.
- Optional telemetry (opt-in).
- Debug mode with internal inspector.

1. Testing Maturity

- Unit + integration + UI snapshot tests.
- Automated smoke tests in CI.
- Build reproducibility validation.

---

Mandatory Governance for All Upcoming Versions

- Every feature requires:

  - README update
  - USER_GUIDE update
  - CHANGELOG update
  - Screenshot update (if UI changes)
- CI blocks merge if documentation files untouched during feature PR.
- No new feature without test coverage.
- No release without signed artifacts.
- No breaking change without migration strategy.

---

Strategic Observation

You are already beyond a “prompt generator.”
You are building:

A modular cinematic AI creation desktop platform.

The next critical step is architectural formalization and performance maturity — not adding more features blindly.

If you want, I can now:

- Generate a strict milestone breakdown for GitHub issues.
- Write a CLAUDE.md execution directive for 1.5.0.
- Or design a refactor map to reduce component coupling before 2.0.
