# Changelog

## [2026-03-19]

### Added
- **Cotizaciones tab**: full CRUD with cards, editor, auto-save, PDF preview (Eye button), download PDF
- **Global quotation codes**: `COT-0001`, `COT-0002`, etc. shown on cards and PDF
- **Category subtotals** in cotización editor, HTML preview, and PDF
- **Fee de agencia button** per category: calculates % fee on category subtotal and adds it as an item
- **Default terms text**: "La presente cotización tiene una validez de 15 días, no incluye IVA y se presenta en pesos mexicanos."
- **Duplicate row** button in costeo (copy icon next to delete)
- **Confirmation modal** when sending from costeo to cotización: review items before creating
- **Catalog images**: side-by-side layout (image left 50%, title + WYSIWYG editor right 50%)
- **Rich text in catalog descriptions**: bold, italic, lists rendered in HTML preview and PDF
- **Project code in URL**: `/proyectos/DMKT-0001` instead of `/proyectos/2`
- **Project code badge** shown next to project name in detail page
- **Responsable column** in projects table
- **Activity tab**: icons and colors per event type (created, status_change, propuesta, costeo, cotización)
- **Auto-refresh timeline** after changes in any tab
- **Teléfono field** in costeo send-to-supplier form (replaced WhatsApp)
- Field `material` renamed to `concepto` with multi-line textarea support
- `DeferredTextarea`, `DeferredNumberInput`, `DeferredCurrencyInput` for zero-rerender typing
- `normalizeMaterials()` for backwards compatibility with old `material` field in DB

### Changed
- Removed descuento (discount) from cotizaciones
- Removed IVA from cotizaciones — only Subtotal shown
- Removed vigencia (validity days) input and display from cotizaciones
- "Total" renamed to "Subtotal" in cotización editor, preview, and PDF
- WhatsApp button removed from costeo send-to-supplier
- Catalog grid config simplified to "Per page" (rows only)
- Status badges: `whitespace-nowrap`, compact padding — no line break on "En proceso"
- Projects table: tighter spacing, consistent borders, smaller text

### Fixed
- Delete cotización no longer enters editor or fires auto-save PATCH errors
- S3 image URLs auto-refreshed when opening cotización editor (expired presigned URLs)
- PDF logo maintains real proportions (loads image dimensions)
- PDF catalog: no overlap when text is longer than image (render-then-measure approach)
- AI generate fills `concepto` field correctly (normalize `material` → `concepto`)
- React strict mode no longer causes double cotización creation
- Duplicate tiptap Link extension warning removed
- Button-inside-button HTML nesting fixed in catalog toggle
- setState-during-render fixed in QuotesTab
- All TypeScript strict errors resolved for Cloudflare Pages build
