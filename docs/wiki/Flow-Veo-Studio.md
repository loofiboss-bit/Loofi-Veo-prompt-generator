# Video Prompt Studio

Prompt Studio (`/` or `/studio`) is the copy-first creation workspace. It compiles an idea into three
editable, model-tailored variants locally: **Recommended Primary**, **Cinematic** and **Control-focused**.

## Choose a destination

Select the target before building. Flow, Kling, Runway, Sora and Luma are manual destinations:
copy a package and use the destination's own submission controls. Check its concrete model version,
limits and supported settings; broad target labels are not provider compatibility guarantees.

**Veo API** is the internal production target. **Generate in app** prepares a plan with the selected
variant and references. Production must validate it and receive explicit cost approval before submission.
Unsupported combinations are blocked before submitting, rather than routed silently to a different model.

## Choose a recipe

| Recipe                 | Describe                                                 | References                                             |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Text-to-video          | Subject, action, environment, camera, lighting and sound | Optional direction                                     |
| Image-to-video         | Subject and camera motion from an existing image         | Local source image                                     |
| First/last frames      | The action bridging two frames                           | Both local frame images                                |
| Ingredients/references | Roles and continuity for each reference                  | Selected local images                                  |
| Extend                 | What happens next while preserving continuity            | Real provider artifact required for internal extension |

Local PNG, JPEG and WebP images can be imported or selected from existing project images.
**Scene details** contains additional direction controls. Camera and lens descriptions guide the
prompt; they do not guarantee that a destination will reproduce an exact optical simulation.

## Build and refine

Select **Build copy-ready pack**, edit a variant and inspect **Readiness checks**. Use
**Compare in Arena** to inspect packages for all eight Studio targets. AI enhancement remains an
explicit provider action with proposal review before acceptance.

For durable versions and reusable inputs, see [Prompt Quality and Iteration](Prompt-Quality-and-Iteration.md).
For a first scene, see [Quick Start](Quick-Start.md) and [Prompting Guide](Prompting-Guide.md).
