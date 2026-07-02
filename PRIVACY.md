# Veo Studio — Privacy Policy

> **Last updated**: 2026-02-16 | **Applies to**: Veo Studio v2.2.0+

---

## 1. Local-First Architecture

Veo Studio is a **local-first application**. All projects, settings, and generated assets are stored on your device using IndexedDB and the local file system. No user data is transmitted to our servers.

## 2. API Key Handling

- Your Google Gemini API key is stored **locally** in an encrypted settings store on your device.
- The key is transmitted **only** to Google's Generative AI endpoints (`generativelanguage.googleapis.com`) when you initiate an AI generation request.
- API keys are **never** sent to Veo Studio servers, analytics providers, or third parties.

## 3. AI Requests

When you use the generative features (prompt generation, image creation, video analysis, speech synthesis, etc.), your prompts and inputs are sent directly to:

| Provider      | Endpoint                            | Data sent                                         |
| ------------- | ----------------------------------- | ------------------------------------------------- |
| Google Gemini | `generativelanguage.googleapis.com` | Prompt text, uploaded images/audio (for analysis) |
| Google Veo    | `generativelanguage.googleapis.com` | Video generation prompts, start/end frames        |

Google's data processing policies apply to these requests. See [Google's AI Terms](https://ai.google.dev/terms).

## 4. Telemetry

Veo Studio includes an **opt-in** crash reporting and anonymous usage telemetry system:

- **Default**: Telemetry is **disabled**.
- **When enabled**: We collect anonymous, aggregate usage data (feature usage counts, crash stack traces).
- **PII stripping**: All telemetry payloads are scrubbed of personally identifiable information before transmission.
- **You can disable telemetry at any time** via Settings → Privacy → Telemetry toggle.

## 5. Collaboration (Yjs/WebRTC)

Real-time collaboration uses peer-to-peer WebRTC connections:

- Document state is shared directly between peers using the Yjs CRDT protocol.
- No collaboration data passes through Veo Studio's servers (signaling excepted).
- Connection metadata (IP addresses) is visible to peers during active sessions.

## 6. Extensions / Plugins

Third-party plugins run in a **sandboxed execution environment** with restricted API access:

- Plugins cannot access the file system, network, or settings without explicit user permission.
- Plugin code is evaluated in an isolated context and cannot access the host application's state.
- We recommend reviewing plugin source code before installation.

## 7. Data You Control

| Data Type        | Storage Location        | How to Delete                              |
| ---------------- | ----------------------- | ------------------------------------------ |
| Projects         | Local IndexedDB         | Settings → Data → Clear Projects           |
| API Keys         | Local encrypted store   | Settings → API → Remove Key                |
| Generated Assets | Local file system       | Delete from Asset Library or File Explorer |
| Telemetry Opt-in | Local settings          | Settings → Privacy → Disable               |
| Plugin Data      | Local sandboxed storage | Settings → Extensions → Clear Data         |

## 8. Children

Veo Studio is not directed at children under 13. We do not knowingly collect personal information from children.

## 9. Changes

We will update this document when our practices change. Check the "Last updated" date at the top.

## 10. Contact

For privacy questions, open an issue on the [Veo Studio GitHub repository](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator).
