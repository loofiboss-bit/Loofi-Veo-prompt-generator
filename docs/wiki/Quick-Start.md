# Quick Start

The unpublished v16 source adds a local path from your own clips to verified video delivery.
Published downloads remain on v15 until a release is approved.

## Finish a local video in v16

1. Open **Start → Create from your own clips** and select video, images or audio.
2. Trim, split and arrange the timeline. Add captions or import SRT using **Add** or **Replace**.
3. Choose **Check delivery** and resolve the reported blockers.
4. In the desktop app, choose **Review delivery** for a real 720p render. Any edit makes that review stale.
5. Export and save a verified H.264/AAC MP4 or publication ZIP, up to three minutes.
6. Wait for **Saved** before closing. On a conflict, choose **Load latest** or **Save as copy**.

No account or API key is required for this local flow. **Projects** includes search, rename,
duplicate, archive and desktop backup recovery. See [the editing contracts](../CREATOR_V16.md).

## Build a copy-ready prompt pack

Build your first copy-ready pack in Prompt Studio. Local compilation needs no API key or
network connection. Install from the [available releases](Installation-and-Updates.md), or follow
the [repository development instructions](../../README.md).

## 1. Start a video draft

1. On first launch, choose **Video**, an interface language and **Start creating**.
2. Open **Prompt Studio → Video** (`/` or `/studio`).
3. Enter a focused idea, for example:

   > A courier cycles through a rainy city at twilight. The camera tracks alongside at street
   > level, with warm shop lights reflected on the road.

4. Choose a target, recipe, duration and aspect ratio. Expand **Scene details** for camera,
   lighting and other direction.
5. Select **Build copy-ready pack**.
6. Select one of the three variants: **Recommended Primary**, **Cinematic** or **Control-focused**.
   Edit its text if needed and inspect **Readiness checks**.
7. Copy the selected package and paste it into the destination generator. Confirm the actual
   model version and supported settings there.

Use **Compare in Arena** to inspect all eight video targets before choosing a package. This compares
local prompt compilation; it does not run or bill the generators.

## 2. Build a lyrics pack

1. Switch to **Music & Lyrics** (`/studio?mode=music`).
2. Choose lyrics language, genre and story. Choose vocal or instrumental direction as appropriate.
3. Select **Build copy-ready pack**, then edit the selected variant's lyrics and style.
4. Use **Copy Style**, **Copy Lyrics**, **Copy All** or **Copy & Open Suno** for manual Custom Mode
   handoff. No automatic Suno upload is performed.
5. To request **Rewrite section**, configure Gemini or Ollama in Settings, select a section and
   describe the change. Review the proposal before choosing **Accept changes**.

Lyrics language and interface language are separate settings. See [Suno Handoff](Suno-Handoff.md).

## 3. Keep a useful version

Wait for the project status to show **Saved**. Draft inputs, editable variants, selections and
lyric locks persist after a short debounce. **Not saved** means you should keep the window open
and retry saving.

Open **Versions and comparison → Save version** to keep a checkpoint. Use the
**Studio template library** to save reusable video or music inputs across projects. Select media
again when applying a template in another project.

See [Prompt Quality and Iteration](Prompt-Quality-and-Iteration.md) for comparison, restore and
reviewed AI enhancement.

## 4. Generate only when ready

**Veo API** supports an internal production handoff. **Generate in app** prepares a local plan;
it does not submit a paid request. In **Production**, review the request and sourced maximum
charge, then approve generation. Other video targets use manual handoffs.

ComfyUI rendering, Live audio, LAN collaboration and Foley generation remain disabled Labs
integrations. For the supported path, see [Production Workflow](Production-Workflow.md).
