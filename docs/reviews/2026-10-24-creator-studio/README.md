# Loofi Creator Studio — product and end-user review

Review date: 2026-10-24 (Europe/Stockholm). Reviewed source: `19.0.0`, branch `main`, commit `0e93b1243c3db9708b703c5e42f576d65af0de87`.

Repository: [loofiboss-bit/Loofi-Veo-prompt-generator](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator). Source links below are pinned to the reviewed commit.

**Status:** documentation-only review snapshot. The findings and proposed improvements are not implemented by this document.

This is a source and browser review, not an installed-release certification or a study with recruited users. The repository was clean at the start. No product source, user projects, credentials, remote services or paid generation were changed. Browser exploration used a separate review profile and fictional material. This archive contains the report, summarized verification results and selected captures; raw execution logs remain local to the original review.

## Overall assessment

Creator Studio has useful foundations: local creation without a key, editable outputs, explicit acceptance of AI proposals, portable project support, and unusually careful approval boundaries for paid jobs. These should remain central to the product.

The next investment should make existing workflows dependable and connected. Users currently have to understand Start, Prompt Studio, Production, Timeline, external generator handoffs and two different media-library contexts before they can predict what will happen. Some apparently limited actions also change more state than their labels suggest.

The most serious example is accepting a Production take: it can rebuild timeline tracks and discard existing editing. Other confirmed defects affect linked captions, voiceover session state, image-to-video instructions and repeated locked lyric sections. These are more important than adding models, modes or creative tools.

Recommended product promise: **Bring an idea or your own clips, refine your work, and leave with a usable result while retaining control of edits, privacy and cost.** The app should guide the next action from the current project state.

## Evidence and priorities

- **P1:** protect existing work or correct a broken central workflow before expanding features.
- **P2:** correct misleading behavior, incomplete recovery or a significant usability obstacle.
- **Confirmed:** established from an executable local reproduction or a complete current source path. These labels do not imply physical microphone, native GPU or real-provider qualification.
- **Recommendation:** a design or product judgment, with a concrete proposed outcome.
- **Intermittent:** observed in a test run but not reproduced consistently or assigned a proven root cause.

## Confirmed P1 findings

### F1. Accepting a take can erase timeline edits and imported clips

**User trigger:** edit the timeline, then keep a Production take.

`handleAccept` calls `syncTimelineFromShots`, which removes all `video_main` and `audio_dialogue` clips and rebuilds storyboard clips using original durations, zero offsets, sequential positions and volume 1. Imported media can occupy the same main video track.

**Reproduction:** using the real timeline slice, a generated clip at timeline 3 seconds with duration 2, source offset 4 and volume 0.25, plus an imported clip, became a single generated clip at 0 seconds with duration 8, offset 0 and volume 1. The imported clip disappeared.

**User impact:** an action that reads as choosing a result can undo unrelated editing. Undo does not make an unexpected destructive side effect acceptable.

**Correction:** accepting a take selects the result. A distinct, explicit placement action inserts or replaces only the intended clip, preserving its edit decisions and associated captions. Full timeline rebuilding needs a separately named action and a recoverable checkpoint.

**Sources:** [src/features/create/hooks/useCreateWorkflow.ts:529,584](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/create/hooks/useCreateWorkflow.ts#L529); [src/core/store/slices/timelineSlice.ts:138–165,202–207](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/store/slices/timelineSlice.ts#L138-L165); [src/features/timeline/components/TimelineSurface.tsx:185](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/timeline/components/TimelineSurface.tsx#L185).

**Acceptance case:** accept a second take after trimming, moving and lowering the volume of an existing clip and adding unrelated media. Only the intended result changes; unrelated clips and linked captions remain unchanged after reopening.

### F2. Removing pauses breaks linked caption timing and identity

**User trigger:** apply silence cuts to a clip with linked captions.

The silence service splits the target into new clip IDs but leaves captions inside its original time span at their old times and source references. It also shifts later text clips without limiting that ripple to captions associated with the affected material.

**Reproduction:** remove seconds 2–4 from a 10-second interview. A linked caption at 7–9 seconds remains at 7–9 although the edited video ends at 8. The expected placement is 5–7 seconds, linked to the surviving segment.

**User impact:** incorrect subtitles, unrelated text movement and potentially blocked delivery because captions exceed the new duration.

**Correction:** share caption-aware split/ripple primitives with other timeline editing operations. Rebind surviving caption segments, define a track ripple policy and retain a single undo transaction.

**Source:** [src/core/services/creatorSilenceService.ts:118–150](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/creatorSilenceService.ts#L118-L150).

### F3. Starting voiceover during playback repeatedly resets the recorder

**User trigger:** play the timeline and open Record voiceover.

The editor leaves transport running. The recorder initialization effect depends on `currentTime` and clears recording state, blob, URL and elapsed time on each playhead update. The transport updates approximately every 100 ms.

**User impact:** an unstable recording session and a recorded take that can disappear from the modal. This is confirmed by the source interaction; a physical microphone session was not performed.

**Correction:** pause transport before opening, capture a fixed insertion time, and initialize state once per recording session. Separate insertion-position updates from recorder lifetime.

**Sources:** [src/features/timeline/LocalTimelineEditor.tsx:42–60,184–189](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/timeline/LocalTimelineEditor.tsx#L42-L60); [src/features/timeline/components/VoiceoverRecorderModal.tsx:70–81](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/timeline/components/VoiceoverRecorderModal.tsx#L70-L81).

### F4. Image-to-video ignores the main idea field

**User trigger:** enter an action in Core idea, select image-to-video and provide the image.

Both prompt-building paths construct motion from optional action/camera/environment/audio fields instead of the visible main idea.

**Reproduction:** “The red bird flaps its wings and flies out through the window” produces generic subtle animation for Flow/Veo, or only default camera motion for Kling. The requested action is absent. No provider request was needed to reproduce this.

**Correction:** make the main field mode-aware, label it as the requested motion/change when an image is supplied, and carry its intent through every target compiler. Do not simply restate every image-description field as motion.

**Sources:** [src/core/services/promptStudioService.ts:258–277](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/promptStudioService.ts#L258-L277); [src/core/services/modelTranspilerService.ts:294–313](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/modelTranspilerService.ts#L294-L313); [src/features/studio/PromptStudioPage.tsx:1008–1020](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/studio/PromptStudioPage.tsx#L1008-L1020).

### F5. Repeated lyric tags are treated as one section identity

**User trigger:** optimize or rewrite a song containing multiple distinct `[Chorus]` sections, including locked ones.

Matching uses the first section with a given tag rather than the selected occurrence. Local reproduction with two distinct locked choruses returned the first chorus twice and appended the second original chorus as a third block. Section replacement can also affect every occurrence of the selected tag.

**User impact:** locked text and song order do not behave as promised; “rewrite this section” can alter a different scope.

**Correction:** give sections stable identities or occurrence indices, show “Chorus 1 / Chorus 2”, and preserve each locked occurrence at its original position.

**Source:** [src/core/services/promptStudioEditingService.ts:59–87](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/promptStudioEditingService.ts#L59-L87).

## Confirmed P2 findings

### F6. Clean & Compact removes words from spoken dialogue

The cleanup regular expression operates on the entire prompt. A local reproduction changed `We build games in Unreal Engine 5` into `We build games in`. Acceptance is still required, which reduces the risk, but a cleanup tool should not silently propose a different spoken line.

**Correction:** protect dialogue and quoted spans; apply descriptive cleanup only to the intended blocks. Add a regression asserting byte-identical dialogue.

**Source:** [src/core/services/videoVariantEditService.ts:198–209](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/videoVariantEditService.ts#L198-L209).

### F7. Local caption generation promises more than the connected workflow provides

“Generate local captions (offline)” calls a service without a transcript script. The service detects timing intervals and fills text with `[Dialogue N]`. The review step exposes the placeholders, so this is a misleading capability promise rather than hidden transcription.

The source selector also accepts only standalone audio assets already on audio clips. A typical talking-head phone video cannot be selected for its embedded speech. Multiple timeline uses of the same audio asset resolve to the first matching use rather than the selected occurrence.

**Correction:** choose a specific timeline video/audio clip, use its actual trim, and provide real transcription or explicit script/manual text input. Until transcription exists, name the action “Create caption timing blocks” and explain what remains to be written.

**Sources:** [src/features/delivery/CreatorDeliveryPanel.tsx:421,1043–1053,1094–1111](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/delivery/CreatorDeliveryPanel.tsx#L421); [src/core/services/creatorCaptionService.ts:210–220](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/creatorCaptionService.ts#L210-L220).

### F8. Batch export cannot be cancelled and exceptions can leave it blocked

The batch loop holds the `act()` busy guard throughout polling. Cancel export calls the same guard and returns immediately. Batch progress is cleared only at the successful end; a failed start or poll skips that cleanup and can keep export disabled until remount.

**Correction:** cancellation must bypass the start-action lock, stop the current job and prevent later formats from starting. Clean batch state in `finally`, retain completed outputs and expose Retry for failed items.

**Sources:** [src/features/delivery/CreatorDeliveryPanel.tsx:208–225,308–367,1341–1364](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/delivery/CreatorDeliveryPanel.tsx#L208-L225).

### F9. Requested Gemini review is skipped for normal desktop media

The review path reads media only from IndexedDB. Native generation records `desktop:<path>` and a `loofi-media` URL instead. With no video bytes, the review service bypasses Gemini and returns local review. The resulting source is shown as local, but the reason the user's AI choice could not run is not explained.

**Correction:** use a shared supported media resolver for desktop and IndexedDB content. An unreadable video should produce an actionable “AI review could not run” state, followed by an explicit option for manual review.

**Sources:** [src/features/create/hooks/useCreateWorkflow.ts:482–498](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/create/hooks/useCreateWorkflow.ts#L482-L498); [src/core/services/mediaAssetService.ts:148](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/mediaAssetService.ts#L148); [src/core/services/videoGenerationService.ts:271–294](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/videoGenerationService.ts#L271-L294); [src/core/services/productionReviewService.ts:60–81](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/productionReviewService.ts#L60-L81).

### F10. The cost display does not represent a dependable spending ledger

The UI store takes an initial service snapshot and exposes a refresh action, but no production caller of refresh or service hydration was found. The badge can remain hidden at zero after jobs complete. Completed paid jobs also record the approved maximum as `isEstimated: false`, without retrieving the provider's actual billed amount. Deduplication is only an in-memory set.

**Correction:** distinguish approved maximum, estimated consumption and verified actual charge. Subscribe the display to durable records, restore them on startup and deduplicate by persisted job identity. Do not label an approval ceiling as an actual invoice amount.

**Sources:** [src/core/store/useCostStore.ts:32–49](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/store/useCostStore.ts#L32-L49); [src/core/services/paidJobService.ts:4–22](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/paidJobService.ts#L4-L22); [src/shared/components/resilience/CostBadge.tsx:28](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/shared/components/resilience/CostBadge.tsx#L28).

### F11. Prompt handoff controls and history conceal useful distinctions

- Music's main “Copy prompt” copies only style; lyrics are in the secondary menu. Show explicit **Copy music style** and **Copy lyrics** actions together. Source: [src/features/studio/components/MusicVariantCard.tsx:118–132](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/studio/components/MusicVariantCard.tsx#L118-L132).
- Video history displays the primary title, normally “Recommended handoff”, for different packs. Show an idea excerpt, target, time and edited status. Sources: [src/features/studio/PromptStudioPage.tsx:1367–1370](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/studio/PromptStudioPage.tsx#L1367-L1370); [src/core/services/promptStudioService.ts:352–356](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/promptStudioService.ts#L352-L356).
- The universal `~N / 280 tokens` indicator looks like a model constraint although it is a generic estimate. Label it as writing guidance or show a verified concrete model limit. Source: [src/features/studio/components/VideoVariantCard.tsx:37–41](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/studio/components/VideoVariantCard.tsx#L37-L41).

## User experience recommendations

These recommendations are separate from confirmed defects.

### Start and first success

The existing offline examples and own-clips entry are valuable. Make the first choice goal-based: **Edit my clips**, **Prepare/generate video**, or **Write music/lyrics**. “Use my own idea or media” currently routes to Prompt Studio even when the user intends to import media. Start then presents examples, twelve recipes, recent projects and a style editor on one long page.

Show recent work near the first action, keep recipes behind “Start from a template” and move detailed style management into project/style settings. Prefer one visually primary action per current task. No new navigation system is required to achieve this.

Sources: [src/features/onboarding/WelcomeModal.tsx:20–30](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/onboarding/WelcomeModal.tsx#L20-L30); [src/features/creator/StartPage.tsx:60–196,200–310](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/creator/StartPage.tsx#L60-L196).

### Editing and playback

Make the ordinary editor capable of hearing the actual timeline. `LocalTimelineEditor` plays only the active visual source; independent music and voiceover tracks are not mixed in transport playback. This is disclosed, but requiring a rendered delivery review after each audio adjustment is a major productivity obstacle.

The player should honor active audio tracks, trims, mute, volume and fades, and show captions. If some effects need a rendered preview, explain exactly which ones and make that preview cheap to obtain. Keep the source player available as an explicit alternative.

Source: [src/features/timeline/LocalTimelineEditor.tsx:32–76,123–131](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/timeline/LocalTimelineEditor.tsx#L32-L76).

### One project, a visible next action

The user should not have to infer the connection between a prompt pack, a generated take, a timeline and a finished delivery. Show a compact project progress summary driven by existing state, with one next action and a reason when it is unavailable.

Suggested path: **Add media or create a prompt → choose results → edit → check → review → export/save**. Keep external handoff and paid request approval distinct and explicit.

Opening a project should offer or perform “Continue editing” in the appropriate workspace. Start's recent-project action already chooses Timeline or Studio, whereas Projects changes the document without moving into its editor. Reuse the existing decision consistently.

Sources: [src/features/hubs/ProjectsPage.tsx:80–105](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/hubs/ProjectsPage.tsx#L80-L105); [src/features/creator/StartPage.tsx:210–225](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/creator/StartPage.tsx#L210-L225).

### Delivery

Show **Check → Review → Export → Save file** as the main progression. Keep crop, formats, loudness, caption style and publication metadata in optional sections. Make “Save project”, “Export editable project”, “Export MP4”, “Download SRT” and “Download OTIO” visibly different outcomes.

For a first-time creator, MP4 should be easier to find than OTIO. A disabled control should explain the prerequisite beside it and provide the appropriate action. Retain provenance when displaying older completed jobs.

Sources: [src/features/timeline/TimelinePage.tsx](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/timeline/TimelinePage.tsx); [src/features/delivery/CreatorDeliveryPanel.tsx:1325–1370](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/delivery/CreatorDeliveryPanel.tsx#L1325-L1370).

### Libraries, templates and alternatives

Keep one understandable media vocabulary across the Assets page and timeline media panel. The global Assets workflow is centered on images and continuity references, while imported video/audio is managed in the editor. A user looking for “my media” should not need to know that division.

Allow contextual filters for video, audio, images, references and generated results, and make usage visible before removal. Reuse existing storage and asset types; this recommendation does not require a new database abstraction.

Local music alternatives currently share the same lyrics and sometimes the same style. Label local suggestions as templates, and make alternatives meaningfully different or show a single draft. Never imply a quality comparison that has not occurred.

Sources: [src/features/hubs/AssetsPage.tsx:85–150,366–373](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/hubs/AssetsPage.tsx#L85-L150); [src/core/services/promptStudioService.ts:455–539](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/core/services/promptStudioService.ts#L455-L539).

### Language, status and visual hierarchy

Swedish is selectable and most principal paths are translated. However, the same Swedish session shows “Focus Mode”, “Recommended handoff”, “Cinematic”, “Control-focused”, “Record voiceover”, “Magnetic”, “Snap” and other English UI controls. Generated prompt language is a separate choice; interface labels should follow the selected UI language.

Consolidate or clearly scope project and Studio save indicators. The fresh profile briefly showed global “Unsaved” beside Studio “Saved”; this alone does not prove a persistence defect, but users should understand what each status covers.

The visual foundation is restrained and usable. The larger issue is hierarchy: repeated project context and save chrome, compatibility guidance, mode controls and variant controls compete with the result and its copy action. Keep blocking errors prominent; make persistent non-blocking advice quieter and expandable. At 1280×800 the build action fits, while the output's copy action can be below the first viewport.

Use the existing semantic design tokens consistently. For example, `creator.css` still contains a hardcoded video background and the sidebar repeats a hardcoded English focus label. Cosmetic token cleanup is lower priority than reliable editing.

Sources: [src/shared/components/layout/Sidebar.tsx:230–250](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/shared/components/layout/Sidebar.tsx#L230-L250); [src/features/project/ProjectSaveStatus.tsx:32–42](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/project/ProjectSaveStatus.tsx#L32-L42); [src/features/studio/PromptStudioPage.tsx:936–943](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/studio/PromptStudioPage.tsx#L936-L943); [src/features/creator/creator.css:52–57](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/src/features/creator/creator.css#L52-L57).

### Documentation and capability honesty

Align onboarding, README, screenshots and actual version. [package.json](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/package.json) says 19.0.0 while AGENTS and canonical AI instructions describe 17.0.0; README's “Install v19.0.0” links with the label “v16.0.1 GitHub Release”, and prominent walkthroughs/screenshots still describe older prompt-first versions.

Publish one current capability matrix: **available locally**, **requires desktop**, **requires external account/provider**, **experimental**, **unavailable**. Keep Labs disabled by default for incomplete integrations. Avoid public claims that local placeholder generation is speech recognition or that approval ceilings are actual charges.

Sources: [package.json:12](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/package.json#L12); [AGENTS.md:9](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/AGENTS.md#L9); [.ai/INSTRUCTIONS.md:41](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/.ai/INSTRUCTIONS.md#L41); [README.md:55–66,211–214](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/0e93b1243c3db9708b703c5e42f576d65af0de87/README.md#L55-L66).

## Strengths to preserve

- Prompt building works locally without a provider key, and manual copy is explicitly distinguished from in-app generation.
- AI changes are proposals requiring acceptance; stale responses are guarded and destructive replacements use checkpoints.
- Projects expose real save/conflict recovery, backup warnings and media integrity checks.
- Known paid operations can recover without another POST; ambiguous submission does not automatically trigger another charge.
- Exact request approval binds media and generation settings. The old missing-reapproval path for safe unsent legacy jobs is now fixed, including UI-to-native test coverage.
- Review notes, manual review confirmation, selecting a take and provenance are represented separately in the data model, even though timeline placement still needs correction.
- Arena explains that it compares prompt packages, not measured generated-video quality.
- Experimental capabilities stay behind Labs, and unsupported rendering paths are not presented as qualified production features.

## Suggested delivery order

### 1. Protect work and make core actions truthful

Fix F1–F5, dialogue preservation, batch cancellation and caption capability labels. Add regression scenarios that model the actual user action and assert unaffected work. Investigate intermittent import/reopen behavior before treating persistence as fully qualified.

Completion criteria: edits survive new take acceptance; linked captions survive cuts; voiceover state is stable; main instructions reach every compiler; repeated lyric locks retain identity; cancelled batches never start a later format.

### 2. Complete one common end-to-end workflow

Prioritize **import a phone video → hear it → trim → create/edit real captions → preview the mix → save MP4 → reopen and continue**. Support embedded video speech and meaningful timeline playback. Make the next action and disabled prerequisites clear.

Completion criteria: the path works without keys, requires no knowledge of OTIO or Production, and survives app restart with all media and decisions retained. Native rendering and microphone behavior need actual desktop qualification.

### 3. Connect the creative workspaces

Improve project continuation, contextual media browsing, explicit take placement and cost/review feedback. Show useful history identities and explicit music handoff buttons. Reduce Start-page choice density and finish interface localization.

Completion criteria: a user can explain where the current result is, whether it is saved, what the next action does, and whether it sends data or can cost money.

### 4. Validate with users before broadening scope

Run short task-based sessions with both a first-time creator and a returning editor. Observe task completion, wrong turns, editing lost/recovered, whether help is needed, and time to a usable saved result. Use the findings to select the next feature investment. These are proposed research measures, not claims about existing user outcomes.

## Verification and remaining boundaries

Final command results are recorded in the [verification record](VERIFICATION.md) beside this report.

The review included targeted source tracing in three independent areas, no-provider function reproductions, a manual Chromium session with Swedish labels, offline example opening, local prompt building, and screenshots at desktop and narrow widths. Existing browser tests exercise light/dark layouts, Swedish/Arabic local editor layouts, captions and project reopening.

No real Veo, Gemini, Lyria, Ollama or Suno request was made. No physical microphone, screen reader, native desktop render/export, GPU, installation or external editor import was qualified. Browser and unit evidence must not be presented as those results.

## Evidence captures

- [start sv 1280](evidence/start-sv-1280.png)
- [studio sv 1280](evidence/studio-sv-1280.png)
- [studio sv 375](evidence/studio-sv-375.png)
- [timeline sv 1280](evidence/timeline-sv-1280.png)
- [timeline sv 800](evidence/timeline-sv-800.png)

## Review principles

The recommendations use [Nielsen's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) for visible status, predictable actions, user control, consistent terminology and recovery. Status accessibility should follow [W3C's explanation of WCAG 2.2 status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). These sources support the assessment method; code findings come from the reviewed repository.
