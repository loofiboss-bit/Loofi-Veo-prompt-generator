# Loofi Creator Studio v20.0.0

Loofi Creator Studio v20 brings all of PR #96 into the desktop workflow. Project saves wait for
media and catalog durability, and explicit timeline placement preserves the edits already made to
a clip. Selected music and video proposals protect lyrics and dialogue while leaving acceptance
under the creator's control. Desktop-local transcription, reviewed delivery and persistent cost
accounting make production progress easier to inspect.

## Highlights

- Save media, catalog and project documents in durable order, with catalog merges across windows.
- Keep production acceptance separate from timeline placement and preserve edits on source replacement.
- Review selected music/video fields with occurrence-aware lyric locks and protected dialogue.
- Cancel Studio AI and provider requests, and use result notes as context for prompt proposals.
- Install a checksum-verified local Whisper model explicitly and transcribe selected clip occurrences without a cloud fallback.
- Mix source audio through shared timeline playback and recover project-scoped render batches.
- Require a current delivery review before saving and distinguish estimated, approved and verified costs.
- Use three Start destinations, recent projects, a next action and six updated application locales.

## Upgrade notes

Existing project and archive formats remain supported. Existing cost history and budgets migrate
automatically to an isolated ledger database while preserving the original data. Local speech transcription is desktop-only
and requires an explicit model download; web users can continue to use manual captions and SRT.
AI cancellation stops waiting and retries, but a request already sent to a paid provider may still
be billed. Verify the downloaded package against `SHA256SUMS.txt` before installing.

Physical desktop, screen-reader, real OS-vault, profile migration and paid-provider qualification
remain separate from automated release checks. See [the release runbook](../RELEASE.md).
