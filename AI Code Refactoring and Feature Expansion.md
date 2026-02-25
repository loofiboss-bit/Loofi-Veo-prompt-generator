Here is a structured Markdown file designed specifically to be fed into an AI coding assistant (like Cursor, GitHub Copilot, or Cline) inside VS Code. It is formatted to give the AI precise context, targets, and actionable directives.  
Save this as ai-refactor-directives.md and attach or paste it to your AI assistant.

---

Markdown

\# AI Implementation Directive: Veo Studio Refactor & Feature Expansion

\#\# Context  
You are an expert frontend architect and full-stack engineer. Your task is to execute a series of architectural improvements and feature implementations for the \`loofi-veo-prompt-generator\` repository.

This is an enterprise-grade React, TypeScript, Vite, and Zustand application supporting Web and Electron. It uses a strictly modular Feature-Sliced Design. When implementing these changes, you must adhere to the existing folder structure (\`src/core\`, \`src/features\`, \`src/shared\`), maintain high test coverage, and respect existing stability services (e.g., \`circuitBreakerService\`).

\---

\#\# Phase 1: Architectural Refactoring (Performance & Stability)

\#\#\# Task 1.1: Implement Strict Lazy Loading  
\*\*Objective:\*\* Reduce initial bundle size and improve Time-To-Interactive (TTI) by lazy-loading heavy studio modules.  
\* \*\*Target Files:\*\* \`src/core/config/router.tsx\`, \`src/App.tsx\`, and studio index files (\`src/features/studios/\`).  
\* \*\*Action:\*\* 1\. Identify heavy components currently imported synchronously (e.g., \`VideoAnalysisStudio\`, \`AmbienceStudio\`, \`ComposerCanvas\`).  
 2\. Wrap these imports with \`React.lazy()\`.  
 3\. Ensure \`src/shared/components/ui/SuspenseFallback.tsx\` (or a similar loading state) is used appropriately within \`React.Suspense\` boundaries at the routing level.

\#\#\# Task 1.2: Refactor State Management (Mediator Pattern)  
\*\*Objective:\*\* Resolve Zustand store fragmentation and prevent cyclic dependencies between multiple stores (App, Project, Timeline, Video, etc.).  
\* \*\*Target Files:\*\* \`src/core/store/\*.ts\`  
\* \*\*Action:\*\*  
 1\. Audit stores for cross-imports (e.g., \`useTimelineStore\` importing \`useComposerStore\`).  
 2\. Implement a centralized Event Bus or Mediator service in \`src/core/store/mediator.ts\`.  
 3\. Refactor cross-store communication to dispatch and listen to events rather than direct store mutations.

\#\#\# Task 1.3: Web Worker Isolation for Heavy Logic  
\*\*Objective:\*\* Prevent main UI thread blocking during complex prompt or project analysis.  
\* \*\*Target Files:\*\* \`src/core/utils/promptScoring.ts\`, \`src/core/services/projectAnalysisService.ts\`, \`src/infrastructure/workers/\`.  
\* \*\*Action:\*\*  
 1\. Analyze \`src/infrastructure/workers/audioProcessor.worker.ts\` as a structural reference.  
 2\. Move the execution logic of \`promptScoring\` and \`projectAnalysis\` into new Web Workers (\`promptAnalysis.worker.ts\`, etc.).  
 3\. Update the corresponding services to communicate asynchronously with these new workers.

\---

\#\# Phase 2: Feature Implementations

\#\#\# Task 2.1: Local LLM Fallback (Privacy Mode)  
\*\*Objective:\*\* Allow users to run prompt generation and refinement using local models to bypass API costs and ensure data privacy.  
\* \*\*Target Files:\*\* \`src/core/services/adapters/\`, \`electron/main.cjs\`.  
\* \*\*Action:\*\*  
 1\. Create a new adapter \`LocalLLMAdapter.ts\` implementing the same interface as \`VeoAdapter\` / \`SoraAdapter\`.  
 2\. Integrate standard local inference endpoints (e.g., Ollama default port \`localhost:11434\` or Llama.cpp).  
 3\. Expose a configuration UI in \`src/features/settings/\` to toggle "Local Privacy Mode" and input the local API URL.

\#\#\# Task 2.2: Git-like Prompt Branching  
\*\*Objective:\*\* Enable users to fork prompts and visually compare divergent generations.  
\* \*\*Target Files:\*\* \`src/features/history/\`, \`src/core/store/useHistoryStore.ts\`.  
\* \*\*Action:\*\*  
 1\. Extend the existing history state to support a tree/graph data structure rather than a linear array.  
 2\. Build a branching tree visualization component in \`HistoryPanel.tsx\` that allows users to select and set an active node.  
 3\. Integrate with the existing \`DiffViewer\` to compare parallel branches.

\#\#\# Task 2.3: NLE Direct API Bridge  
\*\*Objective:\*\* Send generated timelines directly to professional NLEs without manual XML/EDL file manipulation.  
\* \*\*Target Files:\*\* \`src/features/export/\`, \`src/core/utils/electronBridge.ts\`.  
\* \*\*Action:\*\*  
 1\. Add a "Direct Export" option in \`ExportModal.tsx\`.  
 2\. Utilize Node.js native child processes (via Electron IPC bridge) to interface with the DaVinci Resolve API or Premiere Pro ExtendScript APIs.  
 3\. Ensure robust error handling if the NLE is not currently running.

\#\#\# Task 2.4: Offline-First Job Queuing  
\*\*Objective:\*\* Ensure full functionality during offline mode, syncing jobs when internet returns.  
\* \*\*Target Files:\*\* \`sw.js\`, \`src/core/utils/safeIdbKeyval.ts\`, \`src/core/services/jobQueueService.ts\`.  
\* \*\*Action:\*\*  
 1\. Hook \`jobQueueService\` into the browser's IndexedDB via \`safeIdbKeyval\`.  
 2\. Implement an offline detector listener.  
 3\. When offline, cache generation API requests to IndexedDB. Once online, automatically process the backlog using the existing \`queueService\`.

\---

\#\# Execution Guidelines for AI  
1\. \*\*Step-by-Step:\*\* Do not attempt to complete all tasks in a single prompt. I will ask you to execute one Task ID (e.g., "Task 1.1") at a time.  
2\. \*\*Analysis First:\*\* Before writing code for a task, briefly analyze the existing files mentioned in the "Target Files" to understand current dependencies.  
3\. \*\*Typing & Tests:\*\* Ensure all new code has strict TypeScript interfaces. If modifying a service with an existing \`.test.ts\` file, you must also update the test file to match the new implementation.  
4\. \*\*Code Quality:\*\* Use plain, descriptive variable names. Prioritize logical flow and evidence-based architectural patterns.
