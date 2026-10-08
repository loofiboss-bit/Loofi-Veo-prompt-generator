# Export and NLE Handoff

Choose the export that matches your next task: editable project recovery, a creative handoff or
an editorial timeline with local media.

| Export                       | Use it for                                      | Important boundary                                         |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `.loofi-project` schema 11   | Portable project backup and restore             | Missing referenced media blocks export                     |
| Creative Pack schema 5       | Creative briefs, prompts and production handoff | Includes available project output; does not generate media |
| **Download OTIO with media** | Editorial timeline handoff                      | Confirm import support in your chosen editor               |
| **FCPXML: experimental**     | Testing an XML interchange workflow             | External NLE import remains unqualified                    |

## Timeline handoff

The OTIO bundle uses actual timeline tracks, gaps, clip ranges and selected or accepted takes.
Inspect cuts, trims and media references after import into your editor. Generated interchange files
and automated tests do not prove compatibility with every editor or its current version.

FCPXML remains experimental. Test a small representative project in your editor before relying on
it for production. ComfyUI and Foley integrations do not supply generated media in this release.

## Portable projects

Project archives include the document, referenced local media, relative paths, checksums, prompt
artifacts, handoffs and production provenance. Revisions and media referenced only by an older
version are included. Unrelated project media and the global template library are not included.

Import creates a new local project, remaps IDs and installs media. Active cost approvals are
revoked; imported work is not automatically submitted. Playback of restored local media does not
need a provider account.

See [Project Backup and Restore](Project-Backup-and-Restore.md) and [Production Workflow](Production-Workflow.md).
