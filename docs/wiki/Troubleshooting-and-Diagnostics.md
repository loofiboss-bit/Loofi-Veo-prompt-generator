# Troubleshooting and Diagnostics

Loofi Creator Studio provides comprehensive built-in diagnostics to inspect application state, local GPU connectivity, media health, and recovery options.

---

## 1. Built-in Diagnostics Panel

Navigate to **Settings → Diagnostics** or open **Diagnostics Hub**:

- **Environment & Versions**: Reports Node.js, Electron runtime, Chromium version, operating system, and architecture.
- **Provider Status**: Checks connectivity to Gemini API, Vertex AI, Ollama, and local ComfyUI.
- **Local GPU Status**: Queries VRAM consumption, GPU device model, and loaded ComfyUI checkpoints.
- **Media Catalog Health**: Verifies SHA-256 checksums across all local video takes and audio stems.
- **Durable Paid Job State**: Inspects durable queue items (`Submitting`, `Generating`, `Complete`, `RecoveryRequired`).

---

## 2. Safe Mode & Crash Recovery

If the application detects an unhandled crash loop:

- **Safe Mode Prompt**: Creator Studio offers to launch in Safe Mode on next startup.
- **Safe Mode Options**:
  - _Continue with Paid Integrations Disabled_: Prevents any external API billing calls while keeping all local planning and prompt tools accessible.
  - _Disable Plugins_: Runs with third-party plugins temporarily disabled.
  - _Reset Preferences_: Restores default UI preferences while preserving all projects, assets, and prompt history in IndexedDB.
  - _Clear Crash Marker_: Resets the crash-loop watchdog once the underlying issue is resolved.

---

## 3. Ambiguous Paid Submissions

If an internet outage or system crash occurs during an active paid API call:

- The durable job engine flags the item as `RecoveryRequired`.
- The app **never** silently resubmits the request automatically to avoid duplicate charges.
- Users can review the job in the Activity Hub and either verify existing results or cancel the task safely.
