import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileIcon, FileText, Trash2, X, Download, Loader2,
  FolderOpen, Eye, Search, Image as ImageIcon, File as GenericFile,
  Upload, HardDrive, LayoutGrid, List, Code, Plus,
  FolderPlus, MoreHorizontal, Pencil, FolderInput, Check,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  mediaApi, formatFileSize, isImage, isPdf, isText, downloadFile, buildFolderTree,
  type MediaFile, type StorageUsage, type MediaFolder,
} from '@/lib/media'

type TypeFilter = 'all' | 'image' | 'pdf' | 'file'
type ViewMode = 'grid' | 'list'

const FOLDER_COLORS = [
  '#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#10b981', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
]

/* ── Recursive folder tree item ── */
function FolderTreeItem({
  folder, depth, activeFolder, setActiveFolder,
  editingFolderId, editingFolderName, setEditingFolderId, setEditingFolderName,
  handleRenameFolder, folderMenuId, setFolderMenuId,
  setConfirmDeleteFolderId, onCreateSubfolder,
  expandedIds, toggleExpanded,
}: {
  folder: MediaFolder
  depth: number
  activeFolder: string | null
  setActiveFolder: (s: string) => void
  editingFolderId: number | null
  editingFolderName: string
  setEditingFolderId: (id: number | null) => void
  setEditingFolderName: (s: string) => void
  handleRenameFolder: (id: number) => void
  folderMenuId: number | null
  setFolderMenuId: (id: number | null) => void
  setConfirmDeleteFolderId: (id: number | null) => void
  onCreateSubfolder: (parentId: number) => void
  expandedIds: Set<number>
  toggleExpanded: (id: number) => void
}) {
  const hasChildren = folder.hijos.length > 0
  const isExpanded = expandedIds.has(folder.id)
  const pl = 2.5 + depth * 12 // px padding per depth level

  if (editingFolderId === folder.id) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5" style={{ paddingLeft: `${pl}px` }}>
        <input
          autoFocus
          value={editingFolderName}
          onChange={(e) => setEditingFolderName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditingFolderId(null) }}
          className="flex-1 text-xs bg-muted rounded px-2 py-1 outline-none text-foreground min-w-0"
        />
        <button onClick={() => handleRenameFolder(folder.id)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-primary/10 text-primary cursor-pointer"><Check className="h-3 w-3" /></button>
        <button onClick={() => setEditingFolderId(null)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground cursor-pointer"><X className="h-3 w-3" /></button>
      </div>
    )
  }

  return (
    <div className="relative group/folder">
      <div
        onClick={() => setActiveFolder(folder.slug)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveFolder(folder.slug) }}
        className={cn(
          'w-full flex items-center gap-1.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer pr-2',
          activeFolder === folder.slug
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        style={{ paddingLeft: `${pl}px` }}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpanded(folder.id) }}
          className={cn(
            'w-4 h-4 flex items-center justify-center shrink-0 transition-transform',
            !hasChildren && 'invisible'
          )}
        >
          <ChevronRight className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')} />
        </button>

        {/* Color dot */}
        <div className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: folder.color + '20' }}>
          <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: folder.color }} />
        </div>

        <span className="flex-1 text-left truncate">{folder.nombre}</span>
        <span className="text-[10px] tabular-nums opacity-60">{folder.archivos}</span>

        {/* Context menu trigger */}
        {!folder.es_sistema && (
          <button
            onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === folder.id ? null : folder.id) }}
            className="w-5 h-5 items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer hidden group-hover/folder:flex"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        )}

        {/* Add subfolder for system folders too */}
        {folder.es_sistema && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreateSubfolder(folder.id) }}
            className="w-5 h-5 items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer hidden group-hover/folder:flex"
            title="Crear subcarpeta"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Context menu */}
      {folderMenuId === folder.id && (
        <div className="absolute right-0 top-full z-20 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
          <button
            onClick={() => { onCreateSubfolder(folder.id); setFolderMenuId(null) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <FolderPlus className="h-3 w-3" /> Subcarpeta
          </button>
          <button
            onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.nombre); setFolderMenuId(null) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Pencil className="h-3 w-3" /> Renombrar
          </button>
          <button
            onClick={() => { setConfirmDeleteFolderId(folder.id); setFolderMenuId(null) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3 w-3" /> Eliminar
          </button>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.hijos.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              setActiveFolder={setActiveFolder}
              editingFolderId={editingFolderId}
              editingFolderName={editingFolderName}
              setEditingFolderId={setEditingFolderId}
              setEditingFolderName={setEditingFolderName}
              handleRenameFolder={handleRenameFolder}
              folderMenuId={folderMenuId}
              setFolderMenuId={setFolderMenuId}
              setConfirmDeleteFolderId={setConfirmDeleteFolderId}
              onCreateSubfolder={onCreateSubfolder}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Recursive folder picker for move modal ── */
function FolderPickerItem({
  folder, depth, onSelect,
}: {
  folder: MediaFolder
  depth: number
  onSelect: (slug: string) => void
}) {
  return (
    <>
      <button
        onClick={() => onSelect(folder.slug)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-muted transition-colors cursor-pointer text-left"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: folder.color }} />
        <span className="flex-1 truncate">{folder.nombre}</span>
        <span className="text-muted-foreground text-[10px]">{folder.archivos}</span>
      </button>
      {folder.hijos.map((child) => (
        <FolderPickerItem key={child.id} folder={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </>
  )
}

/* ── Main page ── */
export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [flatFolders, setFlatFolders] = useState<MediaFolder[]>([])
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Folder management
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [creatingInParentId, setCreatingInParentId] = useState<number | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6')
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [folderMenuId, setFolderMenuId] = useState<number | null>(null)
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<number | null>(null)
  const [movingFileId, setMovingFileId] = useState<number | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Build tree from flat list
  const folderTree = buildFolderTree(flatFolders)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchFolders = useCallback(async () => {
    try {
      const res = await mediaApi.folders()
      setFlatFolders(res.data)
    } catch { /* ignore */ }
  }, [])

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (activeFolder) params.folder = activeFolder
      if (typeFilter !== 'all') params.tipo = typeFilter
      if (debouncedSearch.trim()) params.buscar = debouncedSearch.trim()
      const res = await mediaApi.list(params)
      setFiles(res.data)
    } catch {
      toast.error('Error al cargar archivos')
    } finally {
      setLoading(false)
    }
  }, [activeFolder, typeFilter, debouncedSearch])

  const fetchUsage = useCallback(async () => {
    try {
      const res = await mediaApi.usage()
      setUsage(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchFolders() }, [fetchFolders])
  useEffect(() => { fetchFiles() }, [fetchFiles])
  useEffect(() => { fetchUsage() }, [fetchUsage])

  const handleUpload = async (fileList: FileList) => {
    const filesToUpload = Array.from(fileList)
    if (filesToUpload.length === 0) return
    setIsUploading(true)
    try {
      const folder = activeFolder || 'general'
      const res = await mediaApi.upload(filesToUpload, { folder })
      setFiles((prev) => [...res.data, ...prev])
      fetchUsage()
      fetchFolders()
      toast.success(`${res.data.length} archivo${res.data.length > 1 ? 's' : ''} subido${res.data.length > 1 ? 's' : ''}`)
    } catch (err: any) {
      const msg = err?.response?.data?.detalle || err?.message || 'Error al subir'
      toast.error(msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await mediaApi.delete(id)
      setFiles((prev) => prev.filter((f) => f.id !== id))
      setConfirmDeleteId(null)
      fetchUsage()
      fetchFolders()
      toast.success('Archivo eliminado')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const handlePreview = async (file: MediaFile) => {
    setPreviewFile(file)
    setTextContent(null)
    if (isText(file.mime, file.nombre)) {
      try {
        const res = await fetch(file.url)
        const text = await res.text()
        setTextContent(text)
      } catch {
        setTextContent('Error al cargar el contenido del archivo.')
      }
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await mediaApi.createFolder(newFolderName.trim(), newFolderColor, creatingInParentId)
      setCreatingFolder(false)
      setCreatingInParentId(null)
      setNewFolderName('')
      fetchFolders()
      // Auto-expand the parent so the new subfolder is visible
      if (creatingInParentId) {
        setExpandedIds((prev) => new Set([...prev, creatingInParentId]))
      }
      toast.success('Carpeta creada')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al crear carpeta')
    }
  }

  const handleStartCreateSubfolder = (parentId: number) => {
    setCreatingInParentId(parentId)
    setCreatingFolder(true)
    setNewFolderName('')
    setNewFolderColor('#3b82f6')
  }

  const handleRenameFolder = async (id: number) => {
    if (!editingFolderName.trim()) return
    try {
      await mediaApi.updateFolder(id, { nombre: editingFolderName.trim() })
      setEditingFolderId(null)
      fetchFolders()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al renombrar')
    }
  }

  const handleDeleteFolder = async (id: number) => {
    try {
      await mediaApi.deleteFolder(id)
      setConfirmDeleteFolderId(null)
      if (flatFolders.find((f) => f.id === id)?.slug === activeFolder) {
        setActiveFolder(null)
      }
      fetchFolders()
      fetchFiles()
      toast.success('Carpeta eliminada')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al eliminar')
    }
  }

  const handleMoveFile = async (fileId: number, folderSlug: string) => {
    try {
      await mediaApi.move(fileId, folderSlug)
      setMovingFileId(null)
      fetchFiles()
      fetchFolders()
      toast.success('Archivo movido')
    } catch {
      toast.error('Error al mover')
    }
  }

  const usagePercent = usage ? Math.min(100, (usage.used / usage.limit) * 100) : 0
  const totalFiles = flatFolders.reduce((s, f) => s + f.archivos, 0)

  const fileIcon = (file: MediaFile, size = 'h-8 w-8') => {
    if (isImage(file.mime)) return null
    if (isPdf(file.mime)) return <FileText className={cn(size, 'text-red-400/80')} />
    if (isText(file.mime, file.nombre)) return <Code className={cn(size, 'text-blue-400/80')} />
    return <FileIcon className={cn(size, 'text-muted-foreground/60')} />
  }

  const activeFolderObj = activeFolder ? flatFolders.find((f) => f.slug === activeFolder) : null
  const parentFolderName = creatingInParentId ? flatFolders.find((f) => f.id === creatingInParentId)?.nombre : null

  return (
    <div
      className="space-y-5 animate-in"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setIsDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); e.dataTransfer.files.length > 0 && handleUpload(e.dataTransfer.files) }}
    >
      <PageHeader
        breadcrumbs={[{ label: 'Media' }]}
        title="Media"
        icon={<ImageIcon className="h-5 w-5" />}
      />

      <div className="flex gap-5">
        {/* ── Folder sidebar ── */}
        <div className="w-56 shrink-0 space-y-3">
          {/* Storage */}
          {usage && (
            <div className="card-modern p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" />
                <span>{formatFileSize(usage.used)} / {formatFileSize(usage.limit)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usagePercent > 90 ? 'bg-destructive' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-primary'
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Folder tree */}
          <div className="card-modern p-2 space-y-0.5">
            {/* All files */}
            <button
              onClick={() => setActiveFolder(null)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer',
                activeFolder === null
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">Todos los archivos</span>
              <span className="text-[10px] tabular-nums opacity-60">{totalFiles}</span>
            </button>

            {/* Folder tree items */}
            {folderTree.map((folder) => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                depth={0}
                activeFolder={activeFolder}
                setActiveFolder={setActiveFolder}
                editingFolderId={editingFolderId}
                editingFolderName={editingFolderName}
                setEditingFolderId={setEditingFolderId}
                setEditingFolderName={setEditingFolderName}
                handleRenameFolder={handleRenameFolder}
                folderMenuId={folderMenuId}
                setFolderMenuId={setFolderMenuId}
                setConfirmDeleteFolderId={setConfirmDeleteFolderId}
                onCreateSubfolder={handleStartCreateSubfolder}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
              />
            ))}

            {/* Create folder form */}
            {creatingFolder ? (
              <div className="px-2 py-1.5 space-y-2">
                {parentFolderName && (
                  <p className="text-[10px] text-muted-foreground">Dentro de <strong>{parentFolderName}</strong></p>
                )}
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setCreatingInParentId(null) } }}
                  placeholder="Nombre..."
                  className="w-full text-xs bg-muted rounded px-2 py-1.5 outline-none text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-1">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewFolderColor(c)}
                      className={cn(
                        'w-4 h-4 rounded-full cursor-pointer transition-all',
                        newFolderColor === c ? 'ring-2 ring-offset-1 ring-offset-background ring-primary scale-110' : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => { setCreatingFolder(false); setCreatingInParentId(null) }}
                    className="px-2 py-1 rounded text-[10px] text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setCreatingFolder(true); setCreatingInParentId(null) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Nueva carpeta</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="card-modern px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 w-52">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="h-5 w-px bg-border" />

              {/* Type filter */}
              {([
                { key: 'all' as TypeFilter, label: 'Todo', icon: GenericFile },
                { key: 'image' as TypeFilter, label: 'Img', icon: ImageIcon },
                { key: 'pdf' as TypeFilter, label: 'PDF', icon: FileText },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer',
                    typeFilter === key
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}

              <div className="flex-1" />

              {/* Upload */}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Subir
              </button>

              <div className="h-5 w-px bg-border" />

              {/* View toggle */}
              <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer', viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
                >
                  <LayoutGrid className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer', viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
                >
                  <List className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Folder header */}
          {activeFolderObj && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: activeFolderObj.color }} />
              <span className="text-sm font-medium">{activeFolderObj.nombre}</span>
              <span className="text-xs text-muted-foreground">{activeFolderObj.archivos} archivos</span>
            </div>
          )}

          {/* Drag overlay */}
          {isDragging && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="bg-card rounded-2xl border-2 border-dashed border-primary p-12 text-center">
                <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
                <p className="text-lg font-semibold">Suelta aqui para subir</p>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <FolderOpen className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">
                {debouncedSearch ? 'Sin resultados' : 'Sin archivos'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {debouncedSearch
                  ? `No se encontraron archivos con "${debouncedSearch}"`
                  : 'Arrastra archivos aqui o usa el boton de subir'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group relative rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all"
                >
                  <button
                    onClick={() => handlePreview(file)}
                    className="w-full aspect-[4/3] flex items-center justify-center bg-muted/10 cursor-pointer"
                  >
                    {isImage(file.mime) ? (
                      <img src={file.url} alt={file.nombre} className="w-full h-full object-cover" />
                    ) : fileIcon(file)}
                  </button>

                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handlePreview(file)} className="w-6 h-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"><Eye className="h-3 w-3" /></button>
                    <button onClick={() => downloadFile(file.url, file.nombre)} className="w-6 h-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"><Download className="h-3 w-3" /></button>
                    <button onClick={() => setMovingFileId(file.id)} className="w-6 h-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer" title="Mover"><FolderInput className="h-3 w-3" /></button>
                    <button onClick={() => setConfirmDeleteId(file.id)} className="w-6 h-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                  </div>

                  <div className="px-2 py-1.5">
                    <p className="text-[11px] font-medium truncate leading-tight" title={file.nombre}>{file.nombre}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{formatFileSize(file.tamano)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-modern overflow-hidden">
              <div className="divide-y divide-border">
                {files.map((file) => (
                  <div key={file.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <button onClick={() => handlePreview(file)} className="w-9 h-9 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center shrink-0 cursor-pointer">
                      {isImage(file.mime) ? <img src={file.url} alt={file.nombre} className="w-full h-full object-cover" /> : fileIcon(file, 'h-4 w-4')}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.nombre}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.tamano)}</span>
                        <span>·</span>
                        <span>{new Date(file.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handlePreview(file)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Eye className="h-3.5 w-3.5" /></button>
                      <button onClick={() => downloadFile(file.url, file.nombre)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Download className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setMovingFileId(file.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Mover"><FolderInput className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setConfirmDeleteId(file.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Move file modal ── */}
      {movingFileId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setMovingFileId(null)}>
          <div className="bg-card rounded-xl border border-border p-5 max-w-xs w-full mx-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm">Mover a carpeta</h3>
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {folderTree.map((folder) => (
                <FolderPickerItem key={folder.id} folder={folder} depth={0} onSelect={(slug) => handleMoveFile(movingFileId, slug)} />
              ))}
            </div>
            <button onClick={() => setMovingFileId(null)} className="w-full px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Delete file modal ── */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Eliminar archivo</h3>
            <p className="text-sm text-muted-foreground">Esta accion no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer" disabled={deleting}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDeleteId)} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer">
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete folder modal ── */}
      {confirmDeleteFolderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Eliminar carpeta</h3>
            <p className="text-sm text-muted-foreground">Los archivos se moveran a General y las subcarpetas se eliminaran. Esta accion no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteFolderId(null)} className="px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => handleDeleteFolder(confirmDeleteFolderId)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen preview ── */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={() => { setPreviewFile(null); setTextContent(null) }}>
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white min-w-0">
              <p className="font-medium text-sm truncate">{previewFile.nombre}</p>
              <p className="text-xs text-white/50">{formatFileSize(previewFile.tamano)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); downloadFile(previewFile.url, previewFile.nombre) }} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer" title="Descargar"><Download className="h-4 w-4" /></button>
              <button onClick={() => { setPreviewFile(null); setTextContent(null) }} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-w-[90vw] max-h-[85vh] mt-12" onClick={(e) => e.stopPropagation()}>
            {isImage(previewFile.mime) ? (
              <img src={previewFile.url} alt={previewFile.nombre} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            ) : isPdf(previewFile.mime) ? (
              <iframe src={previewFile.url} title={previewFile.nombre} className="w-[80vw] h-[80vh] rounded-lg bg-white" />
            ) : isText(previewFile.mime, previewFile.nombre) ? (
              <div className="w-[70vw] max-h-[80vh] rounded-lg bg-[#1e1e1e] border border-white/10 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-white/10 text-xs text-white/40 font-mono">{previewFile.nombre}</div>
                <pre className="flex-1 overflow-auto p-4 text-sm text-white/90 font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {textContent === null ? <span className="text-white/30 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Cargando...</span> : textContent}
                </pre>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-10 text-center space-y-3 max-w-sm">
                <FileIcon className="h-14 w-14 text-muted-foreground mx-auto" />
                <p className="font-medium">{previewFile.nombre}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(previewFile.tamano)}</p>
                <p className="text-xs text-muted-foreground">Vista previa no disponible</p>
                <button onClick={() => downloadFile(previewFile.url, previewFile.nombre)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-all cursor-pointer">
                  <Download className="h-4 w-4" /> Descargar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
