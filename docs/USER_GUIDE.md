# Loofi Creator Studio user guide

v11 starts in **Prompt Studio**. Use it when the deliverable is a prompt or lyrics pack. Open
**Production** when you want to turn a local handoff into an in-app media run.

## Create a video prompt

1. Open `/` or `/studio` and select **Video**.
2. Write the idea in the large idea field. Keep the first pass to one scene and one clear action.
3. Choose the target platform, prompt mode, aspect ratio, and duration.
4. Expand only the controls you need: references, style, camera, environment, action, audio, or
   dialogue.
5. Select **Optimize prompt**. The deterministic local compiler creates a draft before any optional
   Gemini or Ollama optimization.
6. Copy the recommended prompt, negative prompt, or settings checklist. Expand **Cinematic** or
   **Control-focused** when you want an alternative.

Video prompts are written in English for model compatibility. The five prompt modes are:

- **Text-to-video** — subject, action, environment, camera, light/style, and separate audio.
- **Image-to-video** — motion-only camera, subject, and environment movement.
- **First/last frames** — the desired action and the transition between the two frames.
- **Ingredients/references** — an explicit role for every attached reference.
- **Extend** — the next motion and continuity from the previous clip.

## Create a Suno lyrics pack

1. Open `/studio?mode=music` or choose **Music & Lyrics** in Prompt Studio.
2. Select the lyrics language and instrumental or vocal mode.
3. Add the theme, audience, mood, story, hook, and any production constraints.
4. Select **Generate lyrics pack**. Each variant includes Title, English Style of Music, complete
   section-tagged Lyrics, and production notes.
5. Use **Copy Style**, **Copy Lyrics**, **Copy All**, or **Copy & Open Suno** for a manual Custom Mode
   handoff.

The app never sends text to Suno automatically and does not use unofficial Suno authentication or
private APIs. Voice, Custom Model, and My Taste fields are manual notes only. Avoid real artist names,
voice imitation, and copyrighted lyrics unless you have the necessary rights.

### Edit lyrics locally

Select a section and use **Rewrite section**, **Improve hook**, **Extend**, **Shorten**, or
**Regenerate**. Lock sections that must remain unchanged; locked content is preserved during the
other operations. Copy fields and history always use the same byte-identical text.

## Hand off to Production

**Generate in app** is deliberately secondary. It creates a local draft and opens `/create` for video
or creates a local Lyria draft for music. No provider request or cost is triggered by the handoff.

The Production workflow is:

1. **Brief:** define the outcome and create a free local plan.
2. **Scenes:** review shot intent, camera, duration, and continuity.
3. **Assets:** bind local references and Production Bible profiles.
4. **Generate:** inspect provider, model, maximum charge, and approval details.
5. **Review:** compare takes and record structured findings.
6. **Export:** create Creative Pack, project, and provenance outputs.

Paid provider actions remain blocked until an explicit approval is stored. Ambiguous submissions are
not replayed automatically.

## Projects, migration, and backups

v11 writes `.loofi-project` schema 11 and Creative Pack schema 4. v10 archives migrate directly to
v11; v5–v9 archives pass through the existing schema-10 compatibility step first. Unknown fields,
media, runs, Production Bible data, and migration history are preserved. Prompt artifacts are stored
alongside the Production Bible.

Project backups stay under the selected local project root and use bounded retention. Generated media
uses atomic writes and SHA-256 metadata. Do not delete project media outside the app.

## Settings, providers, and cost

Gemini/Vertex credentials are configured in **Settings** and stored in the operating-system vault.
Ollama is available as a local optimizer. A connection check does not spend provider credits.

Before any paid generation, verify the selected model, lifecycle, capability reason, price source,
verification date, calculation, maximum charge, and exact continuity snapshot. Unknown pricing blocks
execution.

## Offline and accessibility behavior

Prompt Studio, project editing, history, planning, and exports work offline. Provider actions report a
clear network/configuration error and keep recoverable local state.

The primary UI is translated into English, Spanish, French, Japanese, and Arabic. RTL layout,
keyboard focus, semantic headings, live status, reduced motion, and light/dark themes are covered by
the application test suite. Physical desktop and real account qualification must still be recorded
separately when performed.
