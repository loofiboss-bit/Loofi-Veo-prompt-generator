# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | ✅ Current release |
| 2.0.x   | ✅ Security fixes  |
| < 2.0   | ❌ End of life     |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. **Email**: Send a detailed report to the repository owner via GitHub private vulnerability reporting
3. **Response time**: We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues

### What to include in your report

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security Architecture

### Local-First Design

Veo Studio is built with a **local-first architecture**. By design:

- **No server-side backend** — The application runs entirely in the browser or as a desktop app
- **No user accounts** — There is no authentication or user data stored remotely
- **No telemetry** — No analytics, tracking, or usage data is collected
- **API keys are stored locally** — Your Google AI API key is stored in the browser's `localStorage` and never transmitted to any server other than Google's API endpoints

### Data Handling

| Data Type        | Storage Location    | Transmitted Externally?                     |
| ---------------- | ------------------- | ------------------------------------------- |
| API Keys         | `localStorage`      | Only to `generativelanguage.googleapis.com` |
| Projects         | `IndexedDB` (local) | No                                          |
| Prompt History   | `IndexedDB` (local) | No                                          |
| Generated Videos | `IndexedDB` (local) | No                                          |
| User Settings    | `localStorage`      | No                                          |
| Plugin Data      | `IndexedDB` (local) | No                                          |

### Content Security

- **Sanitized rendering** — User-generated content is sanitized via `DOMPurify` before rendering
- **Plugin sandboxing** — Third-party plugins run in isolated sandbox environments with a permission system
- **No `eval()`** — The codebase does not use `eval()` or `Function()` constructors
- **CSP headers** — Content Security Policy headers are configured for the Electron app

### External API Communication

The only external network requests are made to:

| Endpoint                                  | Purpose            | When                                     |
| ----------------------------------------- | ------------------ | ---------------------------------------- |
| `generativelanguage.googleapis.com`       | AI model inference | When user explicitly triggers generation |
| `github.com` (Electron auto-updater only) | App update checks  | On app startup (desktop only)            |

All API communication uses HTTPS/TLS encryption.

## Dependency Management

### Audit Policy

- Dependencies are audited on every CI run via `npm audit`
- **Dependabot** is configured for automated dependency update PRs
- Critical vulnerabilities in production dependencies are patched within 48 hours

### Current Status

Run `npm audit` to check the current vulnerability status. As of v2.2.0:

- **0 critical** vulnerabilities
- **0 high** vulnerabilities
- **2 moderate** vulnerabilities (dev-only: `esbuild` in Vite toolchain — no production impact)

### Known Allowlisted Issues

| Package   | Severity | Reason for Allowlist                              |
| --------- | -------- | ------------------------------------------------- |
| `esbuild` | Moderate | Dev-only build tool, no runtime exposure          |
| `vite`    | Moderate | Dev server only, not shipped in production builds |

## Desktop App Security (Electron)

- **Context Isolation**: Enabled — renderer process cannot access Node.js APIs directly
- **Node Integration**: Disabled in renderer
- **Preload Scripts**: Used for secure IPC between main and renderer processes
- **Auto-Updates**: Signed releases verified before installation
- **Safe Mode**: Crash-loop detection with automatic recovery

## Best Practices for Users

1. **Keep your API key private** — Never share your `.env` file or API key
2. **Update regularly** — Enable auto-updates in the desktop app to receive security patches
3. **Review plugins** — Only install plugins from trusted sources
4. **Use the latest version** — Older versions may contain known vulnerabilities
