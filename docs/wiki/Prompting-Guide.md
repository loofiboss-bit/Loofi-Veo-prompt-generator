# Prompting Guide

Prompt Studio compiles a focused draft locally and can optionally ask Gemini or Ollama to optimize
the structured artifact. The final text remains explicit and copyable.

## Flow/Veo

Use one scene per clip and write in this order when it applies:

1. subject and visible action;
2. environment and time of day;
3. camera framing, movement, and lens language;
4. lighting, color, and visual style;
5. dialogue with a colon after the speaker;
6. separate audio, ambience, and duration/aspect settings.

The five recipes have different contracts:

- **Text-to-video:** describe the subject, action, environment, camera, style, and separate audio.
- **Image-to-video:** describe only camera, subject, and environment movement; do not invent a new
  scene or restate a still image as action.
- **First/last frames:** describe the desired transition and the action connecting the frames.
- **Ingredients/references:** give every reference a role such as subject, wardrobe, location, or
  style anchor.
- **Extend:** describe the next motion and how it continues from the previous clip.

Video results are written in English for model compatibility. Negative prompts should name unwanted
visual outcomes, not contradict the positive action.

## Suno

Keep **Style of Music** separate from lyrics. Use concise English style terms for genre, tempo,
instrumentation, vocal character, energy, and production. Lyrics follow the selected language and use
clear section tags such as `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, and `[Bridge]`.

Do not request real artist imitation, voice cloning, or copyrighted lyrics. Confirm rights and consent
for any Voice, Custom Model, or My Taste note before using the handoff.
