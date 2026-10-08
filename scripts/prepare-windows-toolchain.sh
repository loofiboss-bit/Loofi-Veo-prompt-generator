#!/usr/bin/env bash
# Private build tools only; never installs packages or modifies the active desktop.
set -euo pipefail
build_tools="${CREATOR_WINDOWS_TOOLS:-/tmp/loofi-v15-runtime}"
mkdir -p "$build_tools"
archive="$build_tools/llvm-mingw.tar.xz"
if [[ ! -f "$archive" ]]; then
  curl --fail --location --retry 3 --silent --show-error https://github.com/mstorsjo/llvm-mingw/releases/download/20261006/llvm-mingw-20261006-ucrt-ubuntu-22.04-x86_64.tar.xz -o "$archive"
fi
printf '%s  %s\n' 5f9c6ed95b2d4bdb2869a488c5fd5857fbdabcf288a0aa3eb1da43f6a08d8ab4 "$archive" | sha256sum --check --status
tar -xf "$archive" -C "$build_tools"
python3 -m venv "$build_tools/python-tools"
"$build_tools/python-tools/bin/pip" install meson==1.9.2
curl --fail --location --retry 3 --silent --show-error https://codeload.github.com/mingw-w64/mingw-w64/tar.gz/a3d93999ef0521681d45e445c39964a7af0f593f -o "$build_tools/mingw-runtime-sources.tar.gz"
printf '%s  %s\n' c08776647d5744df7f6ae2bf131da4c9c0fd9934f7a11ecc85cd5692d4b01b62 "$build_tools/mingw-runtime-sources.tar.gz" | sha256sum --check --status
curl --fail --location --retry 3 --silent --show-error https://codeload.github.com/mstorsjo/llvm-mingw/tar.gz/refs/tags/20261006 -o "$build_tools/llvm-mingw-20261006-source.tar.gz"
printf '%s  %s\n' c2420cffca252535942318334c28aa79514671f6df2e02b403f8198d39e0ba31 "$build_tools/llvm-mingw-20261006-source.tar.gz" | sha256sum --check --status
if [[ ! -d "$build_tools/llvm-runtime-source/.git" ]]; then
  git clone --filter=blob:none --no-checkout --depth 1 --branch llvmorg-23.1.3 https://github.com/llvm/llvm-project.git "$build_tools/llvm-runtime-source"
fi
git -C "$build_tools/llvm-runtime-source" sparse-checkout set compiler-rt libcxx libcxxabi libunwind cmake
git -C "$build_tools/llvm-runtime-source" checkout
[[ "$(git -C "$build_tools/llvm-runtime-source" rev-parse HEAD)" == 0d261d1ca552c95a8f007e061c787ac7132fbcbc ]]
tar -cJf "$build_tools/llvm-runtime-23.1.3.tar.xz" --exclude=.git -C "$build_tools/llvm-runtime-source" compiler-rt libcxx libcxxabi libunwind cmake LICENSE.TXT
printf 'Prepared llvm-mingw 20261006 and corresponding linked runtime sources under %s\n' "$build_tools"
