# Dependencies and licensing

| Component                                         | Version/source                 | License and use                                                                                         |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Native original code                              | 0.1.0 M0                       | GPL-3.0-only; see ../LICENSE.                                                                           |
| Qt Core/Gui/Widgets/QML/Quick/Controls/Multimedia | Fedora Qt 6.11.2               | System dynamic libraries, module-specific Qt LGPL/GPL/commercial terms and bundled third-party notices. |
| Qt Quick 3D                                       | Fedora Qt 6.11.2               | GPLv3/commercial; native prototype selects GPLv3.                                                       |
| CXX-Qt, cxx-qt-lib/build                          | Exact 0.10.0 in Cargo.lock     | MIT OR Apache-2.0; generated bridge build.                                                              |
| CXX-Qt CMake wrapper                              | 0.10.0, SHA-256 in ADR-003     | MIT OR Apache-2.0; wraps Corrosion.                                                                     |
| Corrosion                                         | Wrapper's pinned dependency    | MIT; CMake/Cargo orchestration.                                                                         |
| cxx / cxx bridge crates                           | Locked Cargo dependencies      | MIT OR Apache-2.0; C++/Rust interop.                                                                    |
| GCC, CMake, Ninja, Rust/Cargo                     | Installed host tools           | Build-only; no toolchain bundled into application.                                                      |
| Plasma integration, Wayland, Mesa                 | Fedora system packages         | Platform/runtime integration; no third-party binaries bundled by M0.                                    |
| FFmpeg                                            | Fedora ffmpeg-free             | Test-fixture generation only; app uses system Qt Multimedia backend.                                    |
| Playwright                                        | Existing Electron node_modules | Test/benchmark-only; Electron source/runtime unchanged.                                                 |
| pyatspi, psutil                                   | Fedora Python packages         | Test/benchmark-only.                                                                                    |

Cargo.lock preserves downloaded crate checksums. `source-manifest.json` identifies
the implementation and verification sources measured before the PR commit
by SHA-256. Its committed=false field describes that qualification snapshot. The measured executable also has its own SHA-256 in
the benchmark raw data. The CMake wrapper archive is
validated by SHA-256 during FetchContent. `installed-rpms.txt` records this host's
exact direct build package NEVRAs. Multimedia plugin, codec and Mesa versions
remain environment-dependent: successful video/3D tests prove this recorded
machine, not all Fedora installations or codecs.

The application is not released or packaged during M0. Future redistribution must
carry corresponding license texts, notices and GPL obligations. This document
records the chosen technical licensing boundary rather than a legal opinion.
