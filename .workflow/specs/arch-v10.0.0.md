# v10.0.0 Continuity Studio Architecture

## Source of truth

`ProductionBible` is the canonical project-level continuity source. Legacy `characterBank`,
`locationBank`, and `visualDNA` remain readable during migration and may be refreshed as compatibility
projections by legacy editors, but they are not execution sources. A normalized project always has a
Production Bible in memory and in newly written archives.

## Data flow

```text
Project + Assets
  -> continuityService.migrate/normalize
  -> continuityService.compileShot
  -> ContinuitySnapshot + ContinuityReport
  -> productionPreflightService
  -> one-time approval fingerprint
  -> paid provider request + durable take provenance
  -> review/export
```

## Safety invariants

- Snapshot fingerprints include profile versions, lock text, selected reference IDs, and asset
  fingerprints. Any change invalidates the prior approval.
- First/last frame and extension input remain distinct from identity references.
- Reference selection is explicit when more than three candidates are required; no silent truncation.
- Missing, damaged, or stale assets are critical blockers.
- Unknown or non-positive pricing remains a paid-execution blocker.

## Compatibility

`.loofi-project` schema 10 reads legacy v5–v9 archives, preserves unknown fields, records migration
history, and writes only schema 10. Existing application ID and IndexedDB namespaces are unchanged.
