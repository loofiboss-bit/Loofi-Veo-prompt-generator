# Timeline & Storyboard Skills

## Multi-Track Timeline

- **Video tracks** — Multiple video layers with overlap and compositing
- **Audio tracks** — Separate audio layers with mixing
- **Track management** — Add, remove, reorder, lock, mute tracks
- **Zoom/scroll** — Timeline zoom levels and horizontal scrolling

**Features:** `src/features/timeline/`
**Store:** `useAppStore` (timelineSlice)

## Clip Management

- **Clip creation** — Create clips from prompts with duration and parameters
- **Clip trimming** — Adjust in/out points on timeline
- **Clip splitting** — Split clips at playhead position
- **Clip linking** — Link video and audio clips together

**Features:** `src/features/timeline/TimelineClip.tsx`

## Storyboard View

- **Shot cards** — Visual card-based scene planning
- **Drag-and-drop** — Reorder shots by dragging cards
- **Shot descriptions** — Per-shot notes and prompt assignments
- **Thumbnail preview** — Visual thumbnails for each shot

**Features:** `src/features/timeline/StoryBoard.tsx`, `ShotCard.tsx`

## Transitions

- **Built-in transitions** — Cut, fade, dissolve, wipe, slide
- **Transition duration** — Configurable overlap duration
- **Transition analysis** — AI-suggested transitions between clips
- **Custom transitions** — Plugin-extensible transition system

**Services:** `transitionAnalyst.ts`

## Timeline Player

- **Real-time preview** — Playback with scrubbing
- **Frame-accurate seeking** — Jump to exact frame positions
- **Loop playback** — Loop selection or entire timeline
- **Playback speed** — Variable speed playback (0.25x to 4x)

**Features:** `src/features/timeline/TimelinePlayer.tsx`

## Montage Builder

- **Auto-montage** — AI-assembled montage from multiple clips
- **Beat-sync** — Sync cuts to audio beats
- **Pacing control** — Adjust cut frequency and rhythm

**Services:** `montageService.ts`

## Scene Export

- **Per-scene export** — Export individual scenes or selections
- **Scene markers** — Mark scene boundaries on timeline
- **Scene metadata** — Attach metadata to scenes for organization

**Services:** `sceneExportService.ts`

## Composition

- **Layer compositing** — Blend modes and opacity per track
- **Picture-in-picture** — Position and scale overlay clips
- **Title cards** — Text overlays with style and animation

**Features:** `src/features/composer/`
**Services:** `composerService.ts`
**Store:** `useComposerStore`

## Asset Management

- **Asset library** — Organized collection of imported media
- **Asset tagging** — Tag and search media assets
- **Asset preview** — Quick preview without importing to timeline

**Store:** `useAppStore` (assetSlice)

## Keyframing

- **Property animation** — Animate position, scale, opacity over time
- **Bezier curves** — Custom easing curves for smooth motion
- **Keyframe interpolation** — Linear, ease-in, ease-out, ease-in-out
