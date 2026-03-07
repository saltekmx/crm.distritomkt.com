export interface CifData {
  rfc: string
  razon_social: string
  nombre_comercial: string
  regimen_fiscal: string
  calle: string
  numero_exterior: string
  numero_interior: string
  colonia: string
  codigo_postal: string
  ciudad: string
  estado: string
}

/**
 * Labels from the CIF PDF mapped to result fields.
 * Handles both Persona Moral and Persona Física.
 * Reference: https://github.com/phpcfdi/csf-scraper
 */
const FIELD_LABELS: Array<{ label: string; field: string }> = [
  // Identification
  { label: 'RFC:', field: 'rfc' },
  { label: 'CURP:', field: '_curp' },
  // Persona Moral
  { label: 'Denominación/Razón Social:', field: 'razon_social' },
  { label: 'Denominación o Razón Social:', field: 'razon_social' },
  { label: 'Régimen de capital:', field: '_regimen_capital' },
  { label: 'Régimen Capital:', field: '_regimen_capital' },
  // Persona Física
  { label: 'Nombre (s):', field: '_nombre' },
  { label: 'Nombre(s):', field: '_nombre' },
  { label: 'Primer Apellido:', field: '_primer_apellido' },
  { label: 'Segundo Apellido:', field: '_segundo_apellido' },
  // Shared
  { label: 'Nombre Comercial:', field: 'nombre_comercial' },
  { label: 'Fecha inicio de operaciones:', field: '_fecha_inicio' },
  { label: 'Fecha de Inicio de operaciones:', field: '_fecha_inicio' },
  { label: 'Estatus en el padrón:', field: '_estatus' },
  { label: 'Fecha de último cambio de estado:', field: '_fecha_cambio' },
  // Address
  { label: 'Código Postal:', field: 'codigo_postal' },
  { label: 'CP:', field: 'codigo_postal' },
  { label: 'Tipo de Vialidad:', field: '_tipo_vialidad' },
  { label: 'Nombre de Vialidad:', field: '_nombre_vialidad' },
  { label: 'Número Exterior:', field: 'numero_exterior' },
  { label: 'Número Interior:', field: 'numero_interior' },
  { label: 'Nombre de la Colonia:', field: 'colonia' },
  { label: 'Colonia:', field: 'colonia' },
  { label: 'Nombre del Municipio o Demarcación Territorial:', field: 'ciudad' },
  { label: 'Municipio o delegación:', field: 'ciudad' },
  { label: 'Nombre de la Entidad Federativa:', field: 'estado' },
  { label: 'Entidad Federativa:', field: 'estado' },
  { label: 'Nombre de la Localidad:', field: '_localidad' },
  { label: 'Localidad:', field: '_localidad' },
  { label: 'Entre Calle:', field: '_entre_calle' },
  { label: 'Y Calle:', field: '_y_calle' },
]

// All label strings for value-trimming (cut value before the next label)
const ALL_LABELS = FIELD_LABELS.map((f) => f.label)

export async function parseCifPdf(file: File): Promise<CifData> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Extract text items with positions
  const allItems: Array<{ str: string; x: number; y: number }> = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageYOffset = (i - 1) * 100000
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        allItems.push({
          str: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(pageYOffset + item.transform[5]),
        })
      }
    }
  }

  // Group items into rows by Y-coordinate (tolerance 5px)
  const rows: Map<number, typeof allItems> = new Map()
  for (const item of allItems) {
    let foundRow = false
    for (const [rowY] of rows) {
      if (Math.abs(item.y - rowY) <= 5) {
        rows.get(rowY)!.push(item)
        foundRow = true
        break
      }
    }
    if (!foundRow) {
      rows.set(item.y, [item])
    }
  }

  // Sort rows by Y (descending = top-first) and items within rows by X
  const sortedRows = [...rows.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, items]) => {
      items.sort((a, b) => a.x - b.x)
      return items.map((it) => it.str).join(' ')
    })

  // Parse label→value pairs from rows
  const raw: Record<string, string> = {}

  for (const rowText of sortedRows) {
    for (const { label, field } of FIELD_LABELS) {
      if (raw[field]) continue // already found

      const idx = rowText.indexOf(label)
      if (idx === -1) continue

      // Value = everything after the label, trimmed before any other label
      let value = rowText.slice(idx + label.length).trim()

      // Cut before any other known label in the remainder
      let cutAt = value.length
      for (const otherLabel of ALL_LABELS) {
        if (otherLabel === label) continue
        const otherIdx = value.indexOf(otherLabel)
        if (otherIdx >= 0 && otherIdx < cutAt) {
          cutAt = otherIdx
        }
      }
      value = value.slice(0, cutAt).trim()

      if (value) {
        raw[field] = value
      }
    }
  }

  // Extract régimen fiscal from the "Regímenes" section
  let regimen_fiscal = ''
  let inRegimenes = false
  for (const rowText of sortedRows) {
    if (rowText.includes('Regímenes') || rowText.includes('Regimenes')) {
      inRegimenes = true
      continue
    }
    if (inRegimenes) {
      // Skip header row
      if (rowText.includes('Fecha Inicio') && rowText.includes('Fecha Fin')) continue
      // The regime name row has a date (dd/mm/yyyy)
      if (rowText.match(/\d{2}\/\d{2}\/\d{4}/)) {
        const dateIdx = rowText.search(/\d{2}\/\d{2}\/\d{4}/)
        regimen_fiscal = rowText.slice(0, dateIdx).trim().toUpperCase()
        break
      }
      if (rowText.includes('Obligaciones') || rowText.includes('Actividades')) break
    }
  }

  // Build razón social: for persona física, combine nombre + apellidos
  let razon_social = raw.razon_social ?? ''
  if (!razon_social) {
    const nombre = raw._nombre ?? ''
    const primerApellido = raw._primer_apellido ?? ''
    const segundoApellido = raw._segundo_apellido ?? ''
    if (nombre || primerApellido) {
      razon_social = [nombre, primerApellido, segundoApellido].filter(Boolean).join(' ')
    }
  }

  // Build calle: abbreviate tipo vialidad + nombre vialidad
  const tipoVialidad = raw._tipo_vialidad ?? ''
  const nombreVialidad = raw._nombre_vialidad ?? ''
  // "AVENIDA (AV.)" → "AV.", "CALLE" → "CALLE", "BOULEVARD (BLVD.)" → "BLVD."
  let callePrefix = tipoVialidad
  const abbrMatch = tipoVialidad.match(/\(([^)]+)\)/)
  if (abbrMatch) {
    callePrefix = abbrMatch[1]
  }
  const calle = [callePrefix, nombreVialidad].filter(Boolean).join(' ')

  return {
    rfc: (raw.rfc ?? '').toUpperCase(),
    razon_social: razon_social.toUpperCase(),
    nombre_comercial: (raw.nombre_comercial ?? '').toUpperCase(),
    regimen_fiscal,
    calle: calle.toUpperCase(),
    numero_exterior: raw.numero_exterior ?? '',
    numero_interior: raw.numero_interior ?? '',
    colonia: (raw.colonia ?? '').toUpperCase(),
    codigo_postal: raw.codigo_postal ?? '',
    ciudad: (raw.ciudad ?? '').toUpperCase(),
    estado: (raw.estado ?? '').toUpperCase(),
  }
}
