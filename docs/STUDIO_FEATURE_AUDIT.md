# AI Studio — Feature Audit & Roadmap

> Generated: 2026-03-08 | Last updated: 2026-03-09 | Audited against the full 10-category feature list

---

## Legend

| Status | Meaning |
|--------|---------|
| DONE | Fully implemented (backend + frontend) |
| PARTIAL | Some parts working, needs completion |
| NOT STARTED | Not implemented |
| SKIP | Out of scope / deferred indefinitely |

---

## 1. Generation Core

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1 | Text-to-image | DONE | Multi-model via `POST /studio/image/generate`. Full chat flow + GenerateTab UI. |
| 1.2 | Image-to-image | DONE | `source_image_url` param → `generate_from_image()`. Reference image selector in GenerateTab. |
| 1.3 | Inpainting | NOT STARTED | Needs brush mask UI + API support. Gemini doesn't natively support masks. |
| 1.4 | Outpainting | NOT STARTED | Needs canvas extension UI. Same API limitation as inpainting. |
| 1.5 | Multi-model selector | DONE | 5 models: Gemini 2.5 Flash (default), Gemini 3.1 Flash, Imagen 4 Fast/Standard/Ultra. Dropdown in QuickControls with price hints. `GET /studio/models` endpoint. |
| 1.6 | Model comparison | NOT STARTED | Same prompt → 2 models → side-by-side. Needs split-canvas UI. |
| 1.7 | Batch generation | DONE | 1×/2×/4× selector in QuickControls. Imagen uses `sampleCount`, Gemini loops N times. Extra images create separate generation records. |
| 1.8 | Draft vs Production | PARTIAL | Multi-model enables this (Imagen 4 Fast = draft, Imagen 4 Ultra = production). No explicit UI toggle yet. |

**Backend files:** `studio/gemini_image.py`, `studio/router.py`, `studio/service.py`
**Frontend files:** `GenerateTab.tsx`, `studioAiStore.ts`

---

## 2. Prompt Tooling

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1 | Prompt input | DONE | Multiline input in GenerateTab + UnifiedChat. |
| 2.2 | Negative prompt | DONE | Collapsible advanced options in GenerateTab. Passed to Gemini. |
| 2.3 | AI prompt enhancer | DONE | `POST /studio/prompt/enhance` → Claude Haiku. "Mejorar" button in GenerateTab. |
| 2.4 | Prompt builder UI | NOT STARTED | Guided fields: Subject/Action/Environment/Style/Lighting/Camera/Mood. |
| 2.5 | Prompt history | DONE | localStorage, last 20 unique prompts. PromptHistory.tsx popover. |
| 2.6 | Prompt templates | DONE | `studio_prompt_templates` table. CRUD endpoints. PromptTemplates.tsx UI. |
| 2.7 | Save as template | DONE | Personal + shared (is_shared flag). Save button in GenerateTab. |
| 2.8 | Token counter | SKIP | Models used don't expose meaningful prompt length limits. |

**Backend files:** `studio/prompt_enhancer.py`, `studio/router.py`
**Frontend files:** `GenerateTab.tsx`, `PromptHistory.tsx`, `PromptTemplates.tsx`

---

## 3. Generation Parameters

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.1 | Aspect ratio | DONE | 6 ratios: 1:1, 4:5, 3:4, 16:9, 9:16, 3:2. Model-aware validation (Gemini supports more than Imagen). |
| 3.2 | Resolution | NOT STARTED | Model handles resolution. Would need multi-model to expose this. |
| 3.3 | Seed | SKIP | Gemini/Imagen don't expose seed parameter. |
| 3.4 | Style strength | NOT STARTED | For img2img — how much to deviate from reference. Model-dependent. |
| 3.5 | Steps | SKIP | Gemini doesn't expose this. Only relevant for SD/FLUX. |
| 3.6 | Guidance scale / CFG | SKIP | Gemini doesn't expose this. Only relevant for SD/FLUX. |
| 3.7 | Output format | DONE | PNG/JPG/WEBP selector in QuickControls. Server-side Pillow conversion before S3 upload. |

**Backend files:** `studio/schemas.py` (aspect_ratio validation), `studio/gemini_image.py`
**Frontend files:** `QuickControls.tsx`

---

## 4. Canvas & Editing

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 4.1 | Undo/redo | DONE | `studioCanvasStore.ts` — edit stack with undo/redo. Ctrl+Z/Shift+Z. |
| 4.2 | Crop & resize | DONE | `CropOverlay.tsx` — 8 handles, aspect lock, presets (Free/1:1/16:9/9:16). |
| 4.3 | Flip H/V | DONE | AdjustTab buttons. CSS scaleX(-1)/scaleY(-1). |
| 4.4 | Rotate | DONE | AdjustTab — 90° CW/CCW snaps. CSS rotate(). |
| 4.5 | B/C/S sliders | DONE | AdjustTab — Brightness/Contrast/Saturation (-100 to +100). CSS filters. |
| 4.6 | BG removal | DONE | `POST /studio/generations/{id}/remove-bg`. Gemini-powered. Button in AdjustTab. |
| 4.7 | BG replace | NOT STARTED | Solid color, gradient, or AI environment. Needs masking + compositing. |
| 4.8 | Object eraser | NOT STARTED | Brush to remove elements. Needs inpainting support. |
| 4.9 | Layer system | SKIP | Very complex. Not needed for campaign asset generation. |
| 4.10 | Text overlay | NOT STARTED | Font/size/color/position. Useful for mockups. |
| 4.11 | Sticker/watermark | NOT STARTED | Brand logo placement. Ties to brand kit feature. |
| 4.12 | Zoom & pan | DONE | Mouse wheel zoom (0.25x–3x), click-drag pan, keyboard shortcuts (+/-/0/1/2). |

**Backend files:** `studio/router.py` (remove-bg endpoint)
**Frontend files:** `AdjustTab.tsx`, `CropOverlay.tsx`, `StudioCanvas.tsx`, `studioCanvasStore.ts`

---

## 5. AI-Assisted Editing

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5.1 | Smart crop | NOT STARTED | AI detects subject → suggests optimal crop. |
| 5.2 | Style transfer | NOT STARTED | Apply look of reference to output. Model-dependent. |
| 5.3 | Upscale 2×/4× | DONE | `POST /studio/generations/{id}/upscale` with scale=2 or 4. Pillow LANCZOS resampling. 2x/4x buttons on canvas toolbar. |
| 5.4 | Auto-enhance | DONE | `POST /studio/generations/{id}/enhance`. Gemini image-to-image with color grading prompt. "Auto mejorar" button in AdjustTab (amber). |
| 5.5 | Describe image | DONE | `POST /studio/describe-image` → Claude Haiku vision. Returns description + suggested_prompt. Eye button on canvas toolbar copies prompt to clipboard. |
| 5.6 | Variation from selection | NOT STARTED | Box select region → regenerate just that area. Needs inpainting. |
| 5.7 | Face/subject consistency | SKIP | Requires specialized models (IP-Adapter, etc). Very complex. |

**Implementation notes:** 5.3 and 5.5 are the highest-value items here. Both can use existing Claude/Gemini APIs.

---

## 6. Asset & Project Management

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 6.1 | Asset library per project | DONE | `studio_generations` table, `GET /studio/project/{pid}/generations`. |
| 6.2 | Favorites | DONE | `is_favorite` column, `PATCH .../favorite` toggle, heart icon in GalleryTab. |
| 6.3 | Tag system | DONE | Tags stored in `params.tags` JSON (no migration). `PUT /studio/generations/{id}/tags`. Tag editor in info overlay, tag badges in gallery, search includes tags. |
| 6.4 | Search by prompt | DONE | Client-side filter in GalleryTab (case-insensitive prompt match). |
| 6.5 | Folder per project | DONE | Generations are scoped to project_id. S3 keys include project path. |
| 6.6 | Bulk select + actions | DONE | GalleryTab "Seleccionar" toggle → checkboxes, select all, bulk delete, bulk download ZIP. |
| 6.7 | Metadata panel | DONE | Info overlay on canvas — prompt, style, ratio, status, timestamp, export ID, model name. |
| 6.8 | Duplicate/re-generate | DONE | `loadFromGeneration()` pre-fills GenerateTab with prompt + params. |
| 6.9 | Version tree | SKIP | Complex UI. Not needed for current workflow. |

**Backend files:** `studio/models.py`, `studio/service.py`
**Frontend files:** `GalleryTab.tsx`, `GalleryImageCard.tsx`, `StudioCanvas.tsx` (info overlay)

---

## 7. Collaboration

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 7.1 | Share with team | NOT STARTED | Internal CRM link per image. Relatively simple. |
| 7.2 | Comment per image | NOT STARTED | Comment model exists for pipeline scenes — could reuse pattern. |
| 7.3 | Approval workflow | PARTIAL | Only favorite/unfavorite. No draft→review→approved states. |
| 7.4 | Request revision | NOT STARTED | Assign comment + reassign. Exists for video scenes already. |
| 7.5 | Lock approved | NOT STARTED | Prevent editing on approved images. |
| 7.6 | Activity log | NOT STARTED | Who generated, edited, approved + timestamps. |

**Notes:** Pipeline module has full comment + revision + approval patterns. Can adapt.

---

## 8. Export & Delivery

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 8.1 | Download single | DONE | Download button on canvas toolbar. Downloads with current output format (PNG/JPG/WEBP). |
| 8.2 | Bulk download ZIP | DONE | `POST /studio/generations/bulk-download`. Server-side ZIP with zipfile. Download button in GalleryTab bulk mode. Max 50 images. |
| 8.3 | Export to CRM | DONE | `POST /studio/generations/{id}/export`. Creates media_file record. |
| 8.4 | Push to pipeline | DONE | `POST /studio/generations/{id}/push-to-pipeline`. Creates PipelineAsset reference from studio image. |
| 8.5 | Copy CDN URL | DONE | Link2 icon button on canvas toolbar. Copies presigned S3 URL to clipboard. |
| 8.6 | Export with metadata | NOT STARTED | Embed EXIF/XMP with prompt, model, params. |
| 8.7 | Resize on export | DONE | `POST /studio/generations/{id}/resize` with width/height/format. Pillow LANCZOS. Returns binary download. Max 8192px. |
| 8.8 | Batch export naming | NOT STARTED | `{client}_{date}_{order}` naming convention. |

**Backend files:** `studio/router.py` (export endpoint)
**Frontend files:** `StudioCanvas.tsx` (has download-related UI stubs)

---

## 9. Brand & Compliance

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 9.1 | Brand kit upload | NOT STARTED | Logo, palette, typography. New model + UI. |
| 9.2 | Brand compliance check | NOT STARTED | Claude scans output vs brand kit. Needs 9.1 first. |
| 9.3 | Color palette extractor | DONE | Client-side canvas API. Palette button on toolbar extracts 5 dominant colors. Swatch overlay with click-to-copy hex. |
| 9.4 | Restricted content filter | NOT STARTED | Block outputs violating guidelines. |
| 9.5 | Watermark options | NOT STARTED | Draft watermark on unapproved, removed on approval. |

**Notes:** Entire category is enterprise-tier. Low priority for MVP.

---

## 10. Usage & Cost Controls

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 10.1 | Per-user quota | NOT STARTED | Configurable by admin. Needs counter + middleware. |
| 10.2 | Cost estimate | DONE | Shows model price_hint × batch_size in QuickControls bar. Uses per-model price_hint from `/studio/models`. |
| 10.3 | Usage dashboard | NOT STARTED | Generations per user/project/period. Aggregation queries. |
| 10.4 | Model cost comparison | PARTIAL | Price hints visible in model dropdown. No side-by-side comparison UI. |
| 10.5 | Admin hard limits | NOT STARTED | Max resolution, max batch, model access per role. |

**Notes:** Important for production. 10.1 and 10.3 should come with multi-model.

---

## Summary Scorecard

| Category | Total | Done | Partial | Not Started | Skip |
|----------|-------|------|---------|-------------|------|
| 1. Generation Core | 8 | 4 | 1 | 1 | 2 |
| 2. Prompt Tooling | 8 | 6 | 0 | 1 | 1 |
| 3. Gen Parameters | 7 | 2 | 0 | 1 | 4 |
| 4. Canvas & Editing | 12 | 7 | 0 | 3 | 2 |
| 5. AI-Assisted Editing | 7 | 3 | 0 | 2 | 2 |
| 6. Asset Management | 9 | 8 | 0 | 0 | 1 |
| 7. Collaboration | 6 | 0 | 1 | 5 | 0 |
| 8. Export & Delivery | 8 | 6 | 0 | 2 | 0 |
| 9. Brand & Compliance | 5 | 1 | 0 | 4 | 0 |
| 10. Usage & Cost | 5 | 1 | 1 | 3 | 0 |
| **TOTAL** | **75** | **39** | **3** | **21** | **12** |

**Implementation rate: 52% done, 4% partial, 28% pending, 16% skipped**

---

## Recommended Implementation Priority

### Tier 1 — High Value, Low-Medium Effort (next sprint)

These features have the highest user impact relative to effort:

| Feature | Why | Effort | Status |
|---------|-----|--------|--------|
| ~~1.5 Multi-model selector~~ | 5 Gemini/Imagen models with price hints | Medium | **DONE** |
| ~~1.7 Batch generation (2-4)~~ | 1×/2×/4× with Imagen batch + Gemini loop | Low | **DONE** |
| ~~3.1 More aspect ratios~~ | 6 ratios: 1:1, 4:5, 3:4, 16:9, 9:16, 3:2 | Trivial | **DONE** |
| ~~3.7 Output format~~ | PNG/JPG/WEBP with server-side Pillow conversion | Low | **DONE** |
| ~~5.5 Describe image~~ | Claude Haiku vision → description + prompt | Low | **DONE** |
| ~~5.3 Upscale 2×/4×~~ | Pillow LANCZOS 2x/4x resampling | Medium | **DONE** |
| ~~8.1 Download with format~~ | Download button with format selection | Low | **DONE** |
| ~~8.5 Copy CDN URL~~ | Clipboard copy of presigned URL | Trivial | **DONE** |

### Tier 2 — Medium Value, Medium Effort (sprint after)

| Feature | Why | Effort | Status |
|---------|-----|--------|--------|
| **1.8 Draft vs Production** | Fast preview (Flash) before full render (Imagen 4). Needs 1.5 first. | Medium | PARTIAL |
| ~~5.4 Auto-enhance~~ | Gemini image-to-image color grading | Medium | **DONE** |
| ~~6.3 Tag system~~ | Tags in params JSON + editor in info overlay | Medium | **DONE** |
| ~~6.6 Bulk select + actions~~ | Multi-select + bulk delete/download in GalleryTab | Medium | **DONE** |
| **7.3 Approval workflow** | Full draft→review→approved states. New status column + UI. | Medium | PARTIAL |
| ~~8.2 Bulk download ZIP~~ | Server-side ZIP + download from gallery bulk mode | Medium | **DONE** |
| **10.1 Per-user quota** | Counter middleware. Essential before going live. | Medium | PENDING |
| **10.3 Usage dashboard** | Simple aggregation page. Admin-only. | Medium | PENDING |

### Tier 3 — Nice to Have (future)

| Feature | Why | Effort |
|---------|-----|--------|
| 2.4 Prompt builder UI | Guided fields. Good for non-technical users. | Medium |
| 4.7 BG replace | Solid/gradient/AI environment. Needs masking. | High |
| 4.10 Text overlay | Mockup text placement. Canvas API. | High |
| 5.1 Smart crop | AI subject detection + optimal crop suggestion. | Medium |
| 7.2 Comments per image | Reuse pipeline comment pattern. | Medium |
| 7.6 Activity log | Audit trail. New table. | Medium |
| ~~8.4 Push to pipeline ref~~ | Studio image → PipelineAsset reference | Low | **DONE** |
| ~~8.7 Resize on export~~ | Pillow LANCZOS resize with format choice | Low | **DONE** |
| ~~9.3 Color palette extractor~~ | Client-side canvas dominant color extraction | Low | **DONE** |

### Tier 4 — Enterprise / Skip

| Feature | Reason |
|---------|--------|
| 1.3/1.4 Inpainting/Outpainting | Complex mask UI + model support needed |
| 1.6 Model comparison | Needs multi-model first, then split-canvas UI |
| 4.9 Layer system | Full editor territory — out of scope |
| 4.11 Sticker/watermark | Needs brand kit |
| 5.7 Face consistency | Specialized models (IP-Adapter) |
| 6.9 Version tree | Complex graph UI |
| 9.x Brand & Compliance | Enterprise tier features |
| 10.4/10.5 Cost comparison / Admin limits | Needs multi-model + admin panel |

---

## Architecture Notes

### Current Image Generation Flow
```
User prompt → GenerateTab/UnifiedChat
  → studioAiStore.sendMessage()
  → POST /studio/image/generate (model, batch_size, output_format)
  → GeminiImageService.generate() (Gemini native or Imagen predict)
  → _convert_image_format() (Pillow: PNG→JPG/WEBP if needed)
  → Upload to S3
  → Return StudioGeneration record(s) (1 per batch item)
  → Update studioStore.generations
  → Display on StudioCanvas
```

### Available Models
```
gemini-2.5-flash-image     — Gemini native, editing, ~$0.04
gemini-3.1-flash-image     — Gemini native, editing, ~$0.05
imagen-4.0-fast-generate   — Imagen predict, batch 4, $0.02
imagen-4.0-generate        — Imagen predict, batch 4, $0.04
imagen-4.0-ultra-generate  — Imagen predict, batch 4, $0.06
```

### Current AI Chat Flow
```
User message → UnifiedChat
  → studioAiStore.sendHubMessage()
  → POST /studio/chat
  → StudioChatAgent.chat() (Claude Sonnet 4.5)
  → Returns {message, cards[], action?, quick_actions[]}
  → Display in chat + execute action (mode transition)
```

### Current Video Pipeline Flow
```
Brief input → VideoTab
  → pipelineStore.startPipeline()
  → POST /pipeline/start
  → DirectorAgent.analyze_brief() (Claude Sonnet 4.5)
  → Returns scene plan + style guide
  → User reviews/edits scenes
  → POST /pipeline/{id}/generate (bulk Veo 3.1 jobs)
  → WebSocket updates → scene_status/complete/failed events
  → User approves scenes
  → POST /pipeline/{id}/export → S3 upload → CRM media
```

### Key Models & Tables
```
studio_generations    — Image/video assets (soft-deletable, favoritable)
studio_sessions       — Versioning groups for generations
studio_prompt_templates — Reusable prompts (personal + shared)
creative_pipelines    — Video pipeline projects
pipeline_scenes       — Individual video scenes with revision history
pipeline_assets       — Reference images for pipelines
pipeline_comments     — Editor/AI comments on scenes
```
