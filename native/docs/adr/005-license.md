# ADR-005: GPLv3 native prototype

Status: Accepted by user for M0.

Original native code is GPL-3.0-only, consistent with open-source Qt Quick 3D's
GPLv3 license. Electron remains MIT; this directory does not change its license.
Qt libraries are dynamically linked from Fedora rather than bundled. CXX-Qt and
its CMake wrapper are MIT OR Apache-2.0. Dependencies retain their own notices.
Future proprietary distribution would require a valid commercial Qt license or
replacement of GPL-only modules; that is outside M0.

Source: https://doc.qt.io/qt-6.11/qtquick3d-index.html
