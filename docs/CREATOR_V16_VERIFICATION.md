# Creator Studio v16 verification

Source qualification, 2026-10-10. This implementation is unpublished; no commit, remote update,
release, package publication or physical installation is established by these checks.

## Focused evidence

| Area                              | Result | Evidence                                                                                                                                                                                                                                            |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local creator journey             | PASS   | Seven Chromium tests against a frozen production build: own media, SRT replacement/undo, saved settings, durable restart, conflicting windows, separate projects, 20 clips reopened three times, keyboard editing, Swedish and Arabic RTL at 800px. |
| Theme use                         | PASS   | Two additional Chromium scenarios switch dark/light through Settings in Swedish and Arabic; the editor stays usable. Screenshots were inspected. This is browser evidence.                                                                          |
| Metadata-first recent projects    | PASS   | A 100-row inventory test loads six active metadata summaries without loading project documents or media.                                                                                                                                            |
| Atomic document persistence       | PASS   | Focused tests cover stale snapshots, legacy revisions, same-runtime stale writes, durable-storage failure, backup warnings, nested copy bindings and rejection of unverified backup recovery.                                                       |
| Captions and editing              | PASS   | Split, trim, linked ripple, standalone captions, fresh caption identities, atomic undo/redo, SRT timing/order and overlap detection are exercised in focused timeline/service tests.                                                                |
| Real three-minute export          | PASS   | The bundled Linux runtime rendered and decoded real 180-second H.264/AAC files in 1:1 (720×720), 16:9 (1280×720) and 9:16 (720×1280). All 19 renderer tests passed without skips.                                                                   |
| Review/export parity and branding | PASS   | A separate real 720p render test checks a red logo pixel, Unicode captions and publication ZIP contents. Review and final MP4 file bytes produce identical SHA-256 checksums.                                                                       |
| Native job and failure handling   | PASS   | Native renderer tests exercise persisted jobs/retry, interrupted restart, preview checksum checks, cancellation, destination/space failures, previous-file preservation, source replacement and proxy checksum caching.                             |

Reproducible focused commands:

```sh
npm run build
STAGING_URL=http://127.0.0.1:8186 npx playwright test e2e/creator-v16.spec.ts --project=chromium --workers=1 --reporter=line
node --test electron/creator-render.test.mjs
node --test --test-name-pattern='real offline render' electron/creator-render.test.mjs
```

The preview server must serve completed `dist` output. These checks did not use Vite HMR.
The three-minute fixtures use 720p; 1080p remains supported by the renderer contract but this
three-minute acceptance scenario does not establish 1080p throughput on every device.

## Broad gates

`npm run validate:release` completed successfully (exit 0), including runtime checks, RPM metadata,
lint, TypeScript, coverage gates, native desktop tests, formatting, `npm run validate` and the final
production build. `npm run validate` reported **4,305 passing tests in 313 files** and **120 passing
native desktop tests**, with zero native failures or skips.

Overall coverage passed unchanged thresholds: statements 61.01%, branches 53.07%, functions 57.39%
and lines 62.24%. The media service has 100% line and 94.2% branch coverage. Pre-release warnings were
limited to the deliberately uncommitted working tree and its optional generic E2E step being disabled;
the focused production-browser scenarios ran separately.

A final portable-transfer correction excludes text caption resource IDs from binary-media collection.
All 12 transfer tests, including a new linked-caption round trip, passed afterwards, as did lint and
TypeScript. The final production build includes this correction. The 4,305-test full-suite count
predates that additional test; it is not presented as a full-suite run of 4,306 tests.

An earlier attempt found two formatting issues and one long Prompt Studio layout-test timeout.
Formatting was corrected. The layout scenario now dispatches its long input once; separate keyboard
coverage retains actual typing. A subsequent type error in a new diagnostic test fixture was also
corrected. New import/decode/proxy regression cases also restored the critical media-service coverage gate without lowering thresholds. Focused checks and the successful final broad run followed these corrections; interrupted/failed runs are not passes.

Firefox and WebKit were unavailable because their Playwright executables were not installed. The
focused browser qualification uses Chromium; it does not claim cross-browser certification.

## Separate manual qualification

NOT RUN: physical Fedora/KDE installation and use; physical Windows installation and use; screen
reader and hardware/device qualification; human onboarding study. The target of four out of five new
people completing the prepared first flow within ten minutes, excluding rendering, needs actual
participants. Scripted interaction is not that evidence.

No public v16 release or deployment is authorized or performed by this implementation task.
