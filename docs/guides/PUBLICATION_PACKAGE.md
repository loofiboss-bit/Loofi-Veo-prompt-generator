# Prepare a publication package

**Result:** one ZIP containing your verified video, subtitle sidecar, first-frame cover, publication
text and delivery report. You choose where to publish it. This is a v15 development feature.

1. Open the finished project in **Timeline** or **Production → Export** and find **Export video**.
2. Choose the final ratio, resolution, crop, caption output and style. Preview the safe margins.
   Keep the timeline at or below 60 seconds.
3. Edit **Publication title** and **Description** to describe the actual video. These fields work
   locally. You do not need AI to write or save them.
4. Optionally choose **Request publication text proposal**. Only the displayed title and description
   are sent to Gemini. Review the maximum charge in the desktop approval dialog. Inspect the result
   and choose **Accept publication text** or **Discard**. Changes made while waiting invalidate an
   older proposal; it cannot silently replace your text.
5. Select **Save delivery settings**, then **Export video**. Wait for both rendering and verification.
6. Select **Save publication package**, choose a ZIP destination, and extract the saved archive.
   Play `video.mp4`, inspect `cover.png`, review `publication.txt`, and retain `captions.srt` with it.

| File                   | Use                                                                 |
| ---------------------- | ------------------------------------------------------------------- |
| `video.mp4`            | Upload or share the rendered H.264/AAC video                        |
| `captions.srt`         | Upload editable subtitle text when the destination supports SRT     |
| `cover.png`            | First-frame cover image; edit externally if you want another design |
| `publication.txt`      | Copy the title and description into your chosen destination         |
| `delivery-report.json` | Identify the source project, content snapshot, duration and format  |

The package uses the snapshot from the completed export. If you change the title, description,
style or captions afterward, render again before saving the final package. A cancelled or failed
export cannot be saved as a completed delivery. If saving fails, fix the destination permissions
or available space and retry saving the verified job.

The package is a handoff, not automatic social publishing. The app does not sign you into social
accounts or post on your behalf. Optional AI and external generators may have their own costs;
local project editing and verified desktop export require no provider account.
