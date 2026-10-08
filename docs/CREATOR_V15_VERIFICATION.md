# Creator v15 local verification

This is local implementation evidence, not a public release announcement.

## Five AI-driven scenarios

The requested human trial was replaced with five isolated AI-driven desktop profiles. They used
the real Electron main/preload, the source-built FFmpeg 9.0.2 runtime, original bundled media and
real H.264/AAC files. The native save dialog alone was directed to a private test destination.
Provider calls were not made. These timings do not estimate human onboarding speed.

| Scenario                                                             | Result | Recorded time |
| -------------------------------------------------------------------- | ------ | ------------- |
| First offline example, MP4 and publication ZIP                       | Passed | 87 seconds    |
| Vertical video, Swedish/Arabic/Japanese captions                     | Passed | 71 seconds    |
| Music visualization with a separate audio track                      | Passed | 146 seconds   |
| Style snapshot, later profile change and project reopening           | Passed | 186 seconds   |
| Missing media, unsupported effect, cancellation and successful retry | Passed | 99 seconds    |

Run `node scripts/verify-creator-desktop.mjs` with the Vite server at `127.0.0.1:8099`.
`CREATOR_SCENARIOS` reruns named scenarios while retaining the other recorded results. Detailed
reports, MP4/ZIP files, screenshots, videos and traces are in `output/playwright/creator-desktop`.
These private generated profiles are ignored by Git.

## Packaged Linux

A distribution-layout Linux application was built with `electron-builder --dir --linux --publish never`.
A fresh isolated profile opened an included example and saved a verified MP4 and ZIP in 148 seconds,
using `file://` application assets and packaged rendering resources without Vite. HTTP requests in
the renderer were blocked. The existing packaged boot/restart/narrow-IPC test also passed.

Reproduce with `PACKAGED_ELECTRON_PATH=/absolute/path/to/veo-prompt-generator` and
`CREATOR_VERIFICATION_DIR=output/playwright/creator-packaged` when running the same verification
script. The script defaults to the first offline export for a packaged executable.

## Rendering and accessibility

Fourteen native tests include actual rendering, trim, gaps, pixel checks for dissolve, audio mixing,
Unicode subtitles, ZIP contents, integrity verification and cancellation/restart. Controlled
`ENOSPC` and `EACCES` faults verify that a previous delivery survives and partial siblings are removed.
Concurrent requests reserve only one job.

Visual inspection discovered missing Arabic/Japanese glyphs that a codec probe alone missed.
ASS output now explicitly selects the bundled script fonts, and a missing-glyph diagnostic fails
export. The corrected rendered frame was inspected and retained in the screenshots below.

Browser checks cover six app languages, keyboard activation, focus, readable labels, contrast in
light/dark Start, and 800/1280 pixel layouts. Existing accessibility/responsive checks were also run.
Automated contrast checks cover key Start text; they are not a full screen-reader certification.

## Release boundaries

`npm run validate`, `npm run build` and `npm run validate:release` passed locally. The final
validation ran 4,270 unit/integration tests in 309 files and 115 desktop tests with no skips.
The six external-result import browser scenarios also passed, including the unreadable-video
rejection. `git diff --check` passed.

Both exact runtime manifests and corresponding media-library sources pass the packaging gate.
Windows binaries rendered a real 1080×1920, 30 fps H.264/AAC clip with Swedish, Arabic and Japanese
subtitles under Wine. Its streams, duration and rendered frame were inspected. Physical Windows
installation and the full Windows desktop workflow remain separate CI/platform qualifications. These observations predate publication. The v15.0.0 release is qualified independently through
the canonical GitHub tag workflow and Fedora COPR readback; consult GitHub Releases for public status.

## v15 release preparation

The release candidate corrects Start navigation in onboarding/browser helpers and refreshes all
twelve reviewed Fedora/Ubuntu visual baselines for the new sidebar and Swedish settings option.
Seven focused Chromium tests passed in a normal comparison run without snapshot updates.
Runtime workflows invoke builders through Bash and restore Linux executable permissions after
artifact transport. Fresh remote CI and canonical tag qualification establish public release status.

## Demonstration assets

- [60-second edited demonstration](../assets/videos/creator-v15-demo.mp4)
- [Start](../assets/screenshots/15-creator-start.png)
- [Delivery](../assets/screenshots/16-creator-delivery.png)
- [Verified Unicode subtitles](../assets/screenshots/17-creator-unicode.png)
- [Caption editor](../assets/screenshots/18-creator-captions.png)

The demonstration combines real desktop recordings, editor screenshots and a real rendered file. It is edited
for clarity and does not represent a human completing the workflow in 60 seconds. Its background
sound and example visuals are the original CC0 media described in `public/creator-examples/rights.json`.
