/**
 * v12 OpenTimelineIO (OTIO) & Professional NLE Export contracts.
 */

export interface OtioRationalTime {
  value: number;
  rate: number;
}

export interface OtioTimeRange {
  start_time: OtioRationalTime;
  duration: OtioRationalTime;
}

export interface OtioMarker {
  OTIO_SCHEMA: 'Marker.1';
  name: string;
  marked_range: OtioTimeRange;
  color: 'RED' | 'GREEN' | 'BLUE' | 'CYAN' | 'MAGENTA' | 'YELLOW' | 'ORANGE' | 'PURPLE';
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface OtioMediaReference {
  OTIO_SCHEMA: 'ExternalReference.1' | 'MissingReference.1';
  name?: string;
  target_url?: string;
  available_range?: OtioTimeRange;
}

export interface OtioClip {
  OTIO_SCHEMA: 'Clip.1';
  name: string;
  source_range?: OtioTimeRange;
  media_reference?: OtioMediaReference;
  markers: OtioMarker[];
  metadata: {
    loofi?: {
      shotId: number;
      prompt?: string;
      negativePrompt?: string;
      modelTarget?: string;
      continuityHash?: string;
      characterProfileIds?: string[];
      cameraRig?: Record<string, unknown>;
      type?: string;
      dialogue?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface OtioTrack {
  OTIO_SCHEMA: 'Track.1';
  name: string;
  kind: 'Video' | 'Audio';
  children: OtioClip[];
  metadata?: Record<string, unknown>;
}

export interface OtioStack {
  OTIO_SCHEMA: 'Stack.1';
  name: string;
  children: OtioTrack[];
  metadata?: Record<string, unknown>;
}

export interface OtioTimeline {
  OTIO_SCHEMA: 'Timeline.1';
  name: string;
  global_start_time?: OtioRationalTime;
  tracks: OtioStack;
  metadata: {
    loofiProject?: {
      id: string;
      name: string;
      version: string;
      exportedAt: string;
    };
    [key: string]: unknown;
  };
}
