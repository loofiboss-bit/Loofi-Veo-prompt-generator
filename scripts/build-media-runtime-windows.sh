#!/usr/bin/env bash
# Cross-build exact Windows x64 runtime from reviewed source archives; no host installation.
set -euo pipefail
repository_root="$(cd "$(dirname "$0")/.." && pwd)"
source_root="${CREATOR_RUNTIME_SOURCES:-/tmp/loofi-creator-runtime-build/sources}"
work_root="${CREATOR_WINDOWS_BUILD:-/tmp/loofi-creator-runtime-windows}"
toolchain_root="${CREATOR_WINDOWS_TOOLCHAIN:-/tmp/loofi-v15-runtime/llvm-mingw-20261006-ucrt-ubuntu-22.04-x86_64}"
meson_binary="${CREATOR_MESON:-/tmp/loofi-v15-runtime/python-tools/bin/meson}"
parallelism="${CREATOR_BUILD_JOBS:-4}"
export PATH="$toolchain_root/bin:$PATH"
export CC=x86_64-w64-mingw32-clang CXX=x86_64-w64-mingw32-clang++ AR=x86_64-w64-mingw32-ar RANLIB=x86_64-w64-mingw32-ranlib
export PKG_CONFIG_LIBDIR="$work_root/prefix/lib/pkgconfig" PKG_CONFIG_PATH="$work_root/prefix/lib/pkgconfig"
mkdir -p "$work_root" "$work_root/prefix"
cd "$source_root"
sha256sum -c <<'HASHES'
8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e  ffmpeg-9.0.2.tar.xz
32427e8c471ac095853212a37aef816c60b42052d4d9e48230bab3bdf2936ccc  freetype-2.14.1.tar.xz
6949dcde27d41cebad1fd741fcafc36d55a1020d2d872d4a6eb3914caabbada2  fribidi-1.0.17.tar.xz
d07a007327277708a2a73ae437887cdbaf282937f6d03ca5467723e9099af586  harfbuzz-14.6.0.tar.xz
2dca25c0e0c837ddf00b52011b3f82cac1e4ddd3ad018227806b0c2288864acc  libass-0.17.5.tar.xz
HASHES
# Verify pinned source bytes independently of the host XZ encoder/thread mode.
x264_source_hash=$(xz -dc "$source_root/x264-0480cb05.tar.xz" | sha256sum | cut -d ' ' -f 1)
[[ "$x264_source_hash" == c41b6486dd855b99fd69a27fa81639d5fd8f098a064385d1c160b9a9b4cccde9 ]]
for archive in ffmpeg-9.0.2 freetype-2.14.1 fribidi-1.0.17 harfbuzz-14.6.0 libass-0.17.5 x264-0480cb05; do
  tar -xf "$source_root/$archive.tar.xz" -C "$work_root"
done
prefix="$work_root/prefix"
cat > "$work_root/cross.ini" <<CROSS
[binaries]
c = 'x86_64-w64-mingw32-clang'
cpp = 'x86_64-w64-mingw32-clang++'
ar = 'x86_64-w64-mingw32-ar'
strip = 'x86_64-w64-mingw32-strip'
pkg-config = 'pkg-config'
[host_machine]
system = 'windows'
cpu_family = 'x86_64'
cpu = 'x86_64'
endian = 'little'
[properties]
needs_exe_wrapper = true
[built-in options]
default_library = 'static'
buildtype = 'release'
c_link_args = ['-static']
cpp_link_args = ['-static']
CROSS
printf '%s  %s\n' 9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23 "$source_root/zlib-1.3.1.tar.gz" | sha256sum --check --status
tar -xf "$source_root/zlib-1.3.1.tar.gz" -C "$work_root"
cmake -S "$work_root/zlib-1.3.1" -B "$work_root/zlib-build" -G Ninja -DCMAKE_SYSTEM_NAME=Windows -DCMAKE_C_COMPILER="$CC" -DCMAKE_INSTALL_PREFIX="$prefix" -DCMAKE_INSTALL_LIBDIR=lib
cmake --build "$work_root/zlib-build" --target zlibstatic -j "$parallelism"
mkdir -p "$prefix/include" "$prefix/lib/pkgconfig"
cp "$work_root/zlib-build/libzlibstatic.a" "$prefix/lib/libz.a"
cp "$work_root/zlib-1.3.1/zlib.h" "$work_root/zlib-build/zconf.h" "$prefix/include/"
cat > "$prefix/lib/pkgconfig/zlib.pc" <<ZLIB
prefix=$prefix
libdir=$prefix/lib
includedir=$prefix/include
Name: zlib
Description: static source-built zlib
Version: 1.3.1
Libs: -L$prefix/lib -lz
Cflags: -I$prefix/include
ZLIB
cmake -S "$work_root/freetype-2.14.1" -B "$work_root/freetype-build" -G Ninja -DCMAKE_SYSTEM_NAME=Windows -DCMAKE_C_COMPILER="$CC" -DCMAKE_INSTALL_PREFIX="$prefix" -DCMAKE_INSTALL_LIBDIR=lib -DBUILD_SHARED_LIBS=OFF -DFT_DISABLE_ZLIB=ON -DFT_DISABLE_BZIP2=ON -DFT_DISABLE_PNG=ON -DFT_DISABLE_HARFBUZZ=ON -DFT_DISABLE_BROTLI=ON
cmake --build "$work_root/freetype-build" -j "$parallelism"
cmake --install "$work_root/freetype-build"
"$meson_binary" setup "$work_root/fribidi-build" "$work_root/fribidi-1.0.17" --cross-file "$work_root/cross.ini" --prefix "$prefix" --libdir lib -Ddocs=false -Dtests=false -Dbin=false
"$meson_binary" compile -C "$work_root/fribidi-build" -j "$parallelism"
"$meson_binary" install -C "$work_root/fribidi-build"
"$meson_binary" setup "$work_root/harfbuzz-build" "$work_root/harfbuzz-14.6.0" --cross-file "$work_root/cross.ini" --prefix "$prefix" --libdir lib -Dfreetype=enabled -Dglib=disabled -Dgobject=disabled -Dicu=disabled -Dtests=disabled -Dutilities=disabled -Ddocs=disabled -Dintrospection=disabled -Dsubset=disabled -Dgpu=disabled -Dvector=disabled
"$meson_binary" compile -C "$work_root/harfbuzz-build" -j "$parallelism"
"$meson_binary" install -C "$work_root/harfbuzz-build"
"$meson_binary" setup "$work_root/libass-build" "$work_root/libass-0.17.5" --cross-file "$work_root/cross.ini" --prefix "$prefix" --libdir lib -Dfontconfig=disabled -Ddirectwrite=enabled -Dcoretext=disabled -Dlibunibreak=disabled -Dasm=disabled -Dtest=disabled -Dcompare=disabled -Dprofile=disabled -Dfuzz=disabled -Dcheckasm=disabled
"$meson_binary" compile -C "$work_root/libass-build" -j "$parallelism"
"$meson_binary" install -C "$work_root/libass-build"
cd "$work_root/x264"
./configure --prefix="$prefix" --host=x86_64-w64-mingw32 --cross-prefix=x86_64-w64-mingw32- --enable-static --disable-cli --disable-opencl --disable-asm --extra-ldflags=-static
make -j "$parallelism"
make install
cd "$work_root/ffmpeg-9.0.2"
./configure --prefix="$prefix" --target-os=mingw32 --arch=x86_64 --enable-cross-compile --cross-prefix=x86_64-w64-mingw32- --cc="$CC" --cxx="$CXX" --pkg-config=pkg-config --pkg-config-flags=--static --enable-gpl --enable-version3 --enable-zlib --enable-libx264 --enable-libass --enable-libfreetype --enable-libharfbuzz --enable-libfribidi --disable-autodetect --disable-network --disable-doc --disable-debug --disable-ffplay --disable-shared --enable-static --disable-x86asm --extra-cflags="-I$prefix/include" --extra-ldflags="-L$prefix/lib -static"
make -j "$parallelism" ffmpeg.exe ffprobe.exe
output="$repository_root/packaging/media-runtime/win32-x64"
mkdir -p "$output/sources"
cp ffmpeg.exe ffprobe.exe "$output/"
cp "$source_root/"*.tar.xz "$source_root/"*.tar.gz "$output/sources/"
cp "$repository_root/scripts/build-media-runtime-windows.sh" "$output/sources/"
cp "$toolchain_root/LICENSE.TXT" "$output/sources/LLVM-MINGW-LICENSE.txt"
node "$repository_root/scripts/finalize-windows-runtime.mjs" "$output"
