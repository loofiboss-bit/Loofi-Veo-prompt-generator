# Troubleshooting

## Blank Screen

Run a production build locally and check Electron logs:

```bash
npm run build
npx electron .
```

## API Errors

Confirm that your API key is configured and that the selected model is available
to your account.

## AppImage Does Not Launch

Make it executable:

```bash
chmod +x Loofi-Flow-Veo-Studio-*-linux-*.AppImage
```
