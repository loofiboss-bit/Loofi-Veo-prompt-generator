# Release Notes

## v8.0.0 — Creator Core

v8 turns Loofi Flow/Veo Studio into one guided, local-first production workspace:

- A six-step Create flow connects planning, assets, generation, A/B review, acceptance, and export.
- The canonical model catalog drives capabilities, lifecycle state, pricing, provider bindings, visible routing reasons, and safe fallbacks.
- Gemini API, Vertex AI ADC/OAuth, and loopback-only Ollama profiles use a narrow privileged desktop bridge.
- Paid jobs survive restart without duplicate submission; ambiguous acknowledgements require manual recovery.
- Desktop media uses a user-selected project folder, atomic writes, checksums, asynchronous thumbnails/proxies, health checks, relink, cleanup preview, and accepted-media protection.
- Portable `.loofi-project` bundles, v5-v7 migrations, five rotating backups, and checksum-verified restore protect project history.
- Production preflight, explicit cost approval, structured review dimensions, take comparison, typed revisions, Suno v5.5/Studio 1.2 handoff, diagnostics, and Safe Mode complete the workflow.
- Windows 11 and current Fedora are supported release targets; macOS remains experimental.

## v7.0.1

v7.0.1 restores the supported model/runtime baseline ahead of Creator Core:

- Retired Gemini endpoints are blocked from executable fallback paths.
- Gemini 3.5 Flash is the default prompt and review model.
- Node.js 24 LTS is used by CI and declared for development.
- Fedora/RHEL RPM metadata now uses native dependency names.

## v7.0.0

v7 introduces Director Mode, an approval-gated production workspace that combines local planning,
validated Veo controls, durable operation recovery, structured take review, local generated-media
storage, storyboard/timeline acceptance, and Creative Pack v2 exports.

## v6.0.0

v6 promotes optimization into the Creative Intelligence Workbench:

- Added `/optimize` as a first-class workspace for prompt quality, cost, narrative continuity, preset fit, and asset review.
- Added patchable accept/dismiss suggestions with project-keyed analysis state and history.
- Added Creative Pack export combining Flow/Veo scene pack, Veo API prompt, Suno production brief, and timeline shot list.
- Replaced static public screenshots with real Playwright captures from seeded app state.

## v5.0.0

v5 focuses the product on Google Flow/Veo and Suno workflows:

- Removed the previous extra video-platform target from UI and adapters.
- Added Flow/Veo output modes and scene pack exports.
- Expanded Suno export modes and bridge workflows.
- Added Windows/Linux-first documentation, screenshots, wiki seed pages, and
  public repository files.

## Sync Wiki

GitHub Wiki is a separate git repository. To publish these seed pages:

```bash
rm -rf /tmp/loofi-veo-wiki
git clone git@github.com:loofiboss-bit/Loofi-Veo-prompt-generator.wiki.git /tmp/loofi-veo-wiki
cp docs/wiki/*.md /tmp/loofi-veo-wiki/
cd /tmp/loofi-veo-wiki
git add .
git commit -m "docs: seed public wiki"
git push
```
