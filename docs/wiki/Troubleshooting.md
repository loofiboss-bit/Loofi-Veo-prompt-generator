# Troubleshooting

Common issues and recommended resolutions for Loofi Creator Studio v13.0.0.

---

## 1. 3D WebGPU Viewport or Three.js Blank / Error

- **Cause**: Hardware acceleration is disabled or outdated graphics drivers.
- **Resolution**:
  - Verify that hardware acceleration is enabled in your system graphics settings.
  - On Linux, ensure Vulkan and Mesa drivers are up to date:
    ```bash
    sudo dnf install mesa-dri-drivers mesa-vulkan-drivers
    ```
  - Launch with `--enable-gpu-rasterization` if running in constrained environments.

---

## 2. ComfyUI Offline Engine Cannot Connect

- **Cause**: ComfyUI is not running on `http://127.0.0.1:8188` or CORS is blocking localhost requests.
- **Resolution**:
  - Verify ComfyUI is running in your terminal: `curl http://127.0.0.1:8188/system_stats`.
  - Start ComfyUI with the `--enable-cors-header` flag:
    ```bash
    python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header
    ```
  - In **Settings → ComfyUI**, verify the host URL and click **Test Connection**.

---

## 3. Multimodal AI Co-Director Microphone Not Responding

- **Cause**: System microphone permissions denied or AudioContext suspended.
- **Resolution**:
  - Check operating system privacy settings to ensure Creator Studio has microphone access.
  - Verify your Gemini API key in **Settings → API Keys** has access to `gemini-3.8-live`.

---

## 4. P2P Virtual Writers' Room Cannot Connect to Peer

- **Cause**: Peers are on different subnets or a local firewall is blocking WebRTC UDP traffic.
- **Resolution**:
  - Confirm both machines are on the same local network (LAN / Wi-Fi).
  - Ensure local UDP traffic for WebRTC is not blocked by local firewalls (`firewalld` or Windows Defender):
    ```bash
    sudo firewall-cmd --add-service=mdns --permanent
    sudo firewall-cmd --reload
    ```
  - Double check that the LAN pairing code matches exactly.

---

## 5. Linux AppImage Launch Issues

- **Cause**: Execution permissions missing or FUSE library not installed.
- **Resolution**:
  ```bash
  chmod +x Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.AppImage
  sudo dnf install fuse-libs
  ./Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.AppImage
  ```

---

## 6. Linux Credential Vault / D-Bus Error

- **Cause**: Secret Service / GNOME Keyring / KDE Wallet is locked or not initialized.
- **Resolution**:
  - The app includes fallback handling in diagnostics when Secret Service is unreachable. Ensure your desktop keyring daemon is running (`gnome-keyring-daemon` or `kwalletd5`).
