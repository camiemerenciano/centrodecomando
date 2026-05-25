'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search, Send, Wand2, CheckSquare2, StickyNote,
  MessageSquare, Phone, Plus, X, Loader2,
  CheckCircle2, AlertCircle, Circle, Paperclip,
  ChevronDown, RefreshCw, Plug, Bot, Pause, UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConvStatus = 'open' | 'in_progress' | 'resolved'
type MsgType = 'text' | 'note' | 'media'

interface ConvItem {
  id: string       // remoteJid
  name: string
  lastMessage: string
  time: string
  unread: number
  status: ConvStatus
}

interface MsgItem {
  id: string
  from: string
  content: string
  time: string
  ts: number   // unix seconds — used for chronological sort
  mine: boolean
  type: MsgType
}

interface EvoConfig {
  apiUrl: string
  apiKey: string
  instanceName: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatTs(ts: number | string | undefined): string {
  if (!ts) return ''
  const d = new Date(typeof ts === 'string' ? ts : ts * 1000)
  const today = new Date()
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function extractText(msg: Record<string, unknown> | undefined): string {
  if (!msg) return ''
  const m = (msg.message ?? msg) as Record<string, unknown>
  return (
    (m?.conversation as string) ??
    ((m?.extendedTextMessage as Record<string, unknown>)?.text as string) ??
    ((m?.imageMessage as Record<string, unknown>)?.caption as string) ??
    (m?.type ? `[${m.type}]` : '[Mídia]')
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChat(c: any): ConvItem {
  // Prefer the WhatsApp JID (matches key.remoteJid in messages) over the Evolution internal id
  const jid = c?.remoteJid ?? c?.id?.remote ?? c?.id ?? ''
  const phone = jid.split('@')[0] ?? jid
  return {
    id: jid,
    name: c?.name ?? c?.pushName ?? `+${phone}`,
    lastMessage: extractText(c?.lastMessage),
    time: formatTs(c?.lastMessage?.messageTimestamp ?? c?.updatedAt),
    unread: c?.unreadCount ?? 0,
    status: 'open',
  }
}

function rawTs(m: Record<string, unknown>): number {
  const raw = (m?.messageTimestamp ?? m?.updatedAt) as unknown
  if (!raw) return 0
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') return parseInt(raw, 10) || 0
  const o = raw as Record<string, number>
  if (typeof o?.low === 'number') return o.low + (o.high ?? 0) * 2 ** 32
  return 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(m: any): MsgItem {
  return {
    id: m?.key?.id ?? m?.id ?? String(Math.random()),
    from: m?.key?.fromMe ? 'me' : (m?.pushName ?? 'Cliente'),
    content: extractText(m),
    time: formatTs(m?.messageTimestamp ?? m?.updatedAt),
    ts: rawTs(m),
    mine: m?.key?.fromMe ?? false,
    type: 'text',
  }
}

// ─── Config maps ─────────────────────────────────────────────────────────────

const statusCfg: Record<ConvStatus, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  open:        { label: 'Aberta',       color: 'bg-sky-500/15 text-sky-400',         dot: 'bg-sky-400',     icon: <Circle size={9} />      },
  in_progress: { label: 'Em andamento', color: 'bg-amber-500/15 text-amber-400',     dot: 'bg-amber-400',   icon: <AlertCircle size={9} /> },
  resolved:    { label: 'Resolvida',    color: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400', icon: <CheckCircle2 size={9} /> },
}

type PipelineStage = 'recepcao' | 'viabilidade' | 'ag_agendamento' | 'agendado' | 'contrato_enviado' | 'contrato_assinado' | 'followup' | 'perdido'

const PIPELINE_STAGES: { id: PipelineStage; label: string; badge: string }[] = [
  { id: 'recepcao',          label: 'Recepção',          badge: 'bg-slate-400/15 text-slate-400 border-slate-400/20'       },
  { id: 'viabilidade',       label: 'Viabilidade',       badge: 'bg-indigo-400/15 text-indigo-400 border-indigo-400/20'   },
  { id: 'ag_agendamento',    label: 'Ag. Agendamento',   badge: 'bg-amber-400/15 text-amber-400 border-amber-400/20'      },
  { id: 'agendado',          label: 'Agendado',          badge: 'bg-sky-400/15 text-sky-400 border-sky-400/20'            },
  { id: 'contrato_enviado',  label: 'Contrato Enviado',  badge: 'bg-orange-400/15 text-orange-400 border-orange-400/20'   },
  { id: 'contrato_assinado', label: 'Contrato Assinado', badge: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20'},
  { id: 'followup',          label: 'Follow-up',         badge: 'bg-violet-400/15 text-violet-400 border-violet-400/20'   },
  { id: 'perdido',           label: 'Lead Perdido',      badge: 'bg-red-400/15 text-red-400 border-red-400/20'            },
]

function pipelineBadge(stage: string | undefined) {
  if (!stage) return null
  return PIPELINE_STAGES.find(s => s.id === stage) ?? null
}

// ─── Not connected banner ─────────────────────────────────────────────────────

function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
        <Phone size={26} className="text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">WhatsApp não conectado</p>
        <p className="text-xs text-muted-foreground mt-1">
          Conecte o WhatsApp via Evolution API para ver as mensagens aqui.
        </p>
      </div>
      <Link href="/assistente/conexoes">
        <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5">
          <Plug size={13} /> Conectar agora
        </Button>
      </Link>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MensagensModule() {
  const [evo, setEvo]                     = useState<EvoConfig | null>(null)
  const [conversations, setConversations] = useState<ConvItem[]>([])
  const [messagesMap, setMessagesMap]     = useState<Record<string, MsgItem[]>>({})
  const [activeId, setActiveId]           = useState<string | null>(null)
  const [input, setInput]                 = useState('')
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<'all' | ConvStatus>('all')
  const [loadingChats, setLoadingChats]   = useState(false)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [sending, setSending]             = useState(false)
  const [statusMap, setStatusMap]         = useState<Record<string, ConvStatus>>({})
  const [notesMap, setNotesMap]           = useState<Record<string, string>>({})
  const [notesSaved, setNotesSaved]       = useState(false)
  const [summaryMap, setSummaryMap]       = useState<Record<string, string>>({})
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [showTaskForm, setShowTaskForm]   = useState(false)
  const [taskTitle, setTaskTitle]         = useState('')
  const [taskDone, setTaskDone]           = useState(false)
  const [isSuggestingReply, setIsSuggestingReply] = useState(false)
  const [gcalToken, setGcalToken]                 = useState<string | null>(null)
  const [userId, setUserId]                       = useState<string | null>(null)
  const [ownerId, setOwnerId]                     = useState<string | null>(null)
  const [lunnaActiveMap, setLunnaActiveMap]       = useState<Record<string, boolean>>({})
  const [autoReplying, setAutoReplying]           = useState<Record<string, boolean>>({})
  const [pipelineStageMap, setPipelineStageMap]   = useState<Record<string, string>>({})
  const [clientMap, setClientMap]                 = useState<Record<string, Record<string, unknown> | null>>({})
  const [showNewConv, setShowNewConv]             = useState(false)
  const [newConvPhone, setNewConvPhone]           = useState('')
  const [newConvName, setNewConvName]             = useState('')


  const bottomRef        = useRef<HTMLDivElement>(null)
  const supabase         = createClient()
  const seenMsgIds       = useRef<Record<string, Set<string>>>({})
  const loadedConvs      = useRef<Set<string>>(new Set())
  const lunnaActiveRef   = useRef<Record<string, boolean>>({})
  const gcalTokenRef     = useRef<string | null>(null)
  const userIdRef        = useRef<string | null>(null)
  const evoRef           = useRef<EvoConfig | null>(null)
  const conversationsRef = useRef<ConvItem[]>([])
  const messagesMapRef   = useRef<Record<string, MsgItem[]>>({})

  const activeConv      = conversations.find(c => c.id === activeId) ?? null
  const activeMessages  = activeId ? (messagesMap[activeId] ?? []) : []
  const activeStatus    = activeId ? (statusMap[activeId] ?? 'open') : 'open'
  const activeNotes     = activeId ? (notesMap[activeId] ?? '') : ''
  const activeSummary   = activeId ? (summaryMap[activeId] ?? null) : null
  const isLunnaActive   = activeId ? (lunnaActiveMap[activeId] ?? true) : true
  const isLunnaTyping   = activeId ? (autoReplying[activeId] ?? false) : false

  // Keep refs in sync
  useEffect(() => { lunnaActiveRef.current   = lunnaActiveMap },   [lunnaActiveMap])
  useEffect(() => { gcalTokenRef.current     = gcalToken },         [gcalToken])
  useEffect(() => { userIdRef.current        = ownerId ?? userId }, [ownerId, userId])
  useEffect(() => { evoRef.current           = evo },               [evo])
  useEffect(() => { conversationsRef.current = conversations },     [conversations])
  useEffect(() => { messagesMapRef.current   = messagesMap },       [messagesMap])

  // Load all credentials on mount — uses server route to bypass RLS for team members
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      // Server route resolves ownerId and fetches integracoes with admin client (no RLS)
      const res = await fetch('/api/integracoes/evo')
      if (!res.ok) return
      const { data, ownerId: resolvedOwnerId } = await res.json()
      if (resolvedOwnerId) setOwnerId(resolvedOwnerId)

      if (!data) return

      // WhatsApp
      if (data.evo_api_url && data.evo_api_key && data.evo_instance) {
        setEvo({ apiUrl: data.evo_api_url, apiKey: data.evo_api_key, instanceName: data.evo_instance })
        localStorage.setItem('evo_apiUrl',       data.evo_api_url)
        localStorage.setItem('evo_apiKey',       data.evo_api_key)
        localStorage.setItem('evo_instance',     data.evo_instance)
        localStorage.setItem('evo_connectedAt',  data.evo_connected_at ?? '')
      }

      // Google Calendar — refresh token if available
      if (data.gcal_refresh_token) {
        try {
          const refreshRes = await fetch('/api/auth/google/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: data.gcal_refresh_token }),
          })
          const refreshed = await refreshRes.json()
          if (refreshed.access_token) {
            setGcalToken(refreshed.access_token)
            await supabase.from('integracoes').upsert({
              user_id:           user.id,
              gcal_access_token: refreshed.access_token,
            }, { onConflict: 'user_id' })
            return
          }
        } catch { /* fallback to stored token */ }
      }
      if (data.gcal_access_token) setGcalToken(data.gcal_access_token)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch chats when evo is set
  const fetchChats = useCallback(async (config: EvoConfig) => {
    setLoadingChats(true)
    try {
      const res  = await fetch('/api/evolution/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) return
      const mapped = data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => {
          const jid: string = c.remoteJid ?? c?.id?.remote ?? c?.id ?? ''
          if (!jid.endsWith('@s.whatsapp.net')) return false
          return true
        })
        .map(mapChat)
        .filter((c: ConvItem) => c.id)
      setConversations(mapped)
      if (mapped.length > 0 && !activeId) {
        // Restore last active conversation from localStorage, fall back to first
        const saved = localStorage.getItem('mensagens_activeId')
        const restored = saved && mapped.some(c => c.id === saved) ? saved : mapped[0].id
        setActiveId(restored)
      }

      // Sync all conversations to pipeline_leads (only inserts new ones, preserves existing stage/status)
      fetch('/api/pipeline/leads/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: mapped.map(c => ({
            remote_jid: c.id,
            title:      c.name || c.id.split('@')[0],
            client:     c.name || c.id.split('@')[0],
          })),
        }),
      }).catch(() => { /* silently ignore */ })
    } finally {
      setLoadingChats(false)
    }
  }, [activeId])

  useEffect(() => {
    if (evo) fetchChats(evo)
  }, [evo, fetchChats])

  // Fetch messages whenever active conversation changes
  useEffect(() => {
    if (!evo || !activeId) return
    setLoadingMsgs(true)
    fetch('/api/evolution/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...evo, remoteJid: activeId }),
    })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const mapped = data.map(mapMessage)
        setMessagesMap(prev => ({ ...prev, [activeId]: mapped }))
        // mark ALL existing messages as seen — Lunna only replies to new ones
        seenMsgIds.current[activeId] = new Set(mapped.map(m => m.id))
        loadedConvs.current.add(activeId)
      })
      .finally(() => setLoadingMsgs(false))
  }, [evo, activeId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  // Poll for new messages every 5s — triggers Lunna auto-reply when active
  useEffect(() => {
    if (!evo || !activeId) return
    const poll = setInterval(async () => {
      try {
        const r    = await fetch('/api/evolution/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...evo, remoteJid: activeId }),
        })
        const data = await r.json()
        if (!Array.isArray(data)) return
        const mapped = data.map(mapMessage)

        // Wait until initial load is done to avoid replying to history
        if (!loadedConvs.current.has(activeId)) {
          seenMsgIds.current[activeId] = new Set(mapped.map(m => m.id))
          loadedConvs.current.add(activeId)
          setMessagesMap(prev => ({ ...prev, [activeId]: mapped }))
          return
        }

        // Mark all as seen (webhook handles the actual AI reply — polling only updates UI)
        const seen = seenMsgIds.current[activeId] ?? new Set<string>()
        mapped.forEach(m => seen.add(m.id))
        seenMsgIds.current[activeId] = seen

        setMessagesMap(prev => {
          const current = prev[activeId] ?? []
          // Preserve locally-sent messages (Lunna + operator) not yet confirmed by API
          const unconfirmed = current.filter(m =>
            (m.id.startsWith('lunna-') || m.id.startsWith('temp-')) &&
            !mapped.some(a => a.mine && a.content === m.content)
          )
          const merged = [...mapped, ...unconfirmed]
          // Sort chronologically so unconfirmed messages appear in the right place
          merged.sort((a, b) => a.ts - b.ts)
          return { ...prev, [activeId]: merged }
        })
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(poll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evo, activeId])

  // ── Lunna auto-reply ─────────────────────────────────────────────────────

  async function lunnaAutoReply(convId: string, _freshMsgs: MsgItem[]) {
    const conv       = conversationsRef.current.find(c => c.id === convId)
    const currentEvo = evoRef.current
    if (!conv || !currentEvo) return

    // Use local state — it already has Lunna's previous replies preserved
    const allMsgs = (messagesMapRef.current[convId] ?? [])
      .filter(m => m.type !== 'note')
      .slice(-30)

    setAutoReplying(prev => ({ ...prev, [convId]: true }))
    try {
      const res = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMsgs.map(m => ({ from: m.mine ? 'Lunna' : conv.name, content: m.content })),
          clientName: conv.name,
          gcalToken: gcalTokenRef.current ?? undefined,
          userId: userIdRef.current ?? undefined,
        }),
      })
      const data = await res.json()
      if (!data.reply) return

      await fetch('/api/evolution/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentEvo, number: convId, text: data.reply }),
      })

      const sentMsg: MsgItem = {
        id: `lunna-${Date.now()}`,
        from: 'me',
        content: data.reply,
        time: nowTime(),
        ts: Math.floor(Date.now() / 1000),
        mine: true,
        type: 'text',
      }
      setMessagesMap(prev => ({ ...prev, [convId]: [...(prev[convId] ?? []), sentMsg] }))
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, lastMessage: data.reply, time: 'agora' } : c
      ))
    } catch { /* ignore */ }
    finally {
      setAutoReplying(prev => ({ ...prev, [convId]: false }))
    }
  }

  async function toggleLunna() {
    if (!activeId) return
    const nowPaused = lunnaActiveMap[activeId] ?? true // currently active → will pause
    const newActive = !nowPaused
    setLunnaActiveMap(prev => ({ ...prev, [activeId]: newActive }))
    // Persist to Supabase so webhook also respects the pause
    await fetch('/api/lunna/pausa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remoteJid: activeId, paused: !newActive }),
    })
  }

  // Load Lunna pause states — single batch request, not one per conversation
  useEffect(() => {
    if (conversations.length === 0) return
    fetch('/api/lunna/pausa')
      .then(r => r.ok ? r.json() : { pausedJids: [] })
      .then(({ pausedJids }: { pausedJids: string[] }) => {
        const paused = new Set(pausedJids)
        const loaded: Record<string, boolean> = {}
        conversations.forEach(c => { loaded[c.id] = !paused.has(c.id) })
        setLunnaActiveMap(loaded)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length])

  // Load status + stage from localStorage on mount (instant, reliable)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('msg_meta')
      if (!raw) return
      const meta = JSON.parse(raw) as Record<string, { status?: ConvStatus; stage?: string }>
      const stageMap: Record<string, string> = {}
      const statusMapLocal: Record<string, ConvStatus> = {}
      for (const [jid, val] of Object.entries(meta)) {
        if (val.stage)  stageMap[jid]     = val.stage
        if (val.status) statusMapLocal[jid] = val.status
      }
      setPipelineStageMap(stageMap)
      setStatusMap(statusMapLocal)
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveMeta(jid: string, patch: { status?: ConvStatus; stage?: string }) {
    // localStorage — primary, instant, always works
    try {
      const raw  = localStorage.getItem('msg_meta')
      const meta = raw ? JSON.parse(raw) as Record<string, { status?: ConvStatus; stage?: string }> : {}
      meta[jid]  = { ...meta[jid], ...patch }
      localStorage.setItem('msg_meta', JSON.stringify(meta))
    } catch { /* ignore */ }

    // Admin API route — bypasses RLS so pipeline kanban sees the data
    try {
      const phone = jid.split('@')[0] ?? jid
      const name  = conversations.find(c => c.id === jid)?.name ?? `+${phone}`
      const body: Record<string, unknown> = { remote_jid: jid, title: name, client: name }
      if (patch.stage)  body.stage       = patch.stage
      if (patch.status) body.conv_status = patch.status
      await fetch('/api/pipeline/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err) { console.error('[saveMeta] API error:', err) }
  }

  async function changePipelineStage(stage: PipelineStage) {
    if (!activeId) return
    setPipelineStageMap(prev => ({ ...prev, [activeId]: stage }))
    await saveMeta(activeId, { stage })
  }

  // Fetch client data for active conversation by phone match
  useEffect(() => {
    if (!activeId || !userId) return
    if (clientMap[activeId] !== undefined) return // already cached
    const phone = activeId.split('@')[0] ?? ''
    const digits = phone.replace(/\D/g, '')
    const short  = digits.slice(-9) // last 9 digits for flexible matching

    fetch('/api/team/owner-id')
      .then(r => r.ok ? r.json() : { ownerId: userId })
      .then(({ ownerId }) => supabase
        .from('clientes')
        .select('*')
        .eq('user_id', ownerId)
      )
      .then(({ data }) => {
        if (!data) { setClientMap(p => ({ ...p, [activeId]: null })); return }
        const found = data.find(c => {
          const cd = (c.phone ?? '').replace(/\D/g, '')
          return cd.endsWith(short) || digits.endsWith(cd.slice(-9))
        }) ?? null
        setClientMap(p => ({ ...p, [activeId]: found }))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, userId])

  // ── Actions ──────────────────────────────────────────────────────────────

  function selectConversation(id: string) {
    setActiveId(id)
    localStorage.setItem('mensagens_activeId', id)
    setShowTaskForm(false)
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
  }

  async function sendMessage() {
    if (!input.trim() || !evo || !activeId) return
    const text = input.trim()
    const tempMsg: MsgItem = {
      id: `temp-${Date.now()}`,
      from: 'me',
      content: text,
      time: nowTime(),
      ts: Math.floor(Date.now() / 1000),
      mine: true,
      type: 'text',
    }
    setMessagesMap(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), tempMsg] }))
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, lastMessage: text, time: 'agora' } : c))
    setInput('')
    setSending(true)
    try {
      await fetch('/api/evolution/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...evo, number: activeId, text }),
      })
    } finally {
      setSending(false)
    }
  }

  function addNote() {
    if (!activeNotes.trim() || !activeId) return
    const note: MsgItem = {
      id: `note-${Date.now()}`,
      from: 'me',
      content: activeNotes.trim(),
      time: nowTime(),
      ts: Math.floor(Date.now() / 1000),
      mine: true,
      type: 'note',
    }
    setMessagesMap(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), note] }))
    setNotesMap(prev => ({ ...prev, [activeId]: '' }))
  }

  function saveNotes() {
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  async function changeStatus(status: ConvStatus) {
    if (!activeId) return
    setStatusMap(prev => ({ ...prev, [activeId]: status }))
    await saveMeta(activeId, { status })
  }

  async function handleSummarize() {
    if (!activeId || !activeConv) return
    setIsSummarizing(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: activeMessages
            .filter(m => m.type !== 'note')
            .map(m => ({ from: m.mine ? 'Equipe' : m.from, content: m.content })),
          clientName: activeConv.name,
        }),
      })
      const data = await res.json()
      setSummaryMap(prev => ({ ...prev, [activeId]: data.summary ?? data.error ?? 'Não foi possível gerar.' }))
    } catch {
      setSummaryMap(prev => ({ ...prev, [activeId!]: 'Erro ao conectar com a IA.' }))
    } finally {
      setIsSummarizing(false)
    }
  }

  async function handleSuggestReply() {
    if (!activeId || !activeConv || activeMessages.length === 0) return
    setIsSuggestingReply(true)
    try {
      const res = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: activeMessages
            .filter(m => m.type !== 'note')
            .slice(-20)
            .map(m => ({ from: m.mine ? 'Equipe' : activeConv.name, content: m.content })),
          clientName: activeConv.name,
          gcalToken: gcalToken ?? undefined,
          userId: ownerId ?? userId ?? undefined,
        }),
      })
      const data = await res.json()
      if (data.reply) setInput(data.reply)
    } catch {
      // silently ignore
    } finally {
      setIsSuggestingReply(false)
    }
  }

  function openTaskForm() {
    const last = [...activeMessages].reverse().find(m => !m.mine && m.type === 'text')
    setTaskTitle(last?.content ?? '')
    setTaskDone(false)
    setShowTaskForm(true)
  }

  function createTask() {
    setTaskDone(true)
    setTimeout(() => setShowTaskForm(false), 1600)
  }

  function openNewConv() {
    setNewConvPhone('')
    setNewConvName('')
    setShowNewConv(true)
  }

  function confirmNewConv() {
    const digits = newConvPhone.replace(/\D/g, '')
    if (!digits) return
    // Garante código do país — assume Brasil (55) se não tiver 12+ dígitos
    const full = digits.length >= 12 ? digits : `55${digits}`
    const jid  = `${full}@s.whatsapp.net`
    const name = newConvName.trim() || `+${full}`

    // Cria a conversa localmente se não existir
    if (!conversations.find(c => c.id === jid)) {
      const newConv: ConvItem = {
        id: jid, name, lastMessage: '', time: 'agora', unread: 0, status: 'open',
      }
      setConversations(prev => [newConv, ...prev])
    }
    selectConversation(jid)
    setShowNewConv(false)
  }

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) &&
      (statusFilter === 'all' || (statusMap[c.id] ?? 'open') === statusFilter)
    )
  })

  // ─── Not connected ────────────────────────────────────────────────────────

  if (!evo) {
    return (
      <div className="flex h-[calc(100vh-8.5rem)] rounded-xl overflow-hidden border border-border bg-card">
        <NotConnected />
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-xl overflow-hidden border border-border">

      {/* ── LEFT: Inbox ── */}
      <div className="w-[256px] border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <button
              onClick={() => evo && fetchChats(evo)}
              disabled={loadingChats}
              title="Atualizar"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 shrink-0"
            >
              <RefreshCw size={12} className={loadingChats ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex gap-1">
            {([['all', 'Todos'], ['open', 'Abertas'], ['in_progress', 'Andamento'], ['resolved', 'Resolvidas']] as const).map(
              ([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={`flex-1 h-5 rounded text-[9px] font-medium transition-colors ${
                    statusFilter === val
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {loadingChats && conversations.length === 0 && (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={18} className="text-muted-foreground animate-spin" />
            </div>
          )}
          {!loadingChats && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
              <MessageSquare size={20} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Nenhuma conversa encontrada</p>
            </div>
          )}
          {filtered.map(conv => {
            const st = statusMap[conv.id] ?? 'open'
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full flex items-start gap-2.5 p-3 text-left transition-colors border-l-2 ${
                  conv.id === activeId
                    ? 'bg-primary/8 border-l-primary'
                    : 'border-l-transparent hover:bg-muted/50'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                      {initials(conv.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${statusCfg[st].dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">{conv.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <Phone size={9} className="text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-emerald-400">WhatsApp</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] text-muted-foreground truncate">{conv.lastMessage}</p>
                    {conv.unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] text-primary-foreground font-bold shrink-0">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  {pipelineBadge(pipelineStageMap[conv.id]) && (
                    <span className={`mt-1 inline-flex text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${pipelineBadge(pipelineStageMap[conv.id])!.badge}`}>
                      {pipelineBadge(pipelineStageMap[conv.id])!.label}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5" onClick={openNewConv}>
            <Plus size={12} /> Nova conversa
          </Button>
        </div>
      </div>

      {/* ── Modal Nova Conversa ── */}
      {showNewConv && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowNewConv(false) }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-border">
              <p className="text-sm font-semibold text-foreground">Nova conversa</p>
              <button onClick={() => setShowNewConv(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">Número do WhatsApp</label>
                <input
                  autoFocus
                  value={newConvPhone}
                  onChange={e => setNewConvPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmNewConv()}
                  placeholder="(11) 99999-9999"
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Com ou sem código do país. Sem código assume Brasil (+55).</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">Nome (opcional)</label>
                <input
                  value={newConvName}
                  onChange={e => setNewConvName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmNewConv()}
                  placeholder="Nome do contato"
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
                disabled={!newConvPhone.replace(/\D/g, '')}
                onClick={confirmNewConv}
              >
                Abrir conversa
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewConv(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CENTER: Chat ── */}
      <div className="flex flex-col flex-1 bg-background min-w-0">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  {initials(activeConv.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{activeConv.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{activeId?.split('@')[0]}</p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] flex items-center gap-1 shrink-0">
                <Phone size={9} /> WhatsApp
              </Badge>
              {isLunnaActive && (
                <Badge className="bg-primary/15 text-primary border-0 text-[10px] flex items-center gap-1 shrink-0">
                  <Bot size={9} /> ia
                </Badge>
              )}
              <Badge className={`${statusCfg[activeStatus].color} border-0 text-[10px] flex items-center gap-1 shrink-0`}>
                {statusCfg[activeStatus].icon}
                {statusCfg[activeStatus].label}
              </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs && (
                <div className="flex justify-center py-8">
                  <Loader2 size={18} className="text-muted-foreground animate-spin" />
                </div>
              )}
              {!loadingMsgs && activeMessages.length === 0 && (
                <div className="flex justify-center py-8">
                  <p className="text-xs text-muted-foreground">Nenhuma mensagem encontrada</p>
                </div>
              )}
              {activeMessages.map(msg => {
                if (msg.type === 'note') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="flex items-start gap-2 max-w-md bg-amber-500/8 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
                        <StickyNote size={11} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-amber-400 font-semibold mb-0.5">Anotação interna</p>
                          <p className="text-xs text-foreground">{msg.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
                    {!msg.mine && (
                      <Avatar className="w-6 h-6 mr-2 shrink-0 self-end">
                        <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold">
                          {initials(activeConv.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="max-w-xs lg:max-w-sm xl:max-w-md">
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                        msg.mine
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-card border border-border text-foreground rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-muted-foreground mt-0.5 ${msg.mine ? 'text-right' : 'text-left'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                )
              })}
              {isLunnaTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-card border border-border">
                    <Bot size={11} className="text-primary shrink-0" />
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                    }}
                    placeholder="Escreva uma mensagem… (Enter para enviar)"
                    rows={1}
                    className="w-full resize-none rounded-xl bg-muted border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 pb-0.5">
                  <button
                    title="Sugerir resposta com IA"
                    disabled={isSuggestingReply || activeMessages.length === 0}
                    onClick={handleSuggestReply}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                  >
                    {isSuggestingReply
                      ? <Loader2 size={15} className="animate-spin text-primary" />
                      : <Wand2 size={15} />}
                  </button>
                  <button
                    title="Anexar arquivo"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Paperclip size={15} />
                  </button>
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                  >
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT: Notes + AI panel ── */}
      <div className="w-[252px] border-l border-border bg-card flex flex-col shrink-0 overflow-y-auto">

        {/* Lunna toggle */}
        <div className="p-3 border-b border-border">
          <div className={`rounded-xl p-3 flex items-center gap-3 transition-colors ${
            isLunnaActive
              ? 'bg-primary/8 border border-primary/20'
              : 'bg-muted/60 border border-border'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isLunnaActive ? 'bg-primary/15' : 'bg-muted'
            }`}>
              {isLunnaTyping
                ? <Loader2 size={15} className="text-primary animate-spin" />
                : <Bot size={15} className={isLunnaActive ? 'text-primary' : 'text-muted-foreground'} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold leading-tight ${isLunnaActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {isLunnaTyping ? 'lunna digitando…' : isLunnaActive ? 'IA ativa' : 'atendimento humano'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isLunnaActive ? 'respondendo automaticamente' : 'lunna pausada'}
              </p>
            </div>
            <button
              onClick={toggleLunna}
              disabled={!activeConv}
              title={isLunnaActive ? 'Pausar Lunna' : 'Ativar Lunna'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 ${
                isLunnaActive
                  ? 'bg-primary/15 hover:bg-primary/25 text-primary'
                  : 'bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {isLunnaActive ? <Pause size={13} /> : <UserCheck size={13} />}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status da conversa</p>
          <div className="flex flex-col gap-1">
            {(Object.entries(statusCfg) as [ConvStatus, typeof statusCfg[ConvStatus]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => changeStatus(key)}
                className={`flex items-center gap-2 h-7 px-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeStatus === key
                    ? cfg.color + ' ring-1 ring-inset ring-current/20'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline stage */}
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Etapa do Pipeline</p>
          <div className="flex flex-col gap-1">
            {PIPELINE_STAGES.map(s => {
              const active = activeId ? pipelineStageMap[activeId] === s.id : false
              return (
                <button
                  key={s.id}
                  onClick={() => changePipelineStage(s.id)}
                  disabled={!activeConv}
                  className={`flex items-center gap-2 h-7 px-2.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
                    active
                      ? s.badge + ' ring-1 ring-inset ring-current/20'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-current' : 'bg-muted-foreground/40'}`} />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Internal notes */}
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Anotações internas</p>
          <textarea
            value={activeNotes}
            onChange={e => activeId && setNotesMap(prev => ({ ...prev, [activeId]: e.target.value }))}
            placeholder="Notas visíveis apenas para a equipe…"
            rows={4}
            className="w-full resize-none rounded-lg bg-muted border border-border px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={saveNotes}
              className={`flex-1 h-7 rounded-lg text-xs font-medium transition-all ${
                notesSaved
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {notesSaved ? '✓ Salvo' : 'Salvar'}
            </button>
            <button
              onClick={addNote}
              title="Inserir na linha do tempo"
              className="h-7 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <StickyNote size={12} />
            </button>
          </div>
        </div>

        {/* AI Summary */}
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resumo com IA</p>
          {activeSummary && (
            <div className="rounded-lg bg-orange-500/8 border border-orange-500/20 p-2.5 mb-2">
              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-line">{activeSummary}</p>
            </div>
          )}
          <button
            onClick={handleSummarize}
            disabled={isSummarizing || activeMessages.length === 0}
            className="w-full h-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
          >
            {isSummarizing
              ? <><Loader2 size={12} className="animate-spin" /> Resumindo…</>
              : <><Wand2 size={12} /> Resumir conversa</>}
          </button>
        </div>

        {/* Client data */}
        {(() => {
          const raw = activeId ? clientMap[activeId] : undefined
          if (!activeId || raw === undefined) return null
          const cl = raw as Record<string, string | string[]> | null
          if (cl === null) return (
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dados do Cliente</p>
              <p className="text-[11px] text-muted-foreground">Nenhum cliente cadastrado com este número.</p>
            </div>
          )
          const statusCls: Record<string, string> = {
            active:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
            paused:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
            churned: 'bg-red-500/15 text-red-400 border-red-500/20',
          }
          const statusLbl: Record<string, string> = { active: 'Ativo', paused: 'Pausado', churned: 'Churned' }
          const servicos = Array.isArray(cl.servicos) ? cl.servicos as string[] : []
          return (
            <div className="p-3 border-b border-border space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Dados do Cliente</p>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">
                    {String(cl.name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{String(cl.name ?? '')}</p>
                  {cl.company && <p className="text-[10px] text-muted-foreground truncate">{String(cl.company)}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {cl.status && (
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${statusCls[cl.status as string] ?? 'bg-muted text-muted-foreground border-border'}`}>
                    {statusLbl[cl.status as string] ?? String(cl.status)}
                  </span>
                )}
                {cl.plan && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                    {String(cl.plan)}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {cl.mrr && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">MRR</span>
                    <span className="text-[10px] font-semibold text-foreground">{String(cl.mrr)}</span>
                  </div>
                )}
                {cl.since && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Cliente desde</span>
                    <span className="text-[10px] text-foreground">{String(cl.since)}</span>
                  </div>
                )}
                {cl.segment && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Segmento</span>
                    <span className="text-[10px] text-foreground truncate max-w-[120px] text-right">{String(cl.segment)}</span>
                  </div>
                )}
                {cl.email && (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-muted-foreground shrink-0">Email</span>
                    <span className="text-[10px] text-foreground truncate">{String(cl.email)}</span>
                  </div>
                )}
                {cl.instagram && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Instagram</span>
                    <span className="text-[10px] text-foreground">{String(cl.instagram)}</span>
                  </div>
                )}
              </div>

              {servicos.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Serviços</p>
                  <div className="flex flex-wrap gap-1">
                    {servicos.map((s: string) => (
                      <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cl.notes && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Notas</p>
                  <p className="text-[10px] text-foreground leading-relaxed line-clamp-3">{String(cl.notes)}</p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Convert to task */}
        <div className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ações</p>
          {showTaskForm ? (
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Nova tarefa</p>
                <button onClick={() => setShowTaskForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={12} />
                </button>
              </div>
              <textarea
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="Título da tarefa…"
                rows={3}
                className="w-full resize-none rounded bg-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ChevronDown size={10} />
                <span>Cliente: <span className="text-foreground font-medium">{activeConv?.name ?? '—'}</span></span>
              </div>
              {taskDone ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 size={12} /> Tarefa criada!
                </div>
              ) : (
                <button
                  onClick={createTask}
                  disabled={!taskTitle.trim()}
                  className="w-full h-7 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Criar tarefa
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={openTaskForm}
              disabled={!activeConv}
              className="w-full h-8 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              <CheckSquare2 size={12} />
              Transformar em tarefa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
