# Verification record

Source: Loofi Creator Studio `19.0.0`, `main`, commit `0e93b1243c3db9708b703c5e42f576d65af0de87`. Review date: 2026-10-24.

The original review changed no tracked files. This documentation PR archives its results and selected screenshots; raw test logs and the browser profile remain local. Existing tests were executed without modifying expectations or baselines. These are dated results for the reviewed commit, not a claim that the full validation gate passed.

## Completed checks

| Check                                        | Result                                   | Runtime and qualification                                                                                    |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Theme gate                                   | Passed                                   | Part of `npm run validate`, Node 22.23.1                                                                     |
| Executable model gate                        | Passed                                   | Same validation run                                                                                          |
| Create / Studio / Creator translation gates  | Passed                                   | Same validation run; translation-key coverage does not guarantee every visible label is translated           |
| CI lint                                      | Passed                                   | Same validation run                                                                                          |
| TypeScript typecheck                         | Passed                                   | Same validation run                                                                                          |
| Full existing Vitest suite                   | **336 files / 4,548 tests passed**       | Node 22.23.1; project declares Node >=24, so this does not certify the complete gate on the required runtime |
| Production build                             | Passed, 11.74 s                          | Node 24.21.0                                                                                                 |
| Formatting                                   | Passed                                   | Separate `npm run format:check`, Node 24.21.0                                                                |
| Full native desktop suite                    | **Incomplete: 173 passed / 1 cancelled** | Node 24.21.0; 90-second bound expired, command exit 124                                                      |
| Focused prompt/editor/service tests          | 60 passed                                | 30 on Node 22.23.1 and 30 on Node 24.21.0; overlaps the full Vitest suite                                    |
| Focused local editor/caption/voiceover tests | 30 passed                                | Node 24.21.0; overlaps the full Vitest suite                                                                 |
| Focused production tests                     | 37 passed                                | Current UI/native retry integration, job service and production review/run tests; overlaps full suite        |
| Focused paid native tests                    | 72 passed                                | Node 24.21.0, no real paid provider requests                                                                 |

Direct local calls to real source functions reproduced timeline rebuilding, caption drift after silence cuts, image-to-video instruction loss, repeated locked lyric-section corruption and dialogue cleanup. Passing existing tests do not cover these reproduced scenarios.

## Browser checks

Main command, using Node 24.21.0:

```sh
STAGING_URL=http://127.0.0.1:8187 node node_modules/@playwright/test/cli.js test \
  e2e/video-production-improvements.spec.ts e2e/creator-v16.spec.ts \
  e2e/creator-delivery.spec.ts --project=chromium --workers=2 \
  --reporter=line --output=test-results/creator-review
```

Initial result: **11 passed / 3 failed** in 2.3 minutes.

- Multi-window project test: second window remained on Start instead of displaying the local editor. Passed on the isolated rerun.
- Twenty imported clips test: after reopening, the library displayed 18 items instead of 20 while project status showed Saved. Passed on the isolated rerun. This is unresolved intermittent evidence, not proof that raw media bytes were deleted, and not proven harmless.
- Selected variant AI test: no proposal appeared because the test hardcodes `http://localhost:8080/api/ollama` while the app was served from `127.0.0.1:8187`. CSP blocked this cross-origin request before the mock. This was a harness-origin mismatch, not a verified product persistence defect.

Serial rerun of both project tests, same reviewed source and Node 24.21.0: **2 passed in 50.8 seconds**. Raw execution log retained locally.

Serial rerun of all three video-production-improvements tests on the expected `http://localhost:8080` origin: **3 passed in 46.0 seconds**. This includes selected-field AI acceptance and durable reload, shared Studio/Arena guidance, synchronized video comparison and persisted independent notes. Raw execution log retained locally.

The initial project/import failures should be investigated under parallel load with saved-state and media-catalog instrumentation. Increasing timeouts alone would not establish correctness. The global media catalog persists separately from the project document; the existing Saved indicator does not prove that both have completed.

Relevant source boundaries: [src/core/store/slices/assetSlice.ts:59](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/store/slices/assetSlice.ts#L59), [src/core/utils/storage.ts:186–201](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/utils/storage.ts#L186-L201), [src/core/store/editorSessionAdapters.ts:169–188](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/store/editorSessionAdapters.ts#L169-L188).

Manual Chromium exploration used a fresh profile with Swedish UI, local text compilation and offline example opening. Captures were visually inspected at 1280×800, 375×800 and 800×800. The existing delivery tests also exercised light/dark at 1280 and 800 pixels; existing local-editor tests exercised Swedish and Arabic at 800 pixels. This is not a complete 320–1536-pixel or 200%-zoom qualification.

## Full validation boundary

The initial `npm run validate` completed through all 4,548 unit tests. Its desktop runner reported passing creator-render cases but did not terminate after the displayed nineteenth case; that review-owned Node 22 run was stopped. Desktop checks were then run separately on required Node 24 with a 90-second bound, and formatting was checked separately.

The Node 24 desktop runner reported **174 tests: 173 passed, 0 failed, 1 cancelled** when the bound expired (command exit 124). The cancelled file was `electron/creator-render.test.mjs`, with the final message `Promise resolution is still pending but the event loop has already resolved`. The cancellation and bounded termination do not establish a failing production render, but the complete desktop gate is not green. A test cleanup/open-handle or pending-promise investigation remains necessary. Raw execution log retained locally.

Formatting completed successfully: `All matched files use Prettier code style!`. Raw execution log retained locally.

**Do not report `npm run validate` as passed.** Its lint/type/unit stages passed, and the separate build/format checks passed, but full native suite completion was not demonstrated. The working tree remained clean at the end.

## Not qualified

No physical microphone recording, screen-reader session, installed Electron workflow, GPU render, real provider generation/charge, external NLE import, public-release surface or installation was qualified. Automated FFmpeg render tests and mocked IPC tests do not establish those results.

## Reproduction runtime

Use Node.js 24 or newer, as declared by the project. The production build, formatting, focused native tests and Chromium reruns used Node 24.21.0. The full 4,548-test Vitest run used system Node 22.23.1; preserve this distinction when interpreting its results.

## Documentation PR validation

The PR changes documentation and selected screenshots only. Its preparation checks Markdown formatting, source-link targets and line bounds, local documentation/image references and the final diff. Runtime test results above are retained from the original review rather than claimed as a new complete validation run.
