# Security and Privacy

Consolidated security + privacy guidance for operators and teams.

## Security model summary

- Local-first storage boundaries
- Hardened Electron runtime configuration
- Permission-gated plugin architecture
- Explicit error/log pathways for diagnostics

For policy details, see:

- [Security Policy](../SECURITY.md)
- [Privacy Policy](../PRIVACY.md)

## Data handling summary

| Data type            | Typical storage               | Notes                                  |
| -------------------- | ----------------------------- | -------------------------------------- |
| Projects and history | Local persistence (IndexedDB) | Primary workflow state                 |
| Settings             | Local storage/config          | User and runtime preferences           |
| API key material     | Local device storage          | Used for user-initiated provider calls |
| Plugin data          | Plugin-scoped storage         | Isolation by plugin namespace          |

## Network boundary summary

Expected outbound traffic is tied to:

- User-initiated AI/provider operations
- Release/update metadata and downloads

## Team checklist

- Use trusted plugins and review declared permissions.
- Keep app versions current.
- Rotate/revoke keys if compromise is suspected.
- Use secure channels for vulnerability reporting.

## Incident response basics

1. Isolate affected workflow/plugin.
2. Collect logs and reproduction details.
3. Escalate through repository security reporting channel.
4. Apply mitigation and document post-incident learnings.
