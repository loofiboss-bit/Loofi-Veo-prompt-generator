#!/usr/bin/env bash
set -euo pipefail

version="${LOOFI_COPR_VERSION:-12.0.0}"
resultdir="${COPR_RESULTDIR:-.}"
base_url="https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/v${version}"
spec_ref="${LOOFI_COPR_SPEC_REF:-v12.0.0}"
raw_url="https://raw.githubusercontent.com/loofiboss-bit/Loofi-Veo-prompt-generator/${spec_ref}/packaging/copr"
artifact="Loofi-Flow-Veo-Studio-${version}-linux-x86_64.rpm"

mkdir -p "${resultdir}"
curl --fail --location --retry 3 --silent --show-error \
    "${base_url}/${artifact}" \
    --output "${resultdir}/${artifact}"
curl --fail --location --retry 3 --silent --show-error \
    "${base_url}/SHA256SUMS.txt" \
    --output "${resultdir}/SHA256SUMS.txt"

expected_hash="$(awk -v artifact="${artifact}" '$2 == artifact { print $1 }' "${resultdir}/SHA256SUMS.txt")"
test -n "${expected_hash}"
printf '%s  %s\n' "${expected_hash}" "${resultdir}/${artifact}" | sha256sum --check --status

curl --fail --location --retry 3 --silent --show-error \
    "${raw_url}/veo-prompt-generator.spec" \
    --output "${resultdir}/veo-prompt-generator.spec"
rm -f "${resultdir}/SHA256SUMS.txt"

test -s "${resultdir}/${artifact}"
test -s "${resultdir}/veo-prompt-generator.spec"
