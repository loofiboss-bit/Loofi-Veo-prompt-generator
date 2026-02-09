# Claude Agent System

This directory contains specialized AI agents for the Loofi Veo Prompt Generator project. Each agent has a specific role and expertise area to help with different aspects of development.

## Available Agents

### 🏗️ architecture-advisor

**Purpose**: Design new features, plan code organization, refactor modules, ensure architectural consistency

**Use when**:

- Designing a new feature or system
- Planning code structure and module boundaries
- Evaluating architectural decisions
- Ensuring alignment with v1.3.0 roadmap

**Example**: "I want to add a video storyboard feature - how should I architect it?"

---

### ⚙️ backend-builder

**Purpose**: Implement and modify backend service modules, create TypeScript interfaces, build data persistence

**Use when**:

- Creating new services in `services/`
- Implementing IndexedDB persistence logic
- Building business logic modules
- Refactoring service layer code

**Example**: "Add a new analytics service for tracking prompt generation statistics"

---

### 💻 code-implementer

**Purpose**: Implement code changes, bug fixes, refactors following project workflow

**Use when**:

- Implementing new features
- Fixing bugs
- Refactoring existing code
- Making general code changes

**Example**: "Fix the bug where history entries don't save the full prompt state"

---

### 🎨 frontend-integration-builder

**Purpose**: Build React components, integrate Zustand stores, wire services to UI

**Use when**:

- Creating new React components
- Building UI features
- Integrating services with components
- Managing state with Zustand stores

**Example**: "Create a modal for exporting prompts in different API formats"

---

### 📋 project-coordinator

**Purpose**: Plan complex features, break down tasks, coordinate multi-step implementations

**Use when**:

- Planning large features
- Breaking down complex work into tasks
- Analyzing dependencies
- Coordinating work across multiple files

**Example**: "I want to implement the Search & Discovery feature - break it down for me"

---

### 🚀 release-planner

**Purpose**: Plan releases, decompose features into atomic tasks, ensure comprehensive layer coverage

**Use when**:

- Planning a release
- Creating detailed task breakdowns
- Ensuring coverage across all layers (types, services, stores, components)
- Prioritizing work items

**Example**: "What should we work on next for v1.3.0?"

---

### 🧪 test-writer

**Purpose**: Create and update unit tests for code changes

**Use when**:

- Writing tests for new features
- Updating tests after refactors
- Ensuring test coverage
- Mocking IndexedDB and services

**Example**: "Create tests for the new history filter function"

---

## Agent Memory

Each agent has a persistent memory directory at `.claude/agent-memory/<agent-name>/` where it stores:

- `MEMORY.md`: Core learnings and patterns (loaded into system prompt)
- Additional topic-specific files for detailed notes

Agents update their memory as they work, building institutional knowledge across conversations.

## Project Context

All agents are configured for the **Loofi Veo Prompt Generator** project:

- **Tech Stack**: React, TypeScript, Vite, Zustand, IndexedDB
- **Architecture**: Services → Stores → Components
- **Current Phase**: v1.3.0 "Workflow Integration"
- **Principles**: Type safety, stability over novelty, minimal diffs, progress over perfection

## How to Use Agents

Agents are invoked through the main assistant using the Task tool. The main assistant will automatically select and launch the appropriate agent based on your request.

You can also explicitly request an agent:

```
"Use the architecture-advisor agent to design the storyboard system"
"Launch the test-writer agent to create tests for the diff service"
```

## Workflow

All agents follow the same workflow:

1. **PLAN** - Analyze and plan the work
2. **IMPLEMENT** - Execute the changes
3. **VERIFY** - Check correctness
4. **SUMMARIZE** - Provide concise summary (max 12 lines)
5. **STOP** - Don't continue beyond the task

---

*Last updated: 2026-02-09*
