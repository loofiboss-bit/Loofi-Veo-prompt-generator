// SPDX-License-Identifier: GPL-3.0-only
use cxx_qt_build::{CxxQtBuilder, QmlModule};
fn main() {
    CxxQtBuilder::new_qml_module(QmlModule::new("Loofi.Native").depend("QtQuick"))
        .files(["src/controller.rs", "src/projects.rs"])
        .qt_module("Quick")
        .build();
}
