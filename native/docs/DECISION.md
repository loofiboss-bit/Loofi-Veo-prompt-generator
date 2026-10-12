# M0 decision: GO to the next milestone

GO for a bounded Linux-native next milestone using Qt 6/QML/Rust. This decision
qualifies the architecture on Fedora 44 KDE Wayland; it does not approve a full
Electron rewrite, project-format migration or release. No hard performance
threshold was used.

The release executable builds with pinned CXX-Qt 0.10.0 and system Qt 6.11.2.
Real Rust QObject state, enums, asynchronous commands and a Rust Qt list model
passed integration tests. Cancellation, overlapping commands, stale results and
object destruction have automated coverage. The Qt-free core remains separately
testable. QML navigation, session project selection, native KDE file-dialog
selection/cancellation, local video decoding and a rendered camera scene passed
on the actual Wayland host. Separate Xvfb/Mesa tests validate bridge and graphics
behavior. See [verification evidence](VERIFICATION.md) and [ADRs](adr/001-rust-qt-boundary.md).

The benchmark provides twenty alternating startup pairs and five complete paired
resource measurements for each equivalent workload, with raw failures retained.
See [results and limitations](BENCHMARK.md). Lower memory use supports continuing.
Video CPU use is higher in the native prototype and requires investigation before
expanding media workflows. Startup observation differs across frameworks, so the
reported elapsed times are evidence for this method, not a precise speedup claim.
M0 has substantially fewer features than Electron.

The next milestone should preserve the small Qt-free core and GUI-thread-only
mutation boundary, extend model tests before adding editing operations, and
measure Qt Multimedia decoder/GPU behavior against Electron with more codecs.
Keep advanced rendering off the M0 worker until cancellation and shutdown latency
are designed for that workload. A stalled filesystem syscall can delay joining
the worker; readable local files were tested, stalled mounts were not.

CXX-Qt is pre-1.0 and needs explicit model protocols and care around generated enum
namespaces, crate export names and CMake/Cargo metadata. These are maintainability
costs, not hidden automatic bindings. Dependency pinning and the native CI job
contain the current risk; CI is prepared but has not run remotely. Portal dialogs,
other GPUs, other distributions and alternative Qt versions remain unqualified.
GPL-3.0-only is the accepted native license; commercial product direction must be
revisited before distribution. Electron remains MIT and unchanged.

No critical correctness failure remains in the tested paths. The one failed
Electron resource attempt has no established root cause and is preserved in the
benchmark data; it is not attributed to a product defect. See [risk register](RISKS.md).
