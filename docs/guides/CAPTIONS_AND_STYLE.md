# Add readable captions and your own style

**Result:** a short video with reviewed caption timing, consistent colors and your own local style.
These controls are part of v15 development. Manual captions and styles need no AI service.

## Make the project your own

1. Open the project you want to change, then open **Start → My style**.
2. Choose **New style**, enter a name and pick a primary color, text color, Noto Sans or Noto Serif,
   and a creative direction. For a logo, first import a local image in **Assets**, then select it
   from **Logo from media library**.
3. Select **Save style** to reuse the profile later. Select **Preview on current project** to
   inspect the colors, text and logo, then **Apply to this project** to approve the change.
4. Return to **Timeline → Export video**. Expand the crop preview, check the style and adjust
   **Safe margin** to keep text and the logo away from the edges. Check portrait and square crops
   separately when making multiple formats.

The project keeps an independent copy of the style. Editing the library profile later does not
change older projects. Creative direction updates the Studio input: rebuild its pack if you want
new prompts to use it. Existing scene media and continuity profiles are retained.

## Add and check captions

1. Expand **Captions** in Export video. Choose **Add caption**, edit its text, and set its start and
   end in seconds. End must be after start, inside the timeline duration.
2. Choose **Import SRT** to add an existing subtitle file. Import adds clips; remove old caption
   clips first if the new file should replace them.
3. Watch the timeline and adjust text or timing. Choose **Classic**, **Pop**, or **Karaoke** and
   check readability against both bright and dark shots in the crop preview.
4. Choose **SRT sidecar** for an editable subtitle file or **Burn into video** for text visible
   without player subtitle support. **Download SRT** works independently of video rendering.
5. Select **Save delivery settings**, then **Export video** and save the verified result.

SRT does not carry your colors or font. Those choices affect burned-in text. Keep a separate SRT
when you also need editable subtitles.

## Optional transcription

Choose **Audio to transcribe** from an audio asset used on the timeline. The app sends the entire
selected audio file to Gemini and maps the returned times to the clip's current trim. Read the
file information and charge notice, select the consent checkbox, and choose **Request Gemini
proposal**. The desktop approval dialog displays the maximum charge before any sending.

Review each proposed line before **Accept proposal**. Acceptance adds caption clips; it does not
remove older captions. Editing captions or changing the project makes an old proposal stale.
Discard it and request a new one when needed. A failed or empty response is an error, not a successful
empty subtitle track. Manual editing remains available.
