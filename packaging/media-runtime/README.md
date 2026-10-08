# Offline rendering runtime

The distribution gate requires exact FFmpeg/ffprobe 9.0.2 resources for both Linux x64 and Windows x64. It rejects missing binaries, modified artifacts, nightly version strings and missing H.264, AAC, PNG or subtitle support. The app never downloads its renderer at startup or uses an arbitrary host FFmpeg.

Build from pinned corresponding sources:

```sh
npm run media-runtime:build:linux
bash scripts/prepare-windows-toolchain.sh
npm run media-runtime:build:windows
npm run media-runtime:check
```

The Linux recipe requires a static C++ runtime in its isolated compiler environment. On Fedora, extract the matching `libstdc++-static` RPM privately and supply its library directory through `LIBRARY_PATH`; no host installation is necessary. Set `CREATOR_GCC_RUNTIME_SOURCE` to a matching compiler-runtime source archive to include it in the bundle. The locally verified Fedora bundle includes the signed `gcc-16.2.1-2.fc44.src.rpm` and GCC Runtime Library Exception 3.1.

The Windows recipe uses the checksum-pinned llvm-mingw 20261006 toolchain and archives its matching LLVM and mingw runtime sources. Windows binaries can be inspected through a private Wine prefix during cross-building; genuine Windows tests remain in `creator-runtime.yml`. The regular release build calls that workflow before retrieving resources and packaging.

Each generated platform directory contains binaries, a SHA-256 manifest, original FFmpeg and linked media-library source archives, licenses and complete build scripts. FFmpeg's source checksum and upstream OpenPGP signature are checked by the Linux recipe. Bundles are generated artifacts and intentionally ignored by Git. `extraResources` packages both platform bundles and the local Noto font collection.

To use a separately reviewed bundle, run `node scripts/provision-media-runtime.mjs /absolute/path/to/bundle`. Checksums establish integrity against its manifest; source provenance and correspondence must still be reviewed before setting `distributionReady`.

Local evidence establishes Linux rendering and Windows version/features under Wine. It does not establish physical Windows installation, accessibility with a screen reader, or a public release.
