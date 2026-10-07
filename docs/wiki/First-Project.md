# First Project Guide

Follow these steps to build your first project in Loofi Creator Studio v13.0.0.

## 1. Create a Project

1. Navigate to **Projects** (`/hubs/projects`) and click **New Project**.
2. Give your project a name (e.g. _Neon Horizon_), select an aspect ratio (16:9, 9:16, 2.39:1 Anamorphic), and choose a project folder on your local disk.
3. All assets, generation drafts, and audio stems will be stored safely within this directory.

## 2. Populate the Production Bible v2

1. Navigate to **Assets & Continuity** (`/hubs/assets`).
2. Add your primary character profile. Upload or generate 4-angle turnaround references (Front, 3/4 Profile, Side, Action/Back).
3. Add key locations and establish visual style parameters (e.g., _Cyberpunk Noir, 35mm lens, tungsten lighting_).

## 3. Screenplay Breakdown or Shot Staging

1. Open **Production** (`/create`).
2. In **Step 1 (Brief)**, import a Fountain or Markdown screenplay, or describe your narrative concept.
3. In **Step 2 (Scenes)**, use the **3D WebGPU Viewport** to stage camera positions, choose lenses (e.g., 50mm f/1.4), and select camera trajectories (e.g., Dolly Push-in).
4. Run the **Previz Animatic Player** to preview shot pacing with BPM beat-snapping and scratch voiceover.

## 4. Render Media

1. In **Step 4 (Generate)**, choose whether to render via:
   - **Cloud Google Veo 3.1**: Inspect the maximum cost ledger and approve execution.
   - **Local ComfyUI**: Render offline for free on your local GPU.
2. Review takes in **Step 5 (Review)**, checking perceptual hash (dHash) drift scores.

## 5. Export to NLE

1. In **Step 6 (Export)**, select **OpenTimelineIO (`Timeline.1`)** or **FCPXML 1.11**.
2. Export your project bundle alongside the `Creative Pack Schema 5` manifest and open directly in DaVinci Resolve or Premiere Pro.
