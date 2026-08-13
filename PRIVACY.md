# Privacy Policy

**Last updated:** 2026-08-13

Loofi Creator Studio is a local-first desktop application. Projects, settings, production runs,
assets, history, and generated media are stored on the user's device unless the user explicitly
starts a provider request or enables an external sync destination.

## Credentials and provider requests

- Desktop credentials are stored through the operating-system credential vault.
- The renderer can check credential availability and request a provider operation, but it cannot
  read secrets from the desktop vault.
- Legacy browser-stored credentials are read only for migration, then removed. When no desktop vault
  is available, a credential is kept in memory for the current session only.
- Provider requests are sent only after the user explicitly starts the relevant operation. Paid
  operations require a visible model/cost approval and are blocked when a conservative maximum is
  unavailable.
- Google Gemini, Veo, Vertex AI, and official Lyria requests are sent to the selected provider.
  Ollama requests stay on the configured local endpoint.

## Telemetry and crash reports

- Usage telemetry is opt-in and disabled by default.
- Telemetry and crash reports are stored locally by default. External submission requires explicit
  configuration and user consent; no submission endpoint is bundled with the application.
- Events and reports are sanitized to exclude credentials, prompt text, raw provider responses,
  media payloads, and other sensitive content.
- Users can clear locally stored telemetry and crash reports from the desktop settings.

## Collaboration and external services

Optional collaboration uses Yjs/WebRTC and can expose connection metadata to peers during an active
session. Plugin code and provider services are third-party execution or data-processing boundaries;
review the relevant provider or plugin terms before enabling them.

## Diagnostics and support bundles

Support bundles contain redacted operational information such as versions, platform, provider
configuration state, storage totals, and sanitized job/log status. They do not intentionally include
API keys, prompt content, raw provider responses, private media, or credential paths. Review a bundle
before sharing it.

## Data removal

Use the application's settings and project controls to remove credentials, telemetry, crash reports,
projects, backups, and generated media. Files removed outside the application may bypass its recovery
and retention safeguards.
