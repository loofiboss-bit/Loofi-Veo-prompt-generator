# Troubleshooting and Diagnostics

Use **Settings → Diagnostics** and Activity to inspect runtime, provider, media and durable-job
state. Record the visible error and current application version before changing settings.

## Diagnose without losing the draft

- Check whether the project says **Saving**, **Saved** or **Not saved**.
- Keep the window open if saving fails and retry before replacing work.
- Inspect local media health and missing-file errors before exporting a project.
- Use provider diagnostics only for the provider action you intend to perform.

ComfyUI connection diagnostics are a Labs feature available on demand. A successful connection
check does not qualify GPU rendering: ComfyUI rendering, Live audio, LAN collaboration and Foley
generation remain incomplete and disabled.

## Ambiguous paid submissions

A timeout or crash after submission may have occurred produces **RecoveryRequired**. Do not place
a duplicate order. Known operation IDs resume polling or download, and restart reconciles persistent
jobs. Completion requires verified local media. Cancelling locally does not prove provider billing
was cancelled.

## Report a useful issue

Include the application version, operating system, steps to reproduce, visible status and relevant
sanitized diagnostic output. Remove keys, authorization headers, URL credentials, private prompts
and account data before sharing. See [Privacy and Local Storage](Privacy-and-Local-Storage.md).

For common workflow problems, see [Troubleshooting](Troubleshooting.md).
