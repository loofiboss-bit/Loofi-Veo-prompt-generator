# ADR-003: CMake orchestrates Cargo

Status: Accepted for M0.

Use the official CXX-Qt CMake wrapper 0.10.0, its Corrosion integration and a Rust
static library linked into the Qt executable. Cargo builds the bridge and exports
QML type information; Qt CMake builds and lints the app QML module. Do not maintain
handwritten generated metadata or add a second independent Corrosion integration.

Archive SHA-256:
`bbf0095649d820d26ebcd91fbfbef3dbc2894de4dd10066c46927388abceacd3`.
Tag 0.10.0 resolves to `64e63f560737b3b7f85ef8267c5918e4b8176d5a`.
Cargo.lock pins transitive crates. Build artifacts live outside the source tree.
Qt comes from system RPMs, so reproducing this environment requires the recorded
package versions; this is not a claim of bit-for-bit reproducible binaries.

CMake and Cargo must agree on Qt discovery and build configuration. The wrapper
normalizes hyphenated Cargo crate names into underscore CMake target names, while
cxx-qt-build export flags use the original package name. Use an underscore-named
bridge package to keep export flags and initializer paths consistent.
Generated QML import paths must be supplied to lint and tooling.

Source: https://kdab.github.io/cxx-qt/book/getting-started/5-cmake-integration.html
