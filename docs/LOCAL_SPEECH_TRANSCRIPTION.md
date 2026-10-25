# Local speech transcription

Creator Studio's desktop caption workflow can transcribe a selected audio or video clip locally.
It uses the multilingual Whisper Base ONNX model from the `onnx-community/whisper-base` repository,
pinned to revision `1846881b6b3a3024392c1eea3ad983695bc23925`. The repository identifies the
weights as an ONNX conversion of [OpenAI Whisper Base](https://huggingface.co/openai/whisper-base).

The application downloads only the q8 encoder and merged decoder plus their tokenizer/configuration
files. The manifest in `electron/creator-asr-model-store.cjs` pins each file's expected size and
SHA-256. The total first-install download is shown before confirmation. Installation can be cancelled;
files are published as an installed model only after every file passes its checksum. The files remain
under the desktop application's user-data directory and can be removed from the caption panel.

The selected timeline clip occurrence and its source trim are decoded by the bundled FFmpeg runtime
to mono 16 kHz float PCM. The audio buffer is sent to a dedicated worker running Transformers.js and
ONNX Runtime Web CPU/WASM. Inference has remote model access disabled and loads model files only from
the app's `loofi-asr://models/` local resource handler. No audio is sent to a provider. The language
selector supports automatic detection, English, Swedish, Spanish, French, Japanese, and Arabic;
the pipeline uses Whisper's transcription task and does not translate the speech.

Transcription is available in the desktop app after model installation. The web app continues to
support manual captions and SRT import. Silence-based **Create time blocks** only proposes timing;
it does not claim to recognize speech and requires the user to enter caption text.
