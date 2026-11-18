# M0 performance qualification

Measured on 2026-10-12, Fedora 44 KDE Plasma Wayland, Intel Iris Xe, 1920×1080
60 Hz panel at scale 1. Both application content areas are 1280×800, English,
with isolated XDG roots and Electron userData. Other desktop applications were
left running. Native is a release build based on
`fac29104eab98fd85e79a2ea9a839710cd5b66b4` plus the uncommitted M0 sources in
[source-manifest.json](source-manifest.json), Qt 6.11.2 and Rust 1.93.0.
Electron is installed RPM `veo-prompt-generator-15.0.0-1.fc44.x86_64`, source RPM
`veo-prompt-generator-15.0.0-1.fc44.src.rpm`. The locally verified `v15.0.0`
source tag resolves to `1ed01661eafec79dd7620542269add47fb8c396d`; this associates
the version with a source revision, without claiming a new RPM provenance audit.
Native readiness logs confirm Wayland/OpenGL. Electron GPU feature metadata is
included in raw data; it does not establish that each video used hardware decode.

| Artifact                                                    | SHA-256                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Native release executable                                   | `4f843ff6517580f94b7b86f03af2e65ffd823c4132167f8baeb2836f76939953` |
| Packaged Electron executable                                | `5b87aacaae7521dcd94302997ee180fb49e5c4c17165ac2e542a3e60a438a4d6` |
| Packaged Electron app.asar                                  | `e649147acb055c832afb1fc947a3d64f83676df834c259c70c9a60923d32cd34` |
| Synthetic VP8 video, 1280×720, 30 fps, 30 seconds, no audio | `b89cb237ddd602aa2e9453daae0e44508022d57bf68391a818e8b4ab1d22c566` |

## Method and dataset selection

Twenty alternating startup pairs measure process launch to usable rendered Prompt
Studio with warm system cache. Native emits readiness after Qt frame completion;
Electron attaches Playwright/CDP, verifies userData, checks the editable idea field
and waits two animation frames. The latter includes attachment/verification
cost. No independent observer-overhead calibration was performed; native stdout
observation is lighter. Electron uses a prepared profile clone, while native
starts with fresh XDG directories because M0 has no onboarding. These differences
prevent a precise framework speedup or cold-disk-cache claim.

Each resource scenario has five complete alternating run pairs. After 10 seconds
stabilization, `/proc/smaps_rollup` and process CPU ticks are sampled for 30 seconds
at approximately one-second intervals. The root and all current descendants are
included, including Electron renderer/GPU processes. Harness and sampler are
excluded. PSS is preferred: summed RSS counts shared pages multiple times. Memory
is the median within each run; CPU is a time-weighted mean normalized to one core
(100% = one occupied core). The tables give the median across runs and the range
of those per-run values. Zero CPU means no measurable CPU ticks in this window,
not a proof of zero energy use. Very short-lived processes can escape sampling.

Video import/preparation happens before stabilization. Both apps play the same
fixture repeatedly; the paused workload retains a decoded frame. Native requires
a valid 1280×720 video frame before readiness and monitors intended play/pause
state. Electron checks decoded dimensions/advancing time and final media state.
Neither record counts setup/import CPU as steady playback. Idle Studio and empty
Projects have no ongoing analysis or 3D animation.

The initial full dataset contains twenty startup pairs and five attempted pairs
for each resource workload. Its Projects data is excluded: packaged v15 seeds
“My First Project”, whereas native starts empty. A supplemental dataset repeats
all five Projects pairs with zero displayed rows in both apps. For Electron,
the harness uses the existing exported Zustand store in the verified temporary
profile to create an empty in-memory fixture; default metadata remains only in
that temporary profile. No app source or persisted project format changes.

Initial Studio pair 4 (zero-based pair 3) failed because the Electron process
exited during sampling. Its cause was not captured by that initial harness;
no crash claim is made. The failed attempt and successful native orphan remain in
the full raw dataset and are excluded from paired statistics. A supplemental
complete Studio pair replaces it. Later attempts record stderr and exit status.

Raw evidence:

- [Initial full run](benchmarks/2026-10-12-fedora44-wayland.json): includes the failed attempt and unequal Projects runs.
- [Corrected empty Projects](benchmarks/2026-10-12-empty-projects.json): five complete pairs.
- [Studio replacement pair](benchmarks/2026-10-12-studio-retry.json): one complete pair.
- [Selected paired summary](benchmarks/selected-summary.json): dataset hashes, medians, ranges and nearest-rank p95.

## Results

### Startup (20 complete pairs)

| App      | Median ms |      Range ms | p95 ms |
| -------- | --------: | ------------: | -----: |
| Native   |     496.1 |   450.5–673.8 |  626.9 |
| Electron |    1601.7 | 1543.0–2166.9 | 2133.0 |

### Resources (five complete pairs per workload)

Values are median (minimum–maximum). Memory is MiB; CPU is % of one core.

| Workload      | App      |                PSS MiB |                RSS MiB |             CPU % |
| ------------- | -------- | ---------------------: | ---------------------: | ----------------: |
| projects      | Native   | 156.63 (156.40–156.92) | 209.90 (209.55–210.06) |  0.00 (0.00–0.00) |
| projects      | Electron | 388.47 (387.43–389.42) | 804.16 (803.54–807.03) |  0.73 (0.47–0.87) |
| studio        | Native   | 162.47 (160.36–162.98) | 213.67 (213.37–214.01) |  0.00 (0.00–0.00) |
| studio        | Electron | 382.45 (382.14–384.23) | 800.96 (800.41–804.17) |  0.63 (0.27–0.73) |
| video-playing | Native   | 168.66 (168.19–169.84) | 221.74 (221.58–222.07) | 9.70 (8.80–11.73) |
| video-playing | Electron | 448.45 (445.97–450.90) | 879.40 (875.57–881.93) |  2.83 (2.77–9.90) |
| video-paused  | Native   | 167.34 (167.09–170.17) | 220.85 (220.54–223.78) |  0.00 (0.00–0.03) |
| video-paused  | Electron | 437.65 (436.63–439.31) | 864.88 (862.43–866.10) |  0.83 (0.40–0.90) |

The native prototype uses less PSS for the measured workloads. Video playback
uses more CPU than Electron in this configuration; codec/decoder/GPU selection
and Qt Multimedia buffering should be investigated before adding advanced media
workflows. No inference about GPU power, total-system energy or full feature
parity is supported. M0 omits substantial Electron functionality, and the result
applies only to these workloads. The [GO decision](DECISION.md) uses functional
qualification and these bounded measurements, with no hard performance threshold.

## Reproduction

From the repository root with dependencies installed and the release binary built:

```sh
python3 native/scripts/create_fixture.py /tmp/native-m0-fixtures/benchmark.webm
node native/scripts/benchmark.mjs \
  --native "$(realpath ../.creator-native-m0-build/release/loofi-creator-studio-native)" \
  --video /tmp/native-m0-fixtures/benchmark.webm \
  --output native/docs/benchmarks/new-full-run.json
```

The current harness includes the corrected empty Projects fixture. Reproducing
the historical selected summary uses the existing three raw datasets:

```sh
python3 native/scripts/summarize_benchmarks.py \
  native/docs/benchmarks/2026-10-12-fedora44-wayland.json \
  native/docs/benchmarks/2026-10-12-empty-projects.json \
  native/docs/benchmarks/2026-10-12-studio-retry.json \
  native/docs/benchmarks/selected-summary.json
```

Supplemental runs use `--startup-pairs 0 --workloads projects --resource-pairs 5`
or `--startup-pairs 0 --workloads studio --resource-pairs 1`. Run applications
sequentially; do not run builds or other qualification workloads concurrently.
All attempts are saved, including failures. Compare executable/fixture hashes
and environment before combining new data.
