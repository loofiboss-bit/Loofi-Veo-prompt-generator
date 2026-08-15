import { describe, it, expect } from 'vitest';
import { buildOtioTimeline, exportOtioJson } from './otioExportService';
import type { Shot } from '@core/types';

describe('otioExportService', () => {
  it('builds a valid multi-track OpenTimelineIO structure with markers', () => {
    const mockShots: Shot[] = [
      {
        id: 1,
        action: 'Detective enters rain-soaked alley',
        camera: '35mm slow push-in',
        duration: 4,
        dialogue: 'Follow me closely.',
      } as Shot,
      {
        id: 2,
        action: 'Neon sign flickers above',
        camera: 'Low-angle tilt up',
        duration: 3,
      } as Shot,
    ];

    const timeline = buildOtioTimeline({
      projectName: 'Cyberpunk Noir Episode 1',
      fps: 24,
      shots: mockShots,
    });

    expect(timeline.OTIO_SCHEMA).toBe('Timeline.1');
    expect(timeline.name).toBe('Cyberpunk Noir Episode 1');
    expect(timeline.tracks.children.length).toBe(3); // V1, V2, A1
    expect(timeline.tracks.children[0].name).toBe('V1 - Primary Veo Takes');
    expect(timeline.tracks.children[0].children.length).toBe(2);
    expect(timeline.tracks.children[0].children[0].markers.length).toBe(2);
  });

  it('exports valid JSON string', () => {
    const json = exportOtioJson({
      shots: [{ id: 1, action: 'Test shot', duration: 4 } as Shot],
    });
    expect(json).toContain('"OTIO_SCHEMA": "Timeline.1"');
    expect(json).toContain('"name": "V1 - Primary Veo Takes"');
  });
});
