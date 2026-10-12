#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Aggregate the M0 qualification datasets, retaining only complete run pairs."""
import argparse
import hashlib
import json
import math
import statistics
from pathlib import Path


def stats(values):
    ordered = sorted(values)
    return {
        "count": len(ordered),
        "median": statistics.median(ordered),
        "minimum": ordered[0],
        "maximum": ordered[-1],
        "p95": ordered[math.ceil(len(ordered) * 0.95) - 1],
    }


def complete_pairs(records, scenario, phase):
    selected = []
    for pair in sorted({r["pair"] for r in records}):
        group = [r for r in records if r["pair"] == pair
                 and r["scenario"] == scenario and r["phase"] == phase]
        if len(group) == 2 and {r["kind"] for r in group} == {"native", "electron"} \
                and all(r["status"] == "passed" for r in group):
            selected.extend(group)
    return selected


def metric(record, key):
    samples = record["resources"]["samples"]
    if key != "cpu_percent_one_core":
        return statistics.median(s[key] for s in samples)
    previous = 0.0
    total = 0.0
    for sample in samples:
        elapsed = sample["elapsed_seconds"]
        total += sample[key] * (elapsed - previous)
        previous = elapsed
    return total / previous


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("full", type=Path)
    parser.add_argument("empty_projects", type=Path)
    parser.add_argument("studio_retry", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    paths = [args.full, args.empty_projects, args.studio_retry]
    datasets = [json.loads(p.read_text()) for p in paths]
    for key in ["nativeSha256", "electronSha256", "videoSha256", "qt", "rust", "package"]:
        assert len({d["environment"][key] for d in datasets}) == 1, key
    full, projects, retry = [d["records"] for d in datasets]
    selected = {
        "projects": complete_pairs(projects, "projects", "resources"),
        "studio": complete_pairs(full, "studio", "resources")
                  + complete_pairs(retry, "studio", "resources"),
        "video-playing": complete_pairs(full, "video-playing", "resources"),
        "video-paused": complete_pairs(full, "video-paused", "resources"),
    }
    assert all(len(records) == 10 for records in selected.values()), "Need five complete pairs per workload"
    startup = complete_pairs(full, "studio", "startup")
    assert len(startup) == 40, "Need twenty complete startup pairs"
    result = {
        "schemaVersion": 1,
        "datasets": [{"file": p.name, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                     for p in paths],
        "selection": "Initial Projects runs excluded: Electron default project made inventories unequal. Studio uses four initial complete pairs and one complete retry; orphaned native run excluded. All failed attempts remain in raw datasets.",
        "failedAttempts": sum(d["failedRuns"] for d in datasets),
        "summary": {},
    }
    for kind in ["native", "electron"]:
        result["summary"][kind] = {
            "startupMs": stats([r["startupMs"] for r in startup if r["kind"] == kind]),
            "resources": {scenario: {
                key: stats([metric(r, key) for r in records if r["kind"] == kind])
                for key in ["pss_kib", "rss_kib", "cpu_percent_one_core"]}
                for scenario, records in selected.items()},
        }
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result["summary"], indent=2))


if __name__ == "__main__":
    main()
