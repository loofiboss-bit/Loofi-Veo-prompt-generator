# v16 stabilization and performance verification

The stable release is v16.0.0, published 2026-10-12. This document records subsequent local
stabilization of PR #65, a v16.0.1 release candidate. Remote publication evidence is tracked separately.
The native M0 prototype and v17 features are separate work.

## Contracts and changes

- Heavy ZIP/auth dependencies are lazy; the application window does not wait for render recovery.
  Render operations await successful recovery, and failures are reported rather than treated as ready.
- Frozen render checksums are checked again on copied inputs and logos before FFmpeg consumes them.
  Legacy plans without frozen hashes use the registered original checksum.
  Proxies remain editing aids; final rendering uses originals.
- Publication ZIPs require video, captions and cover. Stream failures preserve existing destinations
  and remove partial outputs. Job terminal statuses bypass progress throttling.
- Playback/scrub updates reuse the 3D renderer and scene resources. Structural scene changes and
  unmount dispose owned resources. Granular store selectors and binary project transfer remain.
- Existing project schemas, IPC contracts and local/account-free operation are preserved.
- Published canonical-media-path and packaged-window-unload fixes are included from main.

## Reproduction

Use Node 24 or newer and the reviewed packaged media runtime.

`validate:release` runs media/metadata and theme/model/translation checks, followed by the complete
pre-release pipeline. That pipeline already runs strict lint, types, `test:ci` (coverage, desktop and
benchmarks), formatting and build. Expensive tests/build gates run once; no threshold or required test is removed.
`validate` remains the ordinary development gate.

```sh
npm run validate:release
npm run test:ci
npm run test:e2e
npm run benchmark -- --output /absolute/candidate-production.json
npm run benchmark -- --baseline-executable /absolute/baseline/veo-prompt-generator --candidate-executable /absolute/candidate/veo-prompt-generator --output /absolute/paired-results.json
npm run secrets:self-test
npm run secrets:check
```

Package baseline and candidate from the same Node/Electron/dependency environment with
`electron-builder --linux dir --publish never` into separate output directories. The baseline is
main `fac29104eab98fd85e79a2ea9a839710cd5b66b4`. Do not launch with a real user profile.

The benchmark command reports raw repetitions and medians from actual media import/resolve,
render-engine progress, ZIP saving and production project archiving. Packaging fixtures are synthetic
bytes and do not measure codec throughput; real 180-second renders are a separate acceptance test.
RSS, heap, external and array-buffer memory are recorded; short sampled peaks may be missed.
Candidate-only measurements establish no improvement over a baseline.

The optional packaged comparison performs five alternating pairs from process launch to usable
Projects controls, using prepared isolated profiles and warm system caches. It includes automation
attachment, navigation from Start and filling the project-name field to verify enabled creation
controls; no project is created. Linux resource sampling sums live process-tree RSS and CPU time at readiness;
RSS can double-count shared pages and does not establish peak or proportional-set memory. Executable
and app.asar hashes identify measured packages. Benchmark source revision and dirty state are included.

## Evidence and remaining gates

### Automated evidence

- Full Chromium suite: 112/112 passed, including existing performance budgets, visual baselines and the packaged Electron recovery scenario.
- Frozen production build: 7/7 v16 creator scenarios passed (own media, captions, undo/restart, conflicting windows, separate projects, 20 clips, keyboard editing, Swedish and Arabic layouts).
- Latest packaged Electron recovery smoke: 1/1 passed after the copied-input legacy-plan correction.
- Focused current renderer/media suite: 43/43 passed, excluding the separately exercised real three-minute scenario.
- Real bundled FFmpeg qualification produced, decoded and packaged 180-second outputs in all three aspect ratios; package file lists and video checksums matched.
- Benchmark self-tests: 4/4 passed; actual production import/resolve, ZIP, progress and binary project archive scenarios ran five repetitions each.
- Secret-scan synthetic history test passed. Full history intentionally fails with the three unresolved Google-key occurrences.

Final `npm run validate:release`: **PASS (exit 0)** on 2026-10-15. This includes the complete
`npm run test:ci` with current renderer/legacy-plan regressions, coverage, native desktop tests and
four benchmark self-tests, plus strict lint, TypeScript, formatting, production build, media-runtime
integrity, RPM metadata, model/theme and translation gates. No thresholds were reduced.
The wrapper reported two expected warnings: uncommitted local work and its optional generic E2E
step disabled. The full 112-test Chromium suite and seven frozen-build cases ran separately.
The wrapper's “RELEASE READY” wording covers these code/package checks only; the separate security
gate was **FAIL** before the subsequently authorized history cleanup. Remote publication is
tracked separately in [history sanitization](HISTORY_SANITIZATION.md).

### Paired packaged startup

Five alternating pairs, Node 24.19.0, Linux x64, Intel i5-1145G7. Both packages use Electron 43.7.8
and the same dependency environment. Baseline source is main `fac2910`; candidate is the uncommitted
performance branch, identified by application archive and executable hashes in the raw report.
No FFmpeg qualification or browser suite was running during these measurements.

| Median                          | Baseline | Candidate |
| ------------------------------- | -------: | --------: |
| Usable Projects (ms)            | 1476.835 |  1429.444 |
| Live process-tree RSS (MiB)     |  771.230 |   764.008 |
| Live process-tree CPU (seconds) |    2.880 |     2.760 |

The observed startup difference is about 47 ms; this small five-pair result does not establish a
universal speedup. It replaces the earlier synthetic module-loading percentages.
[Raw repetitions, medians, CPU, memory, artifact hashes and environment](evidence/v16-stabilization-benchmark.json)
are retained for review. Local API scenarios are candidate-only measurements and establish no
before/after improvement. Main-process array-buffer readings of zero are instrumentation results,
not evidence that no allocations occurred.

### Inherited evidence boundary

The published main branch's Electron unload handling bypasses the browser's unsaved-change veto.
This behavior is retained rather than changed by PR #65. Packaged boot/recovery smoke does not
qualify preservation of an edit followed immediately by close within the 700 ms autosave debounce.
An awaited save/close flow would need a separate focused change and automated qualification.

The [secret-scan review](SECRET_SCAN_REVIEW.md) records 16 exact false-positive exceptions and three
removed occurrences of one historical Google credential. On 2026-10-15 the owner explicitly
authorized history sanitization. All branch/tag history was rewritten and full-history scanning
now passes without suppressing those credential findings. An authenticated provider lookup now confirms the old key is already purged;
[redacted evidence](evidence/historical-key-provider-status.json) records the documented response.
The isolated synthetic-token self-test independently verifies historical detection.

Automated checks are the acceptance gate. Physical hardware, screen readers and human onboarding
remain evidence boundaries rather than additional manual requirements. No commit, push, merge or
publication was part of the original local stabilization task. A subsequent explicit user request
authorized history sanitization and v16.0.1 publication.
