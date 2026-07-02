# Security Policy

## Supported Versions

| Version | Supported                           |
| ------- | ----------------------------------- |
| 5.x     | Current release line                |
| 4.6.x   | Security fixes during v5 transition |
| < 4.6   | End of life                         |

## Reporting a Vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Use GitHub private vulnerability reporting or contact the repository owner with:

- Vulnerability description
- Steps to reproduce
- Affected version and platform
- Potential impact
- Suggested fix, if known

We aim to acknowledge reports within 48 hours and prioritize critical fixes.

## Security Architecture

Loofi Flow/Veo Studio is local-first:

- No hosted backend is required for normal desktop usage.
- Projects, history, templates, and settings are stored locally.
- API keys are used only for user-triggered generation requests.
- Optional local LLM drafting can run through a local Ollama-compatible endpoint.

## Data Handling

| Data                  | Storage                              | External transmission          |
| --------------------- | ------------------------------------ | ------------------------------ |
| Projects              | IndexedDB                            | No                             |
| Prompt history        | IndexedDB                            | No                             |
| Templates and presets | IndexedDB                            | No                             |
| Settings              | Local app storage                    | No                             |
| API keys              | Local secure storage where available | Only to configured AI provider |

## Electron Hardening

- Context isolation is enabled.
- Renderer Node integration is disabled.
- Preload scripts expose limited IPC.
- Safe Mode detects crash loops.
- Release artifacts include SHA256 checksums.

## Dependency Management

- CI runs `npm audit --audit-level=high`.
- Dependabot is configured for dependency updates.
- High and critical production dependency issues are prioritized.
