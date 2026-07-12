# Project backup and restore

Export `.loofi-project` for a portable ZIP containing project JSON, assets or portable references, provenance, a model/pricing snapshot, migration history, and checksums.

Desktop saves also create five rotating atomic snapshots. Use Project Manager’s history action to restore the latest backup; restore is refused if its SHA-256 or project ownership does not match.
