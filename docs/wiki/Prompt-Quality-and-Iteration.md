# Prompt Quality and Iteration

The v14.1.0 Studio workflow helps you compare direction, address concrete issues and preserve
useful drafts without replacing them before you are ready.

## Compare in Model Arena

From Video, select **Compare in Arena**. Arena compiles the same normalized input for all eight
Studio targets using the copy desk's compiler. Compare prompt text, settings and handoff compatibility,
then copy the package you want to try.

Arena compares packages, not generated videos or provider performance. Manual target names do not
guarantee support for a specific provider version. Confirm duration, controls and reference support
in the chosen destination. Only **Veo API** supports internal production handoff; that path still
requires explicit paid approval.

## Turn readiness feedback into a useful edit

After building, enhancing or manually editing a pack, open **Readiness checks**. Each variant is
validated separately.

- Documented request constraints can block internal generation.
- Writing advice and unconfirmed compatibility are warnings.
- **Open control** opens the relevant field or selects the affected variant without changing it.
- Manual copying remains available while you review warnings.

Keep a scene concrete: one visible action, clear camera motion and a plausible duration. Quoted
dialogue is supported. Reference recipes need the appropriate local images; first/last-frame mode
requires both frames. Internal extension needs a real provider artifact.

## Review AI proposals before acceptance

**Enhance with AI** and **Rewrite section** require a configured provider. They show proposed
differences while leaving the current draft unchanged.

1. Review all three variants and the affected text.
2. Choose **Accept changes** to apply the proposal, or **Reject changes** to keep your draft.
3. For music, lock lyric sections that must remain exact before requesting a rewrite.

Changing the draft or switching project invalidates a pending proposal. Late AI responses are
discarded. Acceptance creates a checkpoint before replacing existing work.

## Save, compare and restore versions

Open **Versions and comparison → Save version** for an explicit project snapshot. Rebuild, model
changes, template application and AI acceptance also checkpoint before replacing work. Identical
adjacent snapshots are deduplicated.

Choose a saved version to compare it with the current draft. **Restore as new version** restores
both video and music inputs, outputs, selected variants and lyric locks. It preserves the work
being replaced as another version, so you can return to it.

Only durable storage can report **Saved**. Storage failures block replacement boundaries; keep
the window open and retry saving. A temporary memory fallback is not a durable checkpoint.
Brief input edits keep the previous pack visible until you build a replacement.

## Reuse complete templates

The **Studio template library** is a local global library, shared across projects:

- Save a named video or music input, search or filter entries, and preview before applying.
- Apply a template in its matching workspace, then build a new pack.
- Update an entry with the current workspace's input, or delete it when no longer needed.
- Music templates include original lyrics and locks. Legacy video templates remain read-only.

Templates exclude project media IDs and provider handles. Choose images, clips and references again
in the receiving project. Templates are not included in a project archive.

## Back up the whole iteration history

Export a `.loofi-project` archive from **Projects**. Project revisions travel with it, including
local media referenced only by older versions. Import remaps IDs and revokes active cost approvals;
it does not automatically submit imported work.

See [Project Backup and Restore](Project-Backup-and-Restore.md), [Review and Revision](Review-and-Revision.md)
and the [User Guide](../USER_GUIDE.md).
