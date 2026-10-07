# Assets and Continuity

Loofi Creator Studio provides a robust continuity system anchored by the **Production Bible v2**, ensuring that character identity, wardrobe, locations, and artistic looks remain coherent across shots, scenes, and episodes.

## 1. Production Bible v2

The Production Bible is the canonical project repository for creative continuity. It organizes references across four profile types:

- **Characters**: Physical anatomy, face details, hair, clothing, and prohibited deviations.
- **Locations**: Architectural style, geography, weather rules, and lighting conditions.
- **Props**: Key items, materials, colors, and physical dimensions.
- **Visual Styles**: Color grading palettes, grain parameters, and camera lens characteristics.

## 2. 4-Angle Turnaround Reference Matrix

To eliminate character face and wardrobe drift across AI generations, Production Bible v2 introduces a standardized 4-angle turnaround matrix:

1. **Front Angle**: Clear neutral facial portrait and frontal clothing view.
2. **3/4 Profile**: Intermediate angle revealing facial depth, nose bridge, and side profile.
3. **Side Silhouette**: 90° lateral perspective defining posture and body shape.
4. **Action / Back**: Rear view and movement dynamics for action sequence continuity.

These 4 angles are bound directly to shot prompts and conditioning workflows.

## 3. Perceptual Hash (dHash) Drift Scoring

When generated takes are rendered, the client-side vision engine computes 64-bit difference hashes (dHash) and average RGB color space distances between the generated take and the locked reference sheet:

- **Low Drift (< 15% distance)**: Character and costume consistency passed.
- **Moderate Drift (15% - 30%)**: Warning flagged in review pane with highlight indicators.
- **Severe Drift (> 30%)**: Approval blocker for batch jobs to prevent wasted render costs.

## 4. ControlNet Conditioning Maps

From the 3D Previz Viewport, creators can export pixel-perfect conditioning maps to lock character poses and architectural perspective:

- **Depth Map**: 16-bit linear depth for spatial volume locking.
- **Normal Map**: Surface orientation vectors for consistent lighting and geometry.
- **Wireframe Map**: Structural edge constraints.

## 5. Non-Destructive Reference Promotion

When a generated take achieves exceptional quality or represents an updated character costume, creators can promote that take into the canonical Production Bible with one click without altering original historical references.
