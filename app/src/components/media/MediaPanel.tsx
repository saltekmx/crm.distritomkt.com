/**
 * Media panel — full media browser for the AI sidebar.
 * Shows all files organized by folder, with search, filter, usage bar, and preview.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  FileIcon, FileText, Trash2, X, Download, Loader2,
  FolderOpen, Eye, Search, Image as ImageIcon, File as GenericFile,
  Upload, HardDrive, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  mediaApi, formatFileSize, isImage, isPdf, downloadFile,
  FOLDER_LABELS, type MediaFile, type StorageUsage,
} from '@/lib/media'

interface Props {
  onSelectFile?: (file: MediaFile) => void
  compact?: boolean
}

type FolderFilter = 'all' | 'ai' | 'projects' | 'clients' | 'general'
type TypeFilter = 'all' | 'image' | 'pdf' | 'file'

export function MediaPanel({ onSelectFile, compact = false }: Props) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fetchFiles = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (folderFilter !== 'all') params.folder = folderFilter
      if (typeFilter !== 'all') params.tipo = typeFilter
      if (search.trim()) params.buscar = search.trim()
      const res = await mediaApi.list(params)
      setFiles(res.data)
    } catch {
      toast.error('Error al cargar archivos')
    } finally {
      setLoading(false)
    }
  }, [folderFilter, typeFilter, search])

  const fetchUsage = useCallback(async () => {
    try {
      const res = await mediaApi.usage()
      setUsage(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const handleUpload = async (fileList: FileList) => {
    const filesToUpload = Array.from(fileList)
    if (filesToUpload.length === 0) return
    setIsUploading(true)
    try {
      const folder = folderFilter === 'all' ? 'general' : folderFilter
      const res = await mediaApi.upload(filesToUpload, { folder })
      setFiles((prev) => [...res.data, ...prev])
      fetchUsage()
      toast.success(`${res.data.length} archivo${res.data.length > 1 ? 's' : ''} subido${res.data.length > 1 ? 's' : ''}`)
    } catch (err: any) {
      const msg = err?.response?.data?.detalle || err?.message || 'Error al subir'
      toast.error(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await mediaApi.delete(id)
      setFiles((prev) => prev.filter((f) => f.id !== id))
      setConfirmDeleteId(null)
      fetchUsage()
      toast.success('Archivo eliminado')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const usagePercent = usage ? Math.min(100, (usage.used / usage.limit) * 100) : 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Storage bar */}
      {usage && (
        <div className="px-3 pt-3 pb-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatFileSize(usage.used)} de {formatFileSize(usage.limit)}
            </span>
            <span>{usage.count} archivos</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                usagePercent > 90 ? 'bg-destructive' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-primary'
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Search & filters */}
      <div className="px-3 pb-2 space-y-2">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar archivos..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Folder tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {(Object.keys(FOLDER_LABELS) as FolderFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setFolderFilter(key)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer',
                folderFilter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {FOLDER_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          {([
            { key: 'all' as TypeFilter, label: 'Todo', icon: GenericFile },
            { key: 'image' as TypeFilter, label: 'Imágenes', icon: ImageIcon },
            { key: 'pdf' as TypeFilter, label: 'PDFs', icon: FileText },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer',
                typeFilter === key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload drop zone */}
      <div className="px-3 pb-2">
        <label
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 transition-all cursor-pointer',
            isUploading
              ? 'border-primary/30 bg-primary/5 pointer-events-none'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          )}
        >
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            disabled={isUploading}
          />
          {isUploading ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Upload className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {isUploading ? 'Subiendo...' : 'Subir archivos'}
          </span>
        </label>
      </div>

      {/* File grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {search ? 'Sin resultados' : 'Sin archivos'}
            </p>
          </div>
        ) : (
          <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-2')}>
            {files.map((file) => (
              <div
                key={file.id}
                className="group relative rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-all"
              >
                {/* Thumbnail */}
                <button
                  onClick={() => onSelectFile ? onSelectFile(file) : setPreviewFile(file)}
                  className={cn('w-full flex items-center justify-center bg-muted/20 cursor-pointer', compact ? 'aspect-[4/3]' : 'aspect-square')}
                >
                  {isImage(file.mime) ? (
                    <img src={file.url} alt={file.nombre} className="w-full h-full object-cover" />
                  ) : isPdf(file.mime) ? (
                    <FileText className={cn(compact ? 'h-5 w-5' : 'h-8 w-8', 'text-red-400')} />
                  ) : (
                    <FileIcon className={cn(compact ? 'h-5 w-5' : 'h-8 w-8', 'text-muted-foreground')} />
                  )}
                </button>

                {/* Hover overlay */}
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onSelectFile ? (
                    <button
                      onClick={() => onSelectFile(file)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-primary text-primary-foreground hover:opacity-90 transition-colors cursor-pointer"
                      title="Seleccionar"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(file.id)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* Folder badge */}
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-medium">
                    {FOLDER_LABELS[file.carpeta] || file.carpeta}
                  </span>
                </div>

                {/* Info */}
                <div className="p-1.5">
                  <p className="text-[11px] font-medium truncate" title={file.nombre}>{file.nombre}</p>
                  <p className="text-[9px] text-muted-foreground">{formatFileSize(file.tamano)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {confirmDeleteId !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-xl">
          <div className="bg-card rounded-xl border border-border p-5 max-w-[260px] w-full mx-4 space-y-3">
            <h3 className="font-semibold text-sm">Eliminar archivo</h3>
            <p className="text-xs text-muted-foreground">
              ¿Estás seguro? El archivo se eliminará permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors cursor-pointer"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer"
              >
                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen preview */}
      {previewFile && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={() => setPreviewFile(null)}
        >
          <button
            onClick={() => setPreviewFile(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer z-10"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {isImage(previewFile.mime) ? (
              <img src={previewFile.url} alt={previewFile.nombre} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            ) : isPdf(previewFile.mime) ? (
              <iframe src={previewFile.url} title={previewFile.nombre} className="w-[80vw] h-[85vh] rounded-lg bg-white" />
            ) : (
              <div className="bg-card rounded-xl p-8 text-center space-y-3">
                <FileIcon className="h-16 w-16 text-muted-foreground mx-auto" />
                <p className="font-medium">{previewFile.nombre}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(previewFile.tamano)}</p>
                <button
                  onClick={() => downloadFile(previewFile.url, previewFile.nombre)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
