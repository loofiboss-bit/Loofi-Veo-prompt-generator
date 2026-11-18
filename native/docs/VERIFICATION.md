# M0 automated verification

Host: Fedora 44 KDE Plasma, x86_64, Qt 6.11.2, Rust 1.93.0, source base
fac29104eab98fd85e79a2ea9a839710cd5b66b4. This records the local qualification snapshot before the PR commit.

| Check                                                 | Result  | Evidence scope                                                                                                                           |
| ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Cargo fmt-check                                       | PASS    | Native workspace.                                                                                                                        |
| Cargo Clippy --workspace --all-targets -- -D warnings | PASS    | Native workspace; upstream GCC16 Qt header warnings are separate from Rust lints.                                                        |
| Cargo test --workspace --locked                       | PASS    | Six core tests; bridge and documentation targets build successfully.                                                                     |
| CMake debug and release                               | PASS    | System Qt and pinned CXX-Qt, QML embedded in executable.                                                                                 |
| QML lint                                              | PASS    | Generated bridge types and both application QML files.                                                                                   |
| CTest bridge                                          | PASS    | Real QObject state/notify, model insertion/roles, overlap, cancellation, errors and shutdown during work.                                |
| CTest visual                                          | PASS    | Xvfb/Mesa OpenGL, rendered scene/camera image change, valid decoded video frames, play/pause/seek/unload, decoder error.                 |
| Installed binary visual smoke                         | PASS    | Actual host Wayland, video and camera tests; installed outside build tree.                                                               |
| AT-SPI platform smoke                                 | PASS    | Actual host Wayland, sessions project selection, KDE KFileWidget select/cancel, play/pause, camera navigation. See wayland-smoke.json.   |
| Electron npm run validate                             | PASS    | 313 test files, 4,307 unit tests; 116 desktop tests passed and four existing desktop tests skipped; checks/lint/typecheck/format passed. |
| Paired benchmark                                      | PASS    | 20 startup pairs; five complete pairs in each of four resource scenarios; one failed Electron attempt retained. See BENCHMARK.md.        |
| GitHub Actions                                        | NOT RUN | Local snapshot only; remote results must be read from the PR checks.                                                                     |
| Portal dialog route                                   | NOT RUN | KFileWidget was exercised; no claim for the portal backend.                                                                              |
| Other distributions/Qt releases/GPUs                  | NOT RUN | M0 is qualified only for the recorded host and Mesa headless test.                                                                       |

Saved command output: [native verification](evidence/native-verify.log),
[installed Wayland graphics](evidence/installed-wayland-visual.log),
[Electron regression validation](evidence/electron-validate.log). Native AT-SPI
results are in [wayland-smoke.json](wayland-smoke.json). Benchmark selection and
failed attempts are documented in [BENCHMARK.md](BENCHMARK.md).

Commands from `native/`:

```sh
QMAKE=/usr/bin/qmake6 CARGO_TARGET_DIR=/tmp/creator-native-m0-cargo \
  QT_QPA_PLATFORM=xcb xvfb-run -a bash scripts/verify.sh release
/usr/bin/python3 scripts/wayland_smoke.py \
  --binary ../../.creator-native-m0-build/release/loofi-creator-studio-native \
  --video /tmp/native-m0-fixtures/benchmark.webm --output docs/wayland-smoke.json
```

The initial offscreen-platform graphics test failed because Qt selected its
non-RHI software adaptation; it correctly rejected an unrendered Quick 3D scene.
The maintained headless route is Xvfb/Mesa/OpenGL and passed. Wayland native-dialog
selector diagnostics were corrected before the final passing run. These earlier
failures are not counted as successful qualification.

A system LLVM lld linker was required for standalone Rust Qt initialization/test
linking. CXX-Qt crate export names must agree with CMake targets, hence the
underscore-named bridge package. Registered enum namespace/signal limitations
are described in ADR-001. CMake package discovery and generated metadata are
part of the integration evidence, not assumed from successful Rust unit tests.

The installed binary has SHA-256
`37c6cf24a7aeb9e90ca43f5c63d06e3c46af31589722f3c214608731b468bb8e`.
CMake installation adjusts its runtime library search path; its hash therefore
differs from the release build executable used by the benchmark. Both were
exercised separately.

Final benchmark JavaScript syntax/ESLint (zero warnings), Python byte-compilation,
paired aggregation/hash verification and repository Prettier checks also passed.

No human/manual test requirement was introduced. Automated host-Wayland evidence
is distinct from headless evidence and does not claim every physical device or
codec. Filesystem cancellation cannot interrupt stalled OS syscalls; see RISKS.
