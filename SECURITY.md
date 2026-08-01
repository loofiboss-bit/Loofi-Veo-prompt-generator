# Security Policy

## Supported versions

| Version | Status                                  |
| ------- | --------------------------------------- |
| 9.x     | Current release line                    |
| 8.x     | Security fixes during the v9 transition |
| < 8.0   | End of life                             |

Report vulnerabilities through GitHub private vulnerability reporting. Do not include credentials,
private project data, generated media, or sensitive logs in a public issue.

## Trust boundaries

- The renderer has no Node.js integration and cannot read desktop credentials.
- Context isolation, sandboxing, and web security are enabled in normal execution.
- The preload exposes narrow typed methods rather than `ipcRenderer`.
- Gemini and Vertex credentials are stored in the OS credential vault. Ollama is local and explicit.
- Electron main validates provider/model capability, request shape, pricing source, verification date,
  and maximum charge again before execution.
- A paid request without a positive conservative maximum and explicit approval is rejected.
- Approval tokens for direct provider calls are single-use and expire.
- Ambiguous paid submissions are marked `RecoveryRequired`; they are not automatically replayed.

## Local data and diagnostics

Project state, production runs, assets, and history remain local. Generated media is written through
an atomic temporary-file/rename flow with SHA-256 readback. Existing storage keys and application ID
are retained so upgrades do not orphan user data.

Diagnostics and support bundles may include versions, platform, provider configured/not-configured
state, storage totals, redacted job status, and local logs. They must never include API keys, prompt
text, raw provider responses, image/audio payloads, or absolute credential paths.

## Supply chain

CI uses immutable action revisions, fails on known high/critical production vulnerabilities,
performs dependency/license review and secret scanning, and produces release checksums, CycloneDX
SBOM, and build provenance. Windows signing is optional and its status is recorded in the release
manifest. Public release qualification still requires platform smoke tests and explicit publication
authorization.
