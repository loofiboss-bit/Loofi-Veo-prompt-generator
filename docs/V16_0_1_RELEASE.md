# v16.0.1 publication verification

Verified on 2026-10-15. [v16.0.1 is public](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v16.0.1)
and is the latest stable GitHub release. PR #65 was merged; native M0 in draft PR #66 remains separate.

## Source and release pipeline

- Source commit and peeled tag: `26e399552ed9e7837e49089c76c5815f5338d358`.
- Annotated tag object: `d080940f638c51d4519f4dc3e5997ed040fb3718`.
- [Canonical release run 38740981465](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/runs/38740981465): all jobs succeeded.
- [PR validation](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/runs/38739025499)
  and [merged main validation](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/runs/38740973361) succeeded.
- Security and CodeQL checks passed on the merged commit.

The canonical pipeline rebuilt the exact Linux and Windows rendering resources, passed 33 real
rendering tests on each platform, and passed 4,312 unit tests, 138 desktop tests and four benchmark
self-tests per package platform. Packaged Electron tests passed on Linux and Windows. Fedora 44,
Fedora latest and Windows install/launch/uninstall jobs passed, including Windows portable launch.

Chromium CI passed 111 scenarios. Its one packaged-only scenario is intentionally skipped in the
browser job and passed in each packaged release job. Production staging passed four smoke and four
stability scenarios. Local `npm run validate:release` also passed without lowering thresholds.

## Published artifact readback

All ten expected release assets exist. The six entries in `SHA256SUMS.txt` match GitHub's
server-computed SHA-256 digests. The RPM was also downloaded completely and hashed locally;
small metadata files were hashed locally. The AppImage and Windows binaries were checked against
server-computed digests, not independently downloaded in full. Manifest, SBOM and provenance
identify the correct version, source commit, tag and canonical workflow run.

`gh attestation verify` passed for the downloaded RPM with the exact source ref, source digest,
signer workflow and signer digest enforced. The canonical workflow attested all desktop binaries;
independent cryptographic attestation verification was performed for the RPM.

Windows packages are unsigned according to the release manifest. Provenance verification does not
imply Windows code signing.

## Fedora COPR and wiki

[COPR build 11138004](https://copr.fedorainfracloud.org/coprs/build/11138004) succeeded and public
Fedora 44 repodata contains `veo-prompt-generator-16.0.1-1.fc44.x86_64`.
The downloaded package matches the repository checksum and its signature verifies using the
project's public key in an isolated file keyring. All 232 compared application, desktop and icon
entries match GitHub, including file content, modes and link targets. Launcher and required Fedora
dependencies were checked. No package was installed on the maintainer host.

The separate [public wiki](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/wiki) was
updated at `ea2e34948d9dbdd62c4541d2b5b890fff6217894`. Home, Quick Start, Release Notes and
Installation and Updates were read back from rendered public pages; the immutable release banner
was fetched successfully.

## Measurements and remaining boundaries

Five alternating baseline/candidate startup pairs measured a median usable Projects view of
1,476.835 ms versus 1,429.444 ms; process-tree RSS was 771.230 MiB versus 764.008 MiB and CPU
2.88 s versus 2.76 s. These are measurements of the recorded pre-release packages in one
environment, not universal improvement claims. See [raw measurements](evidence/v16-stabilization-benchmark.json)
and the [stabilization report](V16_STABILIZATION.md) for methodology and API benchmarks.

The exact historical Google credential was removed from 14 published branches and 64 tags with
explicit owner authorization. Full-history scans and the synthetic detection test pass. Google's
administrative lookup confirms the old key is already purged. GitHub cached objects and read-only
PR references can require GitHub Support cleanup; old forks/clones are outside this rewrite.
Historical release provenance retains its original commit identities. See
[history sanitization](HISTORY_SANITIZATION.md) and [secret review](SECRET_SCAN_REVIEW.md).

Physical hardware, screen readers and human onboarding were not qualified. The inherited Electron
immediate-close/autosave boundary remains documented in the stabilization report. Automated checks
are the release acceptance requirement.

[Machine-readable publication evidence](evidence/v16.0.1-publication.json).
This report is a post-release documentation update; the qualified release tag remains unchanged.
