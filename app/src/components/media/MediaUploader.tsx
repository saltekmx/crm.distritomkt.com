/**
 * Reusable drag-and-drop file uploader.
 * Usage: <MediaUploader folder="projects" entityType="project" entityId={5} onUploaded={refresh} />
 */

import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { mediaApi, type MediaFile } from '@/lib/media'

interface Props {
  folder?: string
  entityType?: string
  entityId?: number
  onUploaded?: (files: MediaFile[]) => void
  className?: string
  accept?: string
  maxFiles?: number
}

export function MediaUploader({
  folder = 'general',
  entityType,
  entityId,
  onUploaded,
  className,
  accept,
  maxFiles = 10,
}: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).slice(0, maxFiles)
    if (files.length === 0) return

    setIsUploading(true)
    try {
      const res = await mediaApi.upload(files, {
        folder,
        entity_type: entityType,
        entity_id: entityId,
      })
      onUploaded?.(res.data)
      toast.success(`${res.data.length} archivo${res.data.length > 1 ? 's' : ''} subido${res.data.length > 1 ? 's' : ''}`)
    } catch (err: any) {
      const msg = err?.response?.data?.detalle || err?.message || 'Error al subir archivos'
      toast.error(msg)
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [folder, entityType, entityId, maxFiles, onUploaded])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }, [handleUpload])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30',
        isUploading && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />
      {isUploading ? (
        <>
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Subiendo archivos...</p>
        </>
      ) : (
        <>
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arrastra archivos aquí o <span className="text-primary font-medium">selecciona</span>
          </p>
          <p className="text-xs text-muted-foreground/60">Máximo 10MB por archivo</p>
        </>
      )}
    </div>
  )
}
