# Prompt Studio target reference

Verified against official documentation on **2026-10-29**. These are prompt preparation profiles,
not claims of physical-platform qualification or successful generation with the user's account.
Destination account, region and plan availability can differ. No new video API integration is added.

| Target         | Profile and prompting behavior                                                                                                                                                                         | Official source                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flow           | Veo 3.1 Lite/Fast/Quality; concrete scene/action, optional camera/light/audio. Ingredients and extension require 8 seconds; extension uses Lite. Quality does not support ingredients or extension.    | [Flow support](https://support.google.com/flow/answer/16352836?hl=en)                                                                                                                                     |
| Gemini Omni    | `gemini-omni-1.1-flash`; natural video direction, 3–10 seconds, frame/reference continuity and relevant native audio. Manual handoff in this application.                                              | [Model card](https://ai.google.dev/gemini-api/docs/models/gemini-omni-flash), [guide](https://ai.google.dev/gemini-api/docs/omni)                                                                         |
| Kling          | Kling 4.0; concrete subjects/actions, reference roles and native audio; no invented bracket camera tags.                                                                                               | [User guide](https://kling.ai/quickstart/kling-4-model-user-guide)                                                                                                                                        |
| Runway         | Gen-4.5; positive visual descriptions and motion-first image animation. Native audio is not assumed; negative fields are omitted.                                                                      | [Gen-4.5](https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5), [prompting guidance](https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide) |
| Luma           | Ray3.2; clear scene/motion/camera direction, 5/10 seconds with frame-anchor constraints. Separate negative/audio parameters are not verified.                                                          | [Generation API](https://docs.agents.lumalabs.ai/guides/videos/generation/)                                                                                                                               |
| Wan            | Wan 3.0 hosted profile, documented 30-second generation and multimodal direction. Wan 2.1 open-weight workflows remain distinct legacy profiles; no claim of a local renderer integration.             | [Official Wan 3.0 repository](https://github.com/AlibabaCloud-Official/Wan3.0), [Wan 2.1](https://github.com/Wan-Video/Wan2.1)                                                                            |
| MiniMax/Hailuo | MiniMax-H3; natural scene/reference/action direction with native audio. No verified negative-prompt parameter.                                                                                         | [API contract](https://platform.minimax.io/docs/api-reference/video-generation-v2-create)                                                                                                                 |
| Suno           | v6/v6-wild require Pro/Premier; v6-mini is available to all users. Separate style/lyrics and instrumental control; manual copy/open handoff. Existing profile selections and lyric locks are retained. | [Current models](https://help.suno.com/en/articles/13924737), [Custom Mode](https://help.suno.com/en/articles/3726721)                                                                                    |

## Availability and old projects

Sora web/app ended on 2026-04-26 and its API on 2026-09-24; it is excluded from new target selection
and Arena. Existing artifact text remains available for reading/copy/export, and creating a new pack
requires choosing another target. [Official discontinuation notice](https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation).

Veo 3.1 Preview bindings in Gemini API ended on 2026-10-22. The catalog and privileged submission
boundary reject new requests to these bindings. This does not retire Flow or Vertex GA bindings;
already accepted provider operations retain their existing recovery path. Omni's older preview is
also shut down; the active Omni 1.1 binding is separate. [Veo notice](https://ai.google.dev/gemini-api/docs/veo),
[Omni model card](https://ai.google.dev/gemini-api/docs/models/gemini-omni-flash).

Gemini 3.8 Flash and 4 Argon remain valid text-generation models. Model choices come from the
application's canonical catalog rather than another hardcoded model list. Account access is checked
through the existing provider boundary, not inferred from documentation alone. [Google model list](https://ai.google.dev/gemini-api/docs/models.md).

## Contracts and validation

Target IDs are retained for reading persisted data. Optional `profileId` selects concrete model
capabilities, while optional creative details reuse the original `PromptState` fields. New projects
default to Flow Lite, automatic style, English prompt output and Gemini 3.8 Flash. Saved models,
styles and dialogue languages are preserved. AI recommendations are guidance, not automatic setting
changes. Model-dependent settings selected by the user are never silently overwritten.

AI response schemas and local runtime validation protect the same scene contract. A normal creation
uses one structured request for details and three variants. Manual values remain exact; locked
lyrics retain their original blocks. Input/output are persisted together after a durable checkpoint.
Tests mock providers and do not incur external generation costs. Successful automated tests do not
establish live-provider creative quality or physical KDE/Wayland qualification.
