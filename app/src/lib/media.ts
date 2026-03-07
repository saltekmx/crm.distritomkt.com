/**
 * Centralized media library — upload, list, delete files via /api/v1/media.
 * Reusable across AI chat, projects, clients, etc.
 */

import { api } from '@/services/api'

export interface MediaFile {
  id: number
  key: string
  nombre: string
  mime: string
  tamano: number
  tipo: 'image' | 'pdf' | 'file'
  carpeta: string
  entidad_tipo: string | null
  entidad_id: number | null
  subido_por: number
  url: string
  creado_en: string
}

export interface StorageUsage {
  used: number
  limit: number
  count: number
}

export interface MediaFolder {
  id: number
  nombre: string
  slug: string
  color: string
  es_sistema: boolean
  padre_id: number | null
  archivos: number
  hijos: MediaFolder[]
  creado_en: string
}

export const mediaApi = {
  upload: (
    files: File[],
    opts?: { folder?: string; entity_type?: string; entity_id?: number },
  ) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    const params: Record<string, string | number> = {}
    if (opts?.folder) params.folder = opts.folder
    if (opts?.entity_type) params.entity_type = opts.entity_type
    if (opts?.entity_id) params.entity_id = opts.entity_id
    return api.post<MediaFile[]>('/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    })
  },

  list: (params?: {
    entity_type?: string
    entity_id?: number
    folder?: string
    tipo?: string
    buscar?: string
  }) => api.get<MediaFile[]>('/media', { params }),

  get: (id: number) => api.get<MediaFile>(`/media/${id}`),

  usage: () => api.get<StorageUsage>('/media/usage'),

  link: (id: number, entityType: string, entityId: number) =>
    api.patch<MediaFile>(`/media/${id}/vincular`, null, {
      params: { entity_type: entityType, entity_id: entityId },
    }),

  delete: (id: number) => api.delete(`/media/${id}`),

  move: (id: number, folderSlug: string) =>
    api.patch<MediaFile>(`/media/${id}/mover`, null, { params: { carpeta: folderSlug } }),

  // Folders
  folders: () => api.get<MediaFolder[]>('/media/folders'),

  createFolder: (nombre: string, color?: string, padre_id?: number | null) =>
    api.post<MediaFolder>('/media/folders', { nombre, color, padre_id }),

  updateFolder: (id: number, data: { nombre?: string; color?: string }) =>
    api.patch<MediaFolder>(`/media/folders/${id}`, data),

  deleteFolder: (id: number) => api.delete(`/media/folders/${id}`),
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function isImage(mime: string): boolean {
  return mime.startsWith('image/')
}

export function isPdf(mime: string): boolean {
  return mime === 'application/pdf'
}

const TEXT_MIMES = new Set([
  'text/plain', 'text/html', 'text/css', 'text/csv', 'text/xml', 'text/markdown',
  'application/json', 'application/xml', 'application/javascript',
  'application/x-yaml', 'application/x-sh',
])

const TEXT_EXTS = new Set([
  '.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts',
  '.jsx', '.tsx', '.yml', '.yaml', '.sh', '.env', '.log', '.py', '.rb',
  '.go', '.rs', '.sql', '.toml', '.ini', '.cfg',
])

export function isText(mime: string, filename?: string): boolean {
  if (mime.startsWith('text/')) return true
  if (TEXT_MIMES.has(mime)) return true
  if (filename) {
    const dotIdx = filename.lastIndexOf('.')
    const ext = dotIdx >= 0 ? filename.slice(dotIdx).toLowerCase() : ''
    if (TEXT_EXTS.has(ext)) return true
  }
  return false
}

export function isPreviewable(mime: string, filename?: string): boolean {
  return isImage(mime) || isPdf(mime) || isText(mime, filename)
}

/** Force-download a file by fetching the blob and triggering a save dialog with the original filename. */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

/** Build a tree from the flat folder list returned by the API. */
export function buildFolderTree(folders: MediaFolder[]): MediaFolder[] {
  const map = new Map<number, MediaFolder>()
  const roots: MediaFolder[] = []
  // Clone folders with empty hijos
  for (const f of folders) {
    map.set(f.id, { ...f, hijos: [] })
  }
  for (const f of map.values()) {
    if (f.padre_id && map.has(f.padre_id)) {
      map.get(f.padre_id)!.hijos.push(f)
    } else {
      roots.push(f)
    }
  }
  return roots
}

export const FOLDER_LABELS: Record<string, string> = {
  all: 'Todos',
  ai: 'AI Chat',
  projects: 'Proyectos',
  clients: 'Clientes',
  general: 'General',
}
