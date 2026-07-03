# Release Notes

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
