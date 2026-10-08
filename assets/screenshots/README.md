# Screenshots

Regenerate the Production screenshots (`01`–`09`) with:

```bash
npm run screenshots
```

These images are captured from the actual Vite app with deterministic local UI state. They do not include API keys, private files, local usernames, or absolute local paths.

| File                         | Populated state                                |
| ---------------------------- | ---------------------------------------------- |
| `01-project-brief.png`       | Local creator brief and run summary            |
| `02-scene-planning.png`      | Production shot planning                       |
| `03-assets.png`              | Official Lyria form with sourced exact maximum |
| `04-generation-approval.png` | Model decision and approval preflight          |
| `05-active-job.png`          | Seeded durable generating take                 |
| `06-ab-review.png`           | Two locally reviewed takes                     |
| `07-timeline.png`            | Timeline workspace                             |
| `08-export.png`              | Populated Creative Pack v2 preview             |
| `09-diagnostics.png`         | Project diagnostics opened from Settings       |

## Prompt Studio (v14.1.0)

`10-prompt-studio.png` is a real browser capture of the local Prompt Studio workflow at 1600 × 1000.
It uses a fresh isolated browser session, dark theme and this fictional brief:

> A red sailboat crosses a quiet lake at sunrise. Low tracking shot, warm mist, gentle ripples, no dialogue.

To recreate it, run `npm run dev`, open `/studio` in a fresh browser profile, dismiss the welcome
screen, fill **Core idea** and select **Build copy-ready pack**. Choose **Settings → Theme → Dark**,
return to Prompt Studio and capture the viewport at 1600 × 1000. Do not configure a provider or use
AI enhancement. This capture does not use the Production fixture script above.
