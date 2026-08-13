# Video Prompt Studio

Prompt Studio is the copy-first Flow/Veo workflow. It is available at `/` and `/studio`; `/create`
remains the advanced media-production workflow.

## Supported recipes

- Text-to-video with subject, action, environment, camera, light/style, and separate audio.
- Motion-only image-to-video.
- First/last frame transitions.
- Ingredients/references with explicit roles.
- Extend prompts with next motion and continuity.

Each compile returns one recommended prompt and exactly two complete alternatives: **Cinematic** and
**Control-focused**. Copy prompt, negative prompt, and settings checklist separately. Video text is
written in English for model compatibility.

Legacy `/director`, `/composer`, and `/optimize` deep links redirect to `/create` without changing
stored project identities.
