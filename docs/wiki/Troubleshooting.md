# Troubleshooting

Start with the visible status and preserve the current project before changing settings.

## The project says Not saved

Keep the window open and retry saving. Only a durable write can report **Saved**; a memory fallback
will not survive closing the app. Storage failures also block iteration actions that would replace
work. Export a project backup once storage is working again.

## The pack has readiness warnings

Open **Readiness checks → Open control** to inspect the relevant field or variant. Writing advice
and uncertain manual compatibility are warnings, while documented constraints can block internal
generation. First/last-frame recipes need both images; internal extension needs a real provider artifact.

## An AI proposal disappeared

Edits or project switching invalidate pending proposals. Request enhancement or rewriting again
from the current draft. Review differences before accepting; locked lyric sections remain unchanged.

## A paid job reports RecoveryRequired

Do not submit another order. The provider may already have accepted the first. Inspect the job in
Activity and use the available recovery path. Known operations resume polling or download;
restarting reconciles persistent jobs. See [Diagnostics](Troubleshooting-and-Diagnostics.md).

## ComfyUI, Live, LAN or Foley actions are unavailable

Those integrations are incomplete and disabled. **Settings → Labs** only exposes local camera
preview and ComfyUI connection diagnostics on demand. Enabling Labs does not enable rendering,
Live audio, LAN collaboration or Foley generation. Firewall changes and microphone permissions
will not activate them.

## An AppImage will not launch

Use the file downloaded from a published release, verify its checksum and make it executable:

```bash
chmod +x /path/to/downloaded.AppImage
/path/to/downloaded.AppImage
```

Record the actual launch error before changing system packages. See
[Installation and Updates](Installation-and-Updates.md) for supported package channels.

## Desktop credential storage is unavailable

Inspect the credential-vault status in diagnostics and ensure your desktop session's keyring is
available and unlocked. Never paste API keys, authorization headers or provider account data into
an issue. Local compilation works without credentials.
