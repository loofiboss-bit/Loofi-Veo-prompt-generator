#!/usr/bin/env bash
# Build the minimal offline render runtime from pinned corresponding sources.
# Host prerequisites: GNU build tools (including static libstdc++), cmake, pkg-config, curl, git, xz, python3, gpg.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
build_root=${CREATOR_BUILD_ROOT:-/tmp/loofi-creator-runtime-build}
prefix="$build_root/prefix"
target=${1:-"$root/packaging/media-runtime/linux-x64"}
jobs=${CREATOR_BUILD_JOBS:-4}
mkdir -p "$build_root/sources" "$prefix" "$target/sources"
export PKG_CONFIG_PATH="$prefix/lib/pkgconfig:$prefix/lib64/pkgconfig"
export PKG_CONFIG_LIBDIR="$PKG_CONFIG_PATH"
export CFLAGS='-O2 -fPIC'
export CXXFLAGS='-O2 -fPIC'

fetch_source() {
  local name=$1 url=$2 digest=$3
  if [[ ! -f "$build_root/sources/$name" ]]; then
    curl --fail --location --retry 3 --silent --show-error "$url" -o "$build_root/sources/$name"
  fi
  printf '%s  %s\n' "$digest" "$build_root/sources/$name" | sha256sum --check --status
}
fetch_source ffmpeg-9.0.2.tar.xz https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz 8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e
if [[ ! -f "$build_root/sources/ffmpeg-9.0.2.tar.xz.asc" ]]; then
  curl --fail --location --silent --show-error https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz.asc -o "$build_root/sources/ffmpeg-9.0.2.tar.xz.asc"
  curl --fail --location --silent --show-error https://ffmpeg.org/ffmpeg-devel.asc -o "$build_root/sources/ffmpeg-devel.asc"
fi
mkdir -p "$build_root/gpg"
chmod 700 "$build_root/gpg"
gpg --homedir "$build_root/gpg" --batch --import "$build_root/sources/ffmpeg-devel.asc"
verification=$(gpg --homedir "$build_root/gpg" --batch --status-fd 1 --verify "$build_root/sources/ffmpeg-9.0.2.tar.xz.asc" "$build_root/sources/ffmpeg-9.0.2.tar.xz")
[[ "$verification" == *"VALIDSIG FCF986EA15E6E293A5644F10B4322F04D67658D8"* ]]
fetch_source freetype-2.14.1.tar.xz https://download.savannah.gnu.org/releases/freetype/freetype-2.14.1.tar.xz 32427e8c471ac095853212a37aef816c60b42052d4d9e48230bab3bdf2936ccc
fetch_source fribidi-1.0.17.tar.xz https://github.com/fribidi/fribidi/releases/download/v1.0.17/fribidi-1.0.17.tar.xz 6949dcde27d41cebad1fd741fcafc36d55a1020d2d872d4a6eb3914caabbada2
fetch_source harfbuzz-14.6.0.tar.xz https://github.com/harfbuzz/harfbuzz/releases/download/14.6.0/harfbuzz-14.6.0.tar.xz d07a007327277708a2a73ae437887cdbaf282937f6d03ca5467723e9099af586
fetch_source libass-0.17.5.tar.xz https://github.com/libass/libass/releases/download/0.17.5/libass-0.17.5.tar.xz 2dca25c0e0c837ddf00b52011b3f82cac1e4ddd3ad018227806b0c2288864acc
fetch_source zlib-1.3.1.tar.gz https://zlib.net/fossils/zlib-1.3.1.tar.gz 9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23
if [[ ! -d "$build_root/x264/.git" ]]; then
  git clone --quiet https://code.videolan.org/videolan/x264.git "$build_root/x264"
fi
git -C "$build_root/x264" checkout --quiet 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee
if [[ ! -f "$build_root/sources/x264-0480cb05.tar.xz" ]]; then
  git -C "$build_root/x264" archive --format=tar --prefix=x264/ HEAD | xz > "$build_root/sources/x264-0480cb05.tar.xz"
fi
for name in ffmpeg-9.0.2 freetype-2.14.1 fribidi-1.0.17 harfbuzz-14.6.0 libass-0.17.5; do
  [[ -d "$build_root/$name" ]] || tar -xf "$build_root/sources/$name.tar.xz" -C "$build_root"
done
[[ -d "$build_root/zlib-1.3.1" ]] || tar -xf "$build_root/sources/zlib-1.3.1.tar.gz" -C "$build_root"
(cd "$build_root/zlib-1.3.1"; ./configure --prefix="$prefix" --static; make -j"$jobs"; make install)

cmake -S "$build_root/freetype-2.14.1" -B "$build_root/freetype-build" -DCMAKE_INSTALL_PREFIX="$prefix" -DCMAKE_INSTALL_LIBDIR=lib -DBUILD_SHARED_LIBS=OFF -DFT_DISABLE_ZLIB=TRUE -DFT_DISABLE_BZIP2=TRUE -DFT_DISABLE_PNG=TRUE -DFT_DISABLE_HARFBUZZ=TRUE -DFT_DISABLE_BROTLI=TRUE
cmake --build "$build_root/freetype-build" --parallel "$jobs"
cmake --install "$build_root/freetype-build"
(cd "$build_root/fribidi-1.0.17"; ./configure --prefix="$prefix" --disable-shared --enable-static; make -C lib -j"$jobs"; make -C lib install; make install-pkgconfigDATA)
cmake -S "$build_root/harfbuzz-14.6.0" -B "$build_root/harfbuzz-build" -DCMAKE_INSTALL_PREFIX="$prefix" -DCMAKE_INSTALL_LIBDIR=lib -DBUILD_SHARED_LIBS=OFF -DHB_HAVE_FREETYPE=OFF -DHB_HAVE_GLIB=OFF -DHB_HAVE_GOBJECT=OFF -DHB_HAVE_CAIRO=OFF -DHB_HAVE_ICU=OFF -DHB_BUILD_UTILS=OFF -DHB_BUILD_SUBSET=OFF -DHB_BUILD_RASTER=OFF -DHB_BUILD_VECTOR=OFF -DHB_BUILD_GPU=OFF -DHB_BUILD_GPU_DEMO=OFF
cmake --build "$build_root/harfbuzz-build" --parallel "$jobs"
cmake --install "$build_root/harfbuzz-build"
(cd "$build_root/libass-0.17.5"; ./configure --prefix="$prefix" --disable-shared --enable-static --disable-fontconfig --disable-require-system-font-provider --disable-asm; make -j"$jobs"; make install)
(cd "$build_root/x264"; ./configure --prefix="$prefix" --enable-static --disable-cli --disable-asm --disable-opencl; make -j"$jobs"; make install)
(cd "$build_root/ffmpeg-9.0.2"; ./configure --prefix="$prefix" --enable-gpl --enable-version3 --enable-libx264 --enable-libass --enable-zlib --pkg-config-flags=--static --disable-shared --enable-static --disable-autodetect --disable-doc --disable-debug --disable-x86asm --disable-ffplay --extra-ldflags="-L$prefix/lib -static-libstdc++ -static-libgcc" --extra-libs='-lstdc++ -lm -lpthread'; make -j"$jobs"; make install)
cp "$prefix/bin/ffmpeg" "$prefix/bin/ffprobe" "$target/"
cp "$build_root"/sources/*.tar.xz "$target/sources/"
cp "$build_root"/sources/*.tar.gz "$target/sources/"
cp "$build_root"/sources/*.asc "$target/sources/"
if [[ -n "${CREATOR_GCC_RUNTIME_SOURCE:-}" ]]; then
  cp "$CREATOR_GCC_RUNTIME_SOURCE" "$target/sources/"
fi
if [[ -f /usr/share/licenses/gcc/COPYING.RUNTIME ]]; then
  cp /usr/share/licenses/gcc/COPYING.RUNTIME "$target/sources/LICENSE-GCC-RUNTIME-EXCEPTION.txt"
fi
cp "${BASH_SOURCE[0]}" "$target/sources/build-media-runtime-linux.sh"
cp "$build_root/ffmpeg-9.0.2/COPYING.GPLv3" "$target/sources/LICENSE-GPL-3.0.txt"
cp "$build_root/libass-0.17.5/COPYING" "$target/sources/LICENSE-libass.txt"
cp "$build_root/harfbuzz-14.6.0/COPYING" "$target/sources/LICENSE-harfbuzz.txt"
cp "$build_root/fribidi-1.0.17/COPYING" "$target/sources/LICENSE-fribidi.txt"
cp "$build_root/freetype-2.14.1/docs/FTL.TXT" "$target/sources/LICENSE-freetype.txt"
python3 - "$target" <<'PY'
import hashlib,json,pathlib,subprocess,sys
p=pathlib.Path(sys.argv[1]);digest=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
sources=[{'path':f.relative_to(p).as_posix(),'sha256':digest(f)} for f in sorted((p/'sources').glob('*')) if f.is_file()]
configuration=subprocess.check_output([str(p/'ffmpeg'),'-version'],text=True)
if not configuration.startswith('ffmpeg version 9.0.2 '):raise RuntimeError('Unexpected FFmpeg version')
manifest={'schemaVersion':1,'version':'9.0.2','license':'GPL-3.0-or-later','distributionReady':True,'platform':'linux-x64','files':{f:digest(p/f) for f in ['ffmpeg','ffprobe']},'sources':sources,'build':{'configuration':configuration,'dependencies':{'x264':'0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee','libass':'0.17.5','harfbuzz':'14.6.0','fribidi':'1.0.17','freetype':'2.14.1','zlib':'1.3.1'}}}
(p/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
PY
printf 'Built offline rendering bundle at %s\n' "$target"
