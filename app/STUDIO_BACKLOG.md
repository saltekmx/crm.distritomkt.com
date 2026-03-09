# AI Studio — Feature Backlog (Post-Demo)

Features deferred from the standalone image generator spec. Grouped by complexity.

---

## High Complexity

| Feature | Description | Notes |
|---------|-------------|-------|
| Inpainting | Brush mask over area, regenerate just that region | Needs mask painting canvas + model support (Gemini edit mode) |
| Outpainting | Extend canvas beyond original borders | Canvas extension logic + generation stitching |
| Layer system | Base + mask + text + overlay layers | Full canvas engine (Fabric.js or Konva) |
| Object eraser | Brush to remove unwanted elements | Same as inpainting but with removal prompt |
| Face/subject consistency | Lock a reference face across generations | Needs IP-Adapter or specialized model |
| Version tree | Branching edit history, visualized | Parent-child generation tracking + tree UI |
| Brand kit | Logo, color palette, typography rules + compliance check | New DB tables, upload flow, Claude analysis |
| Cost controls | Per-user quotas, cost estimates, usage dashboard | Admin settings, tracking middleware, analytics UI |

## Medium Complexity

| Feature | Description | Notes |
|---------|-------------|-------|
| Model comparison mode | Same prompt → 2 models side-by-side | Dual generation call + split canvas view |
| Text overlay | Font, size, color, position on canvas | Canvas text rendering (not burned in by default) |
| Sticker/watermark overlay | Brand logo placement | Similar to text overlay |
| Style transfer | Apply look of reference image to output | Needs model support or separate API |
| Folder organization | Folder hierarchy for images per project/client | DB structure exists in media, extend to studio |
| Color palette extractor | Extract dominant colors from generated image | Canvas sampling or backend PIL |
| Batch export naming | `{client}_{date}_{scene_order}` convention | Template string + ZIP endpoint update |

## Low Complexity

| Feature | Description | Notes |
|---------|-------------|-------|
| Resolution control | 512/1024/2048 selector (model-dependent) | Param in schema, dropdown in UI |
| Guidance scale / CFG / Steps | Advanced generation params | Hidden behind "Advanced" toggle |
| Watermark on unapproved | Draft watermark removed on approval | PIL overlay on presigned URL or frontend overlay |
| Export with/without EXIF | Embed prompt/model/seed in image metadata | PIL EXIF writing on export |
| Restricted content filter | Flag outputs violating brand guidelines | Claude vision scan post-generation |
| Draft vs Production toggle | Fast/cheap preview before full render | Map to model selection (fast vs ultra) |

---

*Last updated: 2026-03-09*
