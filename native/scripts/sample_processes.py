#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Sample a root process and its descendants; CPU percent uses one core = 100%."""
import argparse
import json
from pathlib import Path
import time
import psutil


def memory_kib(pid):
    values = {}
    for line in Path(f'/proc/{pid}/smaps_rollup').read_text().splitlines():
        if line.startswith(('Pss:', 'Rss:')):
            key, amount, _unit = line.split()
            values[key.rstrip(':').lower()] = int(amount)
    return values


def sample(root, previous, elapsed):
    processes = [root, *root.children(recursive=True)]
    pss = rss = cpu_seconds = 0
    current = {}
    members = []
    for process in processes:
        try:
            key = (process.pid, process.create_time())
            cpu = process.cpu_times()
            total = cpu.user + cpu.system
            current[key] = total
            # New children contribute their CPU since birth, existing ones the interval delta.
            cpu_seconds += max(0, total - previous.get(key, total if not previous else 0))
            memory = memory_kib(process.pid)
            pss += memory['pss']
            rss += memory['rss']
            members.append({'pid': process.pid, 'name': process.name(), **memory})
        except psutil.AccessDenied as error:
            raise RuntimeError(f"Cannot measure full process group: permission denied for PID {process.pid}") from error
        except (psutil.NoSuchProcess, FileNotFoundError, ProcessLookupError):
            continue
    return current, {'pss_kib': pss, 'rss_kib': rss,
                     'cpu_percent_one_core': cpu_seconds / elapsed * 100 if elapsed else None,
                     'processes': members}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pid', type=int, required=True)
    parser.add_argument('--duration', type=float, default=30)
    parser.add_argument('--interval', type=float, default=1)
    args = parser.parse_args()
    if args.duration <= 0 or args.interval <= 0:
        parser.error('duration and interval must be positive')
    root = psutil.Process(args.pid)
    previous, _ = sample(root, {}, 0)
    start = last = time.monotonic()
    records = []
    while time.monotonic() - start < args.duration:
        time.sleep(max(0, min(args.interval, args.duration - (time.monotonic() - start))))
        now = time.monotonic()
        if not root.is_running() or root.status() == psutil.STATUS_ZOMBIE:
            raise RuntimeError('application exited during sampling')
        previous, record = sample(root, previous, now - last)
        record['elapsed_seconds'] = now - start
        records.append(record)
        last = now
    print(json.dumps({'pid': args.pid, 'duration_seconds': last - start,
                      'interval_seconds': args.interval, 'samples': records}))


if __name__ == '__main__':
    main()
