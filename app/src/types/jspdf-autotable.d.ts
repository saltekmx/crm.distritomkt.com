declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'
  interface AutoTableOptions {
    startY?: number
    margin?: { left?: number; right?: number; top?: number; bottom?: number }
    head?: unknown[][]
    body?: unknown[][]
    styles?: Record<string, unknown>
    headStyles?: Record<string, unknown>
    columnStyles?: Record<number, Record<string, unknown>>
    [key: string]: unknown
  }
  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void
}
