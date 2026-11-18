#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Generate an original codec-unencumbered synthetic VP8 fixture."""
import pathlib
import subprocess
import sys

output = pathlib.Path(sys.argv[1])
output.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
    "-i", "testsrc2=size=1280x720:rate=30", "-t", "30", "-c:v", "libvpx",
    "-deadline", "realtime", "-cpu-used", "8", "-b:v", "1M", "-an", str(output)
], check=True)
