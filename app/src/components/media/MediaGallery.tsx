/**
 * Reusable media gallery — grid of files with preview, delete, and fullscreen.
 * Usage: <MediaGallery entityType="project" entityId={5} />
 */

import { useCallback, useEffect, useState } from 'react'
import {
  FileIcon, Image as ImageIcon, FileText, Trash2, X,
  Download, Loader2, FolderOpen, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { mediaApi, formatFileSize, isImage, isPdf, downloadFile, type MediaFile } from '@/lib/media'
import { MediaUploader } from './MediaUploader'

interface Props {
  entityType?: string
  entityId?: number
  folder?: string
  editable?: boolean
  className?: string
}

export function MediaGallery({
  entityType,
  entityId,
  folder,
  editable = true,
  className,
}: Props) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await mediaApi.list({ entity_type: entityType, entity_id: entityId, folder })
      setFiles(res.data)
    } catch {
      toast.error('Error al cargar archivos')
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, folder])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await mediaApi.delete(id)
      setFiles((prev) => prev.filter((f) => f.id !== id))
      setConfirmDeleteId(null)
      toast.success('Archivo eliminado')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const handleUploaded = (newFiles: MediaFile[]) => {
    setFiles((prev) => [...newFiles, ...prev])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Uploader */}
      {editable && (
        <MediaUploader
          folder={folder || 'general'}
          entityType={entityType}
          entityId={entityId}
          onUploaded={handleUploaded}
        />
      )}

      {/* Empty state */}
      {files.length === 0 && !editable && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Sin archivos</p>
        </div>
      )}

      {/* Gallery grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all"
            >
              {/* Preview area */}
              <button
                onClick={() => setPreviewFile(file)}
                className="w-full aspect-square flex items-center justify-center bg-muted/30 cursor-pointer"
              >
                {isImage(file.mime) ? (
                  <img
                    src={file.url}
                    alt={file.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : isPdf(file.mime) ? (
                  <FileText className="h-10 w-10 text-red-400" />
                ) : (
                  <FileIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </button>

              {/* Hover actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  title="Ver"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => downloadFile(file.url, file.nombre)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  title="Descargar"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {editable && (
                  <button
                    onClick={() => setConfirmDeleteId(file.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* File info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate" title={file.nombre}>
                  {file.nombre}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(file.tamano)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Eliminar archivo</h3>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen preview modal */}
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
          <div
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isImage(previewFile.mime) ? (
              <img
                src={previewFile.url}
                alt={previewFile.nombre}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            ) : isPdf(previewFile.mime) ? (
              <iframe
                src={previewFile.url}
                title={previewFile.nombre}
                className="w-[80vw] h-[85vh] rounded-lg bg-white"
              />
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
