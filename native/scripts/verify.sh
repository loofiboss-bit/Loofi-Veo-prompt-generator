#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
set -euo pipefail
cd "$(dirname "$0")/.."
export QMAKE=/usr/bin/qmake6
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$(cd ../.. && pwd)/.creator-native-m0-build/cargo-check}"
cargo fmt --all -- --check
cargo clippy --workspace --locked --all-targets -- -D warnings
cargo test --workspace --locked
cmake --preset "${1:-debug}"
cmake --build --preset "${1:-debug}"
cmake --build --preset "${1:-debug}" --target all_qmllint
ctest --preset "${1:-debug}"
