// Shared pipeline constants used across Studio video components

export const MAX_SCENES = 8

export const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pendiente', color: 'text-zinc-400', dot: 'bg-zinc-500' },
  generating: { label: 'Generando', color: 'text-amber-400', dot: 'bg-amber-500' },
  complete: { label: 'Completo', color: 'text-blue-400', dot: 'bg-blue-500' },
  failed: { label: 'Error', color: 'text-red-400', dot: 'bg-red-500' },
  approved: { label: 'Aprobado', color: 'text-green-400', dot: 'bg-green-500' },
}
