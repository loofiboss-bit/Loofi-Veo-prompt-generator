# Production Workflow

**Production** (`/create`) connects local planning to approval-gated generation, review and export.

```text
Brief → Scenes → Assets → Generate → Review → Export
```

## Plan the production

Define the brief and organize the scenes. Add local references and bind characters, locations,
props and looks in [Assets and Continuity](Assets-and-Continuity.md). Verify required images and
continuity locks before preparing a request.

Studio's **Generate in app** creates a local plan for **Veo API**. It does not submit or bill a
provider. Flow, Kling, Runway, Sora and Luma retain manual handoffs; Suno uses manual Custom Mode
copy actions. Official Lyria music generation follows its own approved provider workflow.

## Approve a supported request

In **Generate**, review the selected prompt, model, duration, references and sourced maximum charge.
The application validates capability and request constraints before submission. Unknown or stale
pricing blocks paid execution. Approval is tied to the request; changed input needs a new approval.

ComfyUI rendering, Live Co-Director audio, multi-device LAN collaboration and Foley generation are
incomplete and disabled. Labs is off by default and does not activate those actions.

## Recover before retrying

If submission may have occurred, the job enters **RecoveryRequired**. The provider may already
have accepted it. Ordinary retry cannot submit another order. Known operation IDs resume polling or
download; persistent jobs reconcile after restart. Completion requires verified local media.

See [Troubleshooting and Diagnostics](Troubleshooting-and-Diagnostics.md).

## Review and export

Compare takes and keep, reject or revise them. Optional AI review and paid retakes require their own
explicit approval. Accepted local media can be placed on the timeline.

**Download OTIO with media** describes actual tracks, gaps, clip ranges and selected or accepted
takes. **FCPXML: experimental** requires qualification in your editor. `.loofi-project` schema 11
archives preserve the document, referenced media, revisions and provenance with checksums.

See [Review and Revision](Review-and-Revision.md), [Export and NLE Handoff](Export-and-NLE-Handoff.md)
and [Project Backup and Restore](Project-Backup-and-Restore.md).
