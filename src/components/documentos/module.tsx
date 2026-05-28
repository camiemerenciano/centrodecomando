'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  File, Folder, FileText, Video, Upload, LayoutGrid, List,
  Search, ExternalLink, Loader2, X, CheckCircle2, XCircle,
  RefreshCw, Unplug, ArrowLeft, ChevronRight, ImageIcon,
  Table2, Presentation, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime: string
  webViewLink?: string
  thumbnailLink?: string
}

interface Breadcrumb { id: string; name: string }

// ─── MIME helpers ─────────────────────────────────────────────────────────────

const FOLDER_MIME = 'application/vnd.google-apps.folder'

type FileIconCfg = { icon: React.ElementType; color: string; bg: string; label: string }

function getFileCfg(mimeType: string): FileIconCfg {
  if (mimeType === FOLDER_MIME)
    return { icon: Folder,       color: 'text-amber-400',   bg: 'bg-amber-400/15',   label: 'Pasta' }
  if (mimeType.startsWith('image/'))
    return { icon: ImageIcon,    color: 'text-sky-400',     bg: 'bg-sky-400/15',     label: 'Imagem' }
  if (mimeType.startsWith('video/'))
    return { icon: Video,        color: 'text-violet-400',  bg: 'bg-violet-400/15',  label: 'Vídeo' }
  if (mimeType === 'application/pdf')
    return { icon: FileText,     color: 'text-red-400',     bg: 'bg-red-400/15',     label: 'PDF' }
  if (mimeType.includes('spreadsheet') || mimeType === 'application/vnd.google-apps.spreadsheet')
    return { icon: Table2,       color: 'text-emerald-400', bg: 'bg-emerald-400/15', label: 'Planilha' }
  if (mimeType.includes('document') || mimeType === 'application/vnd.google-apps.document')
    return { icon: FileText,     color: 'text-sky-400',     bg: 'bg-sky-400/15',     label: 'Documento' }
  if (mimeType.includes('presentation') || mimeType === 'application/vnd.google-apps.presentation')
    return { icon: Presentation, color: 'text-orange-400',  bg: 'bg-orange-400/15',  label: 'Apresentação' }
  return { icon: File, color: 'text-muted-foreground', bg: 'bg-muted/40', label: 'Arquivo' }
}

function fmtSize(bytes?: string): string {
  if (!bytes) return '—'
  const n = Number(bytes)
  if (n < 1024)               return `${n} B`
  if (n < 1024 * 1024)        return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Drive API ────────────────────────────────────────────────────────────────

async function driveListFiles(token: string, folderId?: string): Promise<DriveFile[]> {
  const q = folderId
    ? `'${folderId}' in parents and trashed=false`
    : `'root' in parents and trashed=false`

  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set('q', q)
  url.searchParams.set('fields', 'files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)')
  url.searchParams.set('pageSize', '100')
  url.searchParams.set('orderBy', 'folder,name')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erro ao listar arquivos')
  const data = await res.json()
  return data.files ?? []
}

async function driveUploadFile(token: string, file: File, folderId?: string): Promise<DriveFile> {
  const metadata: Record<string, unknown> = { name: file.name, mimeType: file.type || 'application/octet-stream' }
  if (folderId) metadata.parents = [folderId]

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  )
  if (!res.ok) throw new Error('Erro ao fazer upload')
  return await res.json()
}

async function driveCreateFolder(token: string, name: string, parentId?: string): Promise<DriveFile> {
  const metadata: Record<string, unknown> = { name, mimeType: FOLDER_MIME }
  if (parentId) metadata.parents = [parentId]
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    }
  )
  if (!res.ok) throw new Error('Erro ao criar pasta')
  return await res.json()
}

async function driveDeleteFile(token: string, fileId: string): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ─── Connect Card ─────────────────────────────────────────────────────────────

function ConnectCard({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/15 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
          <path d="M6 36l8-14h20l-8 14H6z" fill="currentColor" className="text-sky-400/80" />
          <path d="M16 8l8 14-8 14H4l8-14-8-14z" fill="currentColor" className="text-sky-500/60" />
          <path d="M30 8h12l-8 14h-12l8-14z" fill="currentColor" className="text-sky-400" />
        </svg>
      </div>
      <div className="text-center space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">Conectar Google Drive</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Acesse, faça upload e organize documentos do Google Drive diretamente na plataforma.
        </p>
      </div>
      <Button onClick={onConnect} className="h-9 bg-primary hover:bg-primary/90 text-sm gap-2">
        Conectar com Google Drive
      </Button>
    </div>
  )
}

// ─── FileCard (grid view) ─────────────────────────────────────────────────────

function FileCard({
  file, onClick, onDelete,
}: {
  file: DriveFile
  onClick: (f: DriveFile) => void
  onDelete: (f: DriveFile) => void
}) {
  const cfg      = getFileCfg(file.mimeType)
  const isFolder = file.mimeType === FOLDER_MIME
  const Icon     = cfg.icon
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="relative group bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onClick(file)}
    >
      {/* Thumbnail or icon */}
      <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={cfg.color} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-snug">{file.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(file.modifiedTime)}</p>
        {!isFolder && (
          <p className="text-[10px] text-muted-foreground">{fmtSize(file.size)}</p>
        )}
      </div>

      {/* Actions on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="Abrir no Drive"
          >
            <ExternalLink size={11} />
          </a>
        )}
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
          </svg>
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
          <div className="absolute right-2 top-9 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
            {file.webViewLink && (
              <a href={file.webViewLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                <ExternalLink size={11} /> Abrir no Drive
              </a>
            )}
            <button onClick={() => { onDelete(file); setMenuOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors">
              <X size={11} /> Mover para lixeira
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── FileRow (list view) ──────────────────────────────────────────────────────

function FileRow({ file, onClick, onDelete }: { file: DriveFile; onClick: (f: DriveFile) => void; onDelete: (f: DriveFile) => void }) {
  const cfg  = getFileCfg(file.mimeType)
  const Icon = cfg.icon
  return (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => onClick(file)}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
            <Icon size={14} className={cfg.color} />
          </div>
          <p className="text-sm text-foreground font-medium truncate max-w-[240px]">{file.name}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className="text-[10px] bg-muted border-0 text-muted-foreground">{cfg.label}</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(file.modifiedTime)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{fmtSize(file.size)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Abrir no Drive">
              <ExternalLink size={13} />
            </a>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(file) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Mover para lixeira">
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── New Folder Modal ─────────────────────────────────────────────────────────

function NewFolderModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Nova pasta</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <div className="px-5 py-5">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim()); if (e.key === 'Escape') onClose() }}
              placeholder="Nome da pasta"
              className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <Button size="sm" onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
              <Folder size={12} /> Criar pasta
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function DocumentosModule() {
  const supabase = createClient()

  const [status, setStatus]           = useState<'loading' | 'disconnected' | 'connected'>('loading')
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [connectedEmail, setConnectedEmail] = useState('')
  const [files, setFiles]             = useState<DriveFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [view, setView]               = useState<'grid' | 'list'>('grid')
  const [search, setSearch]           = useState('')
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])
  const [authError, setAuthError]     = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [dragOver, setDragOver]       = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id

  // ── Load Drive connection from integracoes ──────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('disconnected'); return }

      const { data } = await supabase
        .from('integracoes')
        .select('gdrive_access_token, gdrive_refresh_token, gdrive_email')
        .eq('user_id', user.id).maybeSingle()

      if (!data?.gdrive_access_token) { setStatus('disconnected'); return }

      let token = data.gdrive_access_token
      if (data.gdrive_refresh_token) {
        try {
          const res     = await fetch('/api/auth/google/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: data.gdrive_refresh_token }) })
          const refreshed = await res.json()
          if (refreshed.access_token) {
            token = refreshed.access_token
            await supabase.from('integracoes').upsert({ user_id: user.id, gdrive_access_token: refreshed.access_token }, { onConflict: 'user_id' })
          }
        } catch { /* fallback to stored token */ }
      }

      setAccessToken(token)
      setRefreshToken(data.gdrive_refresh_token ?? '')
      setConnectedEmail(data.gdrive_email ?? '')
      setStatus('connected')
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load files when connected or folder changes ─────────────────────────────

  const loadFiles = useCallback(async (token: string, folderId?: string) => {
    setLoadingFiles(true)
    setUploadError('')
    try {
      const list = await driveListFiles(token, folderId)
      setFiles(list)
    } catch {
      setUploadError('Não foi possível carregar os arquivos.')
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'connected' && accessToken) loadFiles(accessToken, currentFolderId)
  }, [status, accessToken, currentFolderId, loadFiles])

  // ── OAuth connect ───────────────────────────────────────────────────────────

  function openOAuth() {
    setAuthError('')
    const w = 500, h = 640
    const popup = window.open(
      '/api/auth/google/drive', 'google_drive_oauth',
      `width=${w},height=${h},left=${window.screenX + (window.innerWidth - w) / 2},top=${window.screenY + (window.innerHeight - h) / 2},toolbar=0,menubar=0,location=0`
    )
    if (!popup || popup.closed) { setAuthError('O popup foi bloqueado. Permita popups para este site.'); return }

    async function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'google_auth') return
      window.removeEventListener('message', onMessage)

      if (e.data.error) { if (e.data.error !== 'cancelled') setAuthError('Erro ao autenticar. Tente novamente.'); return }

      const { email = '', name = '', access_token: at = '', refresh_token: rt = '' } = e.data

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('integracoes').upsert({
        user_id: user.id, gdrive_access_token: at, gdrive_refresh_token: rt,
        gdrive_email: email, gdrive_name: name, gdrive_connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      setAccessToken(at); setRefreshToken(rt); setConnectedEmail(email)
      setStatus('connected')
    }

    window.addEventListener('message', onMessage)
    const timer = setInterval(() => {
      if (popup.closed) { clearInterval(timer); window.removeEventListener('message', onMessage) }
    }, 500)
  }

  async function disconnect() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('integracoes').update({ gdrive_access_token: null, gdrive_refresh_token: null, gdrive_email: null }).eq('user_id', user.id)
    setAccessToken(''); setRefreshToken(''); setConnectedEmail('')
    setStatus('disconnected'); setFiles([])
  }

  // ── File actions ────────────────────────────────────────────────────────────

  function handleFileClick(file: DriveFile) {
    if (file.mimeType === FOLDER_MIME) {
      setBreadcrumbs(prev => [...prev, { id: file.id, name: file.name }])
    } else if (file.webViewLink) {
      window.open(file.webViewLink, '_blank')
    }
  }

  function navigateToBreadcrumb(idx: number) {
    setBreadcrumbs(prev => prev.slice(0, idx + 1))
  }

  function navigateToRoot() {
    setBreadcrumbs([])
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !accessToken) return
    setUploading(true); setUploadError('')
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(f => driveUploadFile(accessToken, f, currentFolderId))
      )
      setFiles(prev => [...uploaded, ...prev])
    } catch {
      setUploadError('Erro ao fazer upload. Verifique as permissões.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(file: DriveFile) {
    if (!accessToken) return
    await driveDeleteFile(accessToken, file.id)
    setFiles(prev => prev.filter(f => f.id !== file.id))
  }

  async function handleCreateFolder(name: string) {
    if (!accessToken) return
    setShowNewFolder(false)
    const folder = await driveCreateFolder(accessToken, name, currentFolderId)
    setFiles(prev => [folder, ...prev])
  }

  // ── Filtered files ──────────────────────────────────────────────────────────

  const filtered = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === 'disconnected') {
    return (
      <div className="max-w-[800px]">
        <ConnectCard onConnect={openOAuth} />
        {authError && (
          <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-4 py-3 mt-4">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{authError}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {/* Breadcrumb */}
          <button onClick={navigateToRoot} className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors shrink-0">
            Documentos
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1 min-w-0">
              <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`text-sm truncate transition-colors ${i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Connected status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{connectedEmail}</span>
          <button onClick={disconnect} title="Desconectar Drive" className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
            <Unplug size={13} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Back */}
        {breadcrumbs.length > 0 && (
          <button
            onClick={() => setBreadcrumbs(prev => prev.slice(0, -1))}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
          >
            <ArrowLeft size={13} /> Voltar
          </button>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar arquivos..."
            className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={11} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* New folder */}
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
          >
            <Folder size={13} /> Nova pasta
          </button>

          {/* Upload */}
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5"
          >
            {uploading
              ? <><Loader2 size={13} className="animate-spin" /> Enviando…</>
              : <><Upload size={13} /> Enviar arquivo</>
            }
          </Button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />

          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button onClick={() => setView('grid')} className={`w-7 h-7 flex items-center justify-center rounded transition-all ${view === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setView('list')} className={`w-7 h-7 flex items-center justify-center rounded transition-all ${view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-4 py-3">
          <XCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{uploadError}</p>
        </div>
      )}

      {/* Drop zone wrapper */}
      <div
        className={`relative rounded-xl transition-all ${dragOver ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        {dragOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-primary/5 border-2 border-dashed border-primary/40 pointer-events-none">
            <Upload size={24} className="text-primary mb-2" />
            <p className="text-sm font-medium text-primary">Solte para enviar</p>
          </div>
        )}

        {/* Loading */}
        {loadingFiles ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Folder size={36} className="text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              {search ? `Nenhum resultado para "${search}"` : 'Esta pasta está vazia'}
            </p>
            {!search && (
              <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:text-primary/80 transition-colors">
                + Enviar o primeiro arquivo
              </button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filtered.map(f => (
              <FileCard key={f.id} file={f} onClick={handleFileClick} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Nome', 'Tipo', 'Modificado', 'Tamanho', ''].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <FileRow key={f.id} file={f} onClick={handleFileClick} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewFolder && (
        <NewFolderModal onClose={() => setShowNewFolder(false)} onCreate={handleCreateFolder} />
      )}
    </div>
  )
}
