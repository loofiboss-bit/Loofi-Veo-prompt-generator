import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { median, measure } from './measure.mjs';

const require = createRequire(import.meta.url);
const { ProjectDatabase } = require('../electron/project-db.cjs');

export async function runSqliteBenchmark({ runs = 5, scenes = 50 } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loofi-bench-sqlite-'));
  const db = new ProjectDatabase(path.join(root, 'bench.sqlite')).open();

  const shots = Array.from({ length: scenes }, (_, i) => ({
    id: i + 1,
    type: 'video',
    action: `Scene ${i + 1} kinetic tracking shot`,
    camera: 'Medium wide lens',
    duration: 5,
    takes: [],
  }));
  const clips = Array.from({ length: scenes }, (_, i) => ({
    id: `clip-${i + 1}`,
    trackId: 'video_main',
    resourceId: i + 1,
    startTime: i * 5,
    duration: 5,
    offset: 0,
    type: 'video',
  }));

  try {
    let revision = db.commitDelta({
      projectId: 'bench-sqlite-50',
      expectedRevision: 0,
      document: {
        id: 'bench-sqlite-50',
        name: 'SQLite WAL Benchmark',
        schemaVersion: 18,
        storyboard: {
          shots,
          timeline: {
            tracks: [
              { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
            ],
            clips,
          },
        },
      },
    }).documentRevision;

    const records = [];
    for (let i = 0; i < runs; i += 1) {
      const m = await measure(async () => {
        const res = db.commitDelta({
          projectId: 'bench-sqlite-50',
          expectedRevision: revision,
          delta: {
            upsertedShots: [
              {
                id: (i % scenes) + 1,
                type: 'video',
                action: `Bench scene edit ${i}`,
                duration: 5,
                takes: [],
              },
            ],
          },
        });
        revision = res.documentRevision;
        return res;
      });
      records.push(m);
    }

    const durations = records.map((r) => r.durationMs);
    return {
      scenes,
      runs,
      medianMs: median(durations),
      maxMs: Math.max(...durations),
      records,
    };
  } finally {
    db.close();
    await fs.rm(root, { recursive: true, force: true });
  }
}
