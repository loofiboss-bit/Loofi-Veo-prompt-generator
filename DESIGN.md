# Creator Studio workbench

The UI prioritizes a short path from an idea to an editable, copy-ready result.
Prompt Studio and Production remain separate: local compilation never implies a paid request.

## Shared structure

- **Create:** Prompt Studio, Production, Timeline.
- **Library:** Projects, Assets.
- **Follow-up:** Activity. Settings sits in the sidebar footer.
- A compact context row identifies the active project and opens Quick navigation (Ctrl/Cmd+K).
- The typed navigation registry supplies the same seven destinations to the sidebar and palette.
- The shell owns the single main landmark, skip target, route-heading focus and content offset.

At 1200 CSS pixels and above, the sidebar starts expanded at 256 px. At 640–1199 px,
it starts collapsed at 64 px. The content always reserves the displayed width. Below
640 px, navigation is a dismissible drawer with no permanent offset. Manual choices
last within the current viewport category. Settings returns to its originating route
and query; directly opened Settings returns to Prompt Studio. Settings uses a category
selector below 800 px of available content width, including zoomed workspaces.

## Workspace hierarchy

Prompt Studio orders controls as idea, basic settings, build/enhance actions, and optional
details. Templates, previous packs and revisions share a secondary library panel.
Required references remain next to their recipe. Blocking checks are visible; validation
actions reveal and focus the affected control. AI proposals require explicit acceptance.

The Studio content box (excluding padding) uses two columns from 960 px. Smaller content
boxes use Editor/Result views. Both remain mounted to retain presentation and editing state.
Building a pack or receiving a proposal reveals and focuses Result. Mode changes return
to Editor. The primary output action is Copy prompt; other copy formats are in Copy options.

Production retains six freely selectable steps. Step navigation does not execute production
actions. Its save indicator describes the persisted production plan, never an inferred
project autosave. Assets starts with the media library and keeps continuity profiles in a
separate tab. Timeline embeds its player so navigation stays reachable. Reference editors
and Timeline can open the contextual asset drawer; global Assets navigation opens the page.

## Visual system

Genre: modern-minimal. Structure: workbench. Existing sans and monospace font stacks remain.
Reuse `src/shared/styles/tokens.css` as the token source; do not create a second palette.
Keep named spacing, surface, text, border and focus tokens. Neutral surfaces carry the UI;
the saved accent identifies selected controls and primary actions. Primary action text uses
`--color-on-accent` against `--color-action-bg` (the existing accent-700 scale).

Light and dark themes, all accent presets, right-to-left layouts and reduced motion remain
supported. No decorative gradients, ambient lighting, perpetual save pulses or hover scaling
are needed. Headings are upright and may wrap; action labels stay readable in narrow views.
Only actual loading/progress may animate. Errors and unsaved state remain explicit.

## Compatibility and validation

Routes, legacy redirects, project schema, storage keys, drafts, revisions, lyric locks,
generation capabilities and approval requirements remain unchanged. UI view switching never
creates, reloads or replaces a project. Existing durable-save checks protect project changes.

Verify the UI at 320, 375, 414, 768, 865, 1024, 1280 and 1536 px in both themes and at 200%
UI zoom. At 1280 × 800 the standard idea, basic settings and build action fit without scrolling.
Check sidebar bounds, menu focus, copy actions, validation recovery and project persistence.
Run `npm run validate`, `npm run build` and affected Chromium E2E tests. Review rendered captures
before updating visual regression baselines.
