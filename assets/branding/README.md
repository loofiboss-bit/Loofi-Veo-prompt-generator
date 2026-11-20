# Repository branding

| Asset               | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `github-banner.png` | Dark-theme README and wiki hero; 2172 × 724 PNG.                      |
| `logo.png`          | Blue/cyan dark-theme variant of the existing film-frame app identity. |

Local assets use descriptive alternative text.

## Palette shared with the app

Artwork and badges match **Dark / Default (Blue)** in the application.
Source: `src/shared/styles/tokens.css`, `theme-presets.css` and `themeService.ts`.

| Role           | Color                 |
| -------------- | --------------------- |
| Background     | `#020617` / `#0f172a` |
| Surface        | `#1e293b`             |
| Primary blue   | `#2563eb` / `#3b82f6` |
| Cyan highlight | `#22d3ee`             |
| Local badge    | `#10b981`             |
| Text           | `#f1f5f9` / `#cbd5e1` |

GitHub artwork is static and follows this preset. Update these assets together when changing the
app palette. Individual app theme selections do not change GitHub images.
Application and packaged icons retain their existing files.

## Image generation

Updated for v23.0 with the `image-generator` subagent, cropped vertically and composited to crisp `2172 × 724` 3:1 widescreen dimensions for GitHub README hero rendering. Final prompts:

### Banner (`github-banner.png`, `2172 × 724`)

- Tagline & copy:
  - Pill badge: `LOCAL-FIRST DESKTOP WORKSTATION` (with `#10b981` dot)
  - Headline: `Loofi Creator Studio`
  - Subtitle: `Direct, iterate, edit & ship video — locally.`
  - Metadata strip: `PROMPT STUDIO · AI VIDEO ITERATION · NLE TIMELINE · OFFLINE MP4`
- Visual: Matte obsidian-navy backdrop (`#020617` / `#0f172a`) with a frosted-glass workstation preview frame featuring cinema film-strip cards, glowing cobalt/cyan play icon, multi-track NLE clip bars, and an audio waveform curve.

### Logo (`logo.png`)

> Edit the supplied Loofi Creator Studio logo only to match the actual application's dark navy and blue/cyan UI palette. Preserve the exact film-frame, play-triangle, waveform, equalizer shapes, composition and square proportions. Use dark navy #0f172a/#020617 background, blue #2563eb/#3b82f6 main mark, restrained cyan #22d3ee edge highlights and subtle glow. Replace all purple/magenta/pink/orange with blue and cyan. Professional cohesive desktop studio icon, no text, no new elements.

## GitHub badges

Release, license, stars, forks and download badges use Shields.io with navy labels and blue accents.
The validation badge links to `validate.yml` and retains its semantic status colors.
Counters use public repository data; no application telemetry is added.

[Release-asset downloads](https://shields.io/badges/git-hub-downloads-all-assets-all-releases)
include checksums and metadata. This is not a unique-user counter.
External badges can be cached or unavailable; linked GitHub pages remain the source of truth.
