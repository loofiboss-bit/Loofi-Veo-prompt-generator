# ADR-004: Isolated XDG paths and KDE dialogs

Status: Accepted for M0.

Use application ID dev.loofi.CreatorStudioNative and Rust-owned XDG
config/data/cache/state resolution. Only absolute XDG overrides are accepted;
relative values fall back to standard HOME paths. No Electron directories or
project formats are accessed. Tests and benchmarks override all four roots.

Use QtQuick.Dialogs FileDialog and QApplication so Plasma's Qt platform theme
can create its native file helper. Production respects session theme settings;
Wayland tests explicitly select KDE and verify opt-in native-helper logging plus actual
AT-SPI file selection/cancellation. A QML fallback does not count as native-dialog
qualification. The opt-in `--native-dialog-evidence` flag observes visible
KFileWidget instances using public QApplication/QWidget runtime metadata; no
production polling or private Qt API is used. Distribution Qt debug categories
were silent on this host, so they are not the test oracle.

KFileWidget and portal native routes are distinct and the tested
route must be recorded. Do not use private Qt APIs in production code.

Sources: https://specifications.freedesktop.org/basedir/latest/
and https://github.com/KDE/plasma-integration/blob/master/qt6/src/platformtheme/kdeplatformtheme.cpp
