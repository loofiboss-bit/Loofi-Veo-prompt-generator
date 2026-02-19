# Bundle Baseline Report (v3.9)

Date: 2026-02-19

## Scope

- Phase 3 Task 021: Capture bundle composition baseline.
- Phase 3 Task 022: Audit `manualChunks` balance and identify oversized chunks.

## Method

- Ran production build with `npm run build`.
- Collected Vite chunk output (raw and gzip values).
- Computed aggregate raw/gzip totals from `dist/assets/*.{js,css}` after build.
- Reviewed `build.rollupOptions.output.manualChunks` in `vite.config.ts`.

## Baseline totals

- Asset files (`.js` + `.css`): 118
- Total raw size: 3,245,444 B (3.10 MiB)
- Total gzip size: 940,025 B (0.90 MiB)
- JS raw size: 3,106,873 B (2.96 MiB)
- JS gzip size: 918,305 B (0.88 MiB)
- CSS raw size: 138,571 B (135.32 KiB)
- CSS gzip size: 21,720 B (21.21 KiB)

## Largest chunks by raw size

1. `index-_t8tbomi.js` — 573,634 B raw, 159,364 B gzip
2. `export-Bc1u7v3y.js` — 515,600 B raw, 164,519 B gzip
3. `genai-BGXuF3ki.js` — 257,862 B raw, 52,201 B gzip
4. `router-gcpuEcO2.js` — 221,252 B raw, 72,633 B gzip
5. `vision_bundle-DXEQVQnt.js` — 201,041 B raw, 46,903 B gzip
6. `collaboration-GKiUJSSt.js` — 192,242 B raw, 58,210 B gzip
7. `StoryBoard-BZLUdsg7.js` — 182,007 B raw, 48,695 B gzip
8. `index.es-DYvB284O.js` — 158,646 B raw, 52,953 B gzip
9. `index-Be2ylR01.css` — 138,571 B raw, 21,720 B gzip
10. `vision_bundle-qHAtWFBm.js` — 125,531 B raw, 37,961 B gzip

## Manual chunks audit (`vite.config.ts`)

Configured manual chunks:

- `vendor`: `react`, `react-dom`
- `state`: `zustand`, `zundo`
- `router`: `react-router-dom`
- `i18n`: `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- `export`: `jspdf`, `jspdf-autotable`, `jszip`
- `collaboration`: `yjs`, `y-webrtc`, `simple-peer`
- `genai`: `@google/genai`
- `vision_bundle`: `html2canvas`

Observed from build:

- `vendor` currently emits as an empty chunk (`0.00 kB`).
- All manually split chunks are below the plan threshold of 200 kB **gzip**.
- `export` and `index-*` are above 500 kB **raw**, which triggers Vite warning.

## Immediate optimization applied

- Removed `vendor` from `manualChunks` in `vite.config.ts` because it emitted an empty chunk.
- Rebuilt with `npm run build` to validate behavior.
- Result: no empty `vendor-*` asset is emitted anymore; build remains successful.
- Remaining opportunities are unchanged: large raw chunks (`index-*`, `export`) and static-vs-dynamic import conflicts.

## Findings

- ✅ Task 021 baseline is captured with per-chunk and aggregate metrics.
- ✅ Task 022 balance check (gzip threshold) currently passes.
- ⚠️ There is likely redundant/ineffective chunking around `vendor` (empty chunk).
- ⚠️ Raw-size pressure remains in `index-*` and `export` chunks and should be addressed in Phase 3 optimization tasks.
- ⚠️ Multiple dynamic-import warnings indicate modules that are also statically imported, limiting chunk split effectiveness (notably i18n locale files and some core services).

## Proposed follow-up for Phase 3

- Task 023/024: Profile render hotspots and memoization opportunities before changing component code.
- Task 026/027: Reduce static imports that block lazy-splitting.
- Optional early chunk hygiene patch: remove or repurpose `vendor` chunk config if it remains empty across repeated builds.
