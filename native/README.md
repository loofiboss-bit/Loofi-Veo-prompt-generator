# Loofi Creator Studio Native — M0

An isolated Qt 6/QML/Rust feasibility prototype for Fedora KDE Plasma on Wayland.
The Electron application and its project formats are unchanged. Demo projects are
session-only; restarting discards them. No account, API key or network service is required.

## Build

Verified target: Fedora 44 x86_64, Qt 6.11.2, Rust 1.93.0, CMake 4.3.0, GCC 16.2.1.
CMake requires at least 3.24. QML currently requires Qt 6.11. The installed Qt runtime
and development packages must be from the same version family.

```sh
sudo dnf5 install gcc-c++ cmake ninja-build rust cargo rustfmt clippy lld \
  qt6-qtbase-devel qt6-qtdeclarative-devel qt6-qtmultimedia-devel \
  qt6-qtquick3d-devel qt6-qtshadertools-devel qt6-qtwayland plasma-integration \
  ffmpeg-free python3-pyatspi python3-psutil mesa-dri-drivers
cd native
export QMAKE=/usr/bin/qmake6
cmake --preset release
cmake --build --preset release
../../.creator-native-m0-build/release/loofi-creator-studio-native
```

Build directories and Cargo-generated artifacts stay outside this checkout. The
CXX-Qt 0.10.0 CMake archive has a checked SHA-256; Cargo uses the included lockfile.
Initial builds need network access to download dependencies. Normal app use is offline.
CMake consumes the system Qt package, while the bridge uses the matching Qt qmake target.

## Validate

```sh
bash scripts/verify.sh release
python3 scripts/create_fixture.py /tmp/native-m0-fixtures/benchmark.webm
/usr/bin/python3 scripts/wayland_smoke.py \
  --binary ../../.creator-native-m0-build/release/loofi-creator-studio-native \
  --video /tmp/native-m0-fixtures/benchmark.webm \
  --output docs/wayland-smoke.json
```

`verify.sh` checks Rust formatting, Clippy, Rust tests, CMake, QML lint and real
Qt integration tests. For headless validation use `QT_QPA_PLATFORM=xcb xvfb-run -a bash scripts/verify.sh release`
(after installing `xorg-x11-server-Xvfb`). Use a graphical session or Xvfb with Mesa for visual tests;
the Qt Quick software scenegraph cannot validate Quick 3D. Host Wayland tests use
AT-SPI only against the process they launched, with temporary XDG directories.
They require an unlocked Plasma session and the KDE Qt platform theme. The tested
backend is KFileWidget; the portal backend is not qualified by this test. No global
accessibility or desktop configuration is changed. Native file-dialog selection
and cancellation are verified together with opt-in native-helper logging based on
public QWidget runtime metadata. Qt upstream debug categories may be disabled in
distribution builds; this test does not depend on their availability.

## Use

- **Projects:** create and select in-memory demo projects.
- **Prompt Studio:** analyze local text on a Rust worker; see typed status/errors.
- **Video Preview:** select a local file in KDE's native dialog, play/pause/seek.
- **Camera Scene:** experiment with yaw, distance and field of view.

Ctrl+1…4 navigate; Ctrl+O opens a video. Media stops and releases its source when
leaving Video Preview. Camera Scene is loaded only while visible and has no idle
animation. Prototype data directories use `dev.loofi.CreatorStudioNative` beneath
XDG config/data/cache/state; Electron directories are never reused.

## Benchmark

```sh
node scripts/benchmark.mjs \
  --native "$(realpath ../../.creator-native-m0-build/release/loofi-creator-studio-native)" \
  --video /tmp/native-m0-fixtures/benchmark.webm \
  --source-package /absolute/Electron-source/package.json \
  --output docs/benchmarks/run.json
```

The harness needs `@playwright/test` from the unchanged Electron checkout. It
compares the installed packaged Electron v15.0.0, verifies its actual isolated
`userData` path, and measures the entire application process tree. Defaults are
20 alternating startup pairs and five pairs per resource workload, settling for
10 seconds then sampling for 30 seconds. Startup observation differs between
Qt frame completion and Electron Playwright/CDP; results explicitly include that
limitation and are not cold disk-cache measurements. Packaged v15 creates a default
project; the harness sets its existing in-memory store to an empty test fixture
inside the temporary profile for the Projects workload. The initial unequal
inventory runs remain in raw data and are excluded from the comparison.

See [measured results](docs/BENCHMARK.md), [qualification](docs/VERIFICATION.md)
and [go/no-go decision](docs/DECISION.md). `--workloads projects` or
`--workloads studio` with `--startup-pairs 0` can reproduce supplemental runs.
`python3 scripts/summarize_benchmarks.py` aggregates the three recorded datasets;
its positional arguments are the full run, corrected Projects run, Studio retry
and output JSON.

## Architecture and limits

QML → generated CXX-Qt QObject/model → Qt-free Rust core. A tiny C++ `QApplication`
host owns Qt's event loop and native platform integration. The Rust controller
has one active command, bounded worker lifetime, cooperative cancellation and
queued GUI-thread completion. No GUI/model changes occur on worker threads.
ProjectsModel implements real Qt model roles and insert notifications in Rust.
Advanced editing, rendering, AI, project import/export, migration and Electron
feature parity are outside M0. See `docs/adr/` and `docs/RISKS.md`.

## Licensing

This directory's original code is GPL-3.0-only. Existing Electron code remains
MIT. Qt Quick 3D's open-source license is GPLv3 (commercial licensing is an
alternative); this is an explicit M0 choice, not a relicensing of Electron.
Qt remains dynamically linked from Fedora packages. CXX-Qt and its CMake wrapper
are MIT OR Apache-2.0; preserve upstream notices in downloaded build dependencies.
Codec availability and third-party licenses depend on the distro Multimedia
backend. The test video is generated from synthetic geometry with VP8 and no audio.
See `LICENSE` and `docs/DEPENDENCIES.md`.
