# Loofi Creator Studio v23.0.0

v23.0.0 delivers the first major release of the Creator Workstation evolution: cohesive navigation across Start, Prompt Studio, Production, and Timeline, non-destructive video iteration lineage synced into SQLite WAL and portable `.loofi-project` archives, strict desktop paid-retry and FFmpeg render hygiene, a trimmed production bundle, and verified 100% i18n parity across all six UI languages.

## Highlights

- **Coherent Workspace Context Rail:** Persistent project indicator, save status chip, Local-first badge, contextual destination shortcuts (**Prompt Studio**, **Production**, **Timeline**), and `Ctrl/Cmd+K` Quick navigation across desktop and mobile viewports.
- **Faster Prompt-to-Timeline Flow:** Press `Ctrl/Cmd+Enter` in Prompt Studio to compile locally, click **Open Timeline** directly from a generated handoff, or launch directly from Welcome → **Use my own clips** (`/start?mode=clips`) with highlighted local clip import.
- **Non-Destructive Video Iteration & Portable Lineage:** `VideoIterationSession[]` lineage trees now persist in canonical SQLite WAL project documents (`meta_json`) and travel inside `.loofi-project` bundles. Applying new takes preserves existing storyboard actions/durations, trimmed timeline clips, and 3–15s Gemini Omni durations.
- **Resilient Cost & Render Boundaries:** `geminiVisionService` routes uniformly through `resilientCall` (respecting `maxRetries=0` on desktop), interrupted FFmpeg exports clean up orphaned `segment-*` and `concat.txt` artifacts, and `gcTimeline()` no longer truncates timelines at 50 shots.
- **Leaner Bundle & Modular Icons:** Excluded the unused 24 MB ONNX `asyncify` WASM binary while keeping local Whisper ASR (`npm run bundle:check` enforces `< 22 MB` total `dist/assets/`), replaced 1,624 lines of icon switch JSX with data-driven `iconRegistry.ts`, and retired 18 legacy shell/modal files.
- **100% Six-Locale i18n Parity:** Full key parity across English, Swedish, Spanish, French, Japanese, and Arabic across all 17 namespaces—enforced on every build via `npm run i18n:all:check`—with localized Creative Assistant heuristics and light-theme Command Palette fixes.

## Upgrade notes

Existing projects, `.loofi-project` archives, SQLite WAL databases, and Creative Pack schemas migrate forward seamlessly without losing manual fields, locked lyrics, or historical artifacts (legacy Sora and shut-down Gemini API Veo Preview bindings remain readable in history/exports).

Download the [GitHub release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v23.0.0) and verify packages against `SHA256SUMS.txt`. Fedora 44 and Fedora 45 x86_64 users can also install or upgrade from [COPR](https://copr.fedorainfracloud.org/coprs/loofitheboss/loofi-creator-studio/).

Automated tests, strict lint/typechecks, coverage/benchmark gates, RPM dependency checks, and packaged container smokes are verified separately from physical KDE Wayland hardware, real OS-vault sessions, and live paid provider calls. See the [release runbook](../RELEASE.md) for qualification boundaries.
