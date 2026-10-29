# Loofi Creator Studio v21.1.0

v21.1.0 adds deep Gemini AI optimization and prompt enhancement to Prompt Studio, introduces Gemini Omni 1.1 Flash as an active modern target, modernizes all video target profiles, and improves review and handoff workflows.

## Highlights

- **Gemini AI Scene & Music Expansion:** Transform simple core ideas into production-ready cinematic prompts (subject, action/motion, environment, camera & optics, lighting, visual style, audio & foley, dialogue, negative prompt) or structured Suno lyrics and music profiles ([Intro], [Verse], [Chorus], [Bridge], [Outro]).
- **Studio AI Control Bar:** Select between Gemini 3.8 Flash and Gemini 4 Argon, apply cinematic style presets (Cinematic Realism, Documentary, Commercial, Stylized / Anime, Sci-Fi / Dark), and choose prompt language (English or Swedish).
- **DeepMind 5-Pillar Cinematic Architecture:** Generate 3 distinct video variants (Primary, Cinematic texture, Control-focused) with multi-aspect visual direction.
- **Gemini Omni 1.1 Flash Target Engine:** Support for Google's newest Gemini Interactions API target with automatic single-shot continuity directives, synchronized ambient audio/foley, and up to 4K SynthID output.
- **Modernized Video Target Profiles:** Exact model versioning and guidance for Google Flow / Veo 3.1, Google Veo 3.1 API, Kling 1.5 / 2.0, Runway Gen-3 / Gen-4, OpenAI Sora, Luma Dream Machine Ray-2, Wan 2.1, and Minimax / Hailuo Video 01.
- **Prompt Review & Stale Brief Handoff:** Clear indications when results no longer match the current brief, requiring an explicit choice before using or copying previous results, with proposal reviews before applying AI expansions.
- **IPC Cost Approval Fix:** Microdollar floating-point tolerance eliminates false cost rejection warnings between frontend and backend.

## Upgrade notes

Existing projects, formats and settings remain fully supported. AI expansion and generation remain optional and user-controlled.

Download the [GitHub release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v21.1.0)
and verify packages against `SHA256SUMS.txt`. Fedora 44 x86_64 users can also use
[COPR](https://copr.fedorainfracloud.org/coprs/loofitheboss/loofi-creator-studio/).

Automated checks, packaged smoke tests and public publication are verified separately. See the [release runbook](../RELEASE.md) for publication and qualification boundaries.
