# Installation and updates

The v9 release targets are Windows 11 x64 and Fedora 44 x86_64. Windows uses an NSIS installer or
portable executable; Fedora uses an RPM or AppImage. macOS is not a production-supported v9 target.

Install only release assets whose SHA-256 entry matches `SHA256SUMS.txt`. Release deliverables also
include a CycloneDX SBOM and provenance. Unsigned packages must remain clearly identified as
unsigned local or community candidates.

The updater accepts HTTPS assets only from this repository's allowlisted GitHub Release channel. It
downloads the checksum manifest independently, verifies the selected asset before exposing it to the
operating system installer, and never treats an unverified partial download as installable.

The legacy `Loofi-Flow-Veo-Studio-*` package filename is retained for updater compatibility. The
installed and visible product name is Loofi Creator Studio, and the application identity remains
`com.loofi.flowveostudio`.

See [Installation](Installation.md), [Troubleshooting](Troubleshooting.md), and the tagged GitHub
Release for published artifacts and checksums.
