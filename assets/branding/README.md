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
| Background     | `#0f172a` / `#020617` |
| Surface        | `#1e293b`             |
| Primary blue   | `#2563eb` / `#3b82f6` |
| Cyan highlight | `#22d3ee`             |
| Text           | `#f1f5f9` / `#cbd5e1` |

GitHub artwork is static and follows this preset. Update these assets together when changing the
app palette. Individual app theme selections do not change GitHub images.
Application and packaged icons retain their existing files.

## Image generation

Edited with the built-in imagegen tool from the original banner and logo. Final prompts:

### Banner

> Edit the supplied GitHub banner only to harmonize its colors with Loofi Creator Studio's actual dark UI. Preserve the exact layout, size, film frames, waveform, and all typography/text verbatim. Palette: dominant matte dark navy #0f172a and #020617; surfaces #1e293b; primary blue #2563eb and #3b82f6; restrained cyan #22d3ee highlights; text #f1f5f9 and #cbd5e1. Replace all purple, magenta, pink, orange and warm sunset colors with restrained blue/slate/cyan tones, including frame imagery and waveform. Dark, cohesive professional desktop studio branding, readable white text, subtle glow rather than saturated multicolor neon. No new elements, no text changes.

### Logo

> Edit the supplied Loofi Creator Studio logo only to match the actual application's dark navy and blue/cyan UI palette. Preserve the exact film-frame, play-triangle, waveform, equalizer shapes, composition and square proportions. Use dark navy #0f172a/#020617 background, blue #2563eb/#3b82f6 main mark, restrained cyan #22d3ee edge highlights and subtle glow. Replace all purple/magenta/pink/orange with blue and cyan. Professional cohesive desktop studio icon, no text, no new elements.

## GitHub badges

Release, license, stars, forks and download badges use Shields.io with navy labels and blue accents.
The validation badge links to `validate.yml` and retains its semantic status colors.
Counters use public repository data; no application telemetry is added.

[Release-asset downloads](https://shields.io/badges/git-hub-downloads-all-assets-all-releases)
include checksums and metadata. This is not a unique-user counter.
External badges can be cached or unavailable; linked GitHub pages remain the source of truth.
