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
  const [lunnaActiveMap, setLunnaActiveMap]       = useState<Record<string, boolean>>({})
  const [autoReplying, setAutoReplying]           = useState<Record<string, boolean>>({})

  const bottomRef        = useRef<HTMLDivElement>(null)
  const supabase         = createClient()
  const seenMsgIds       = useRef<Record<string, Set<string>>>({})
  const loadedConvs      = useRef<Set<string>>(new Set())
  const lunnaActiveRef   = useRef<Record<string, boolean>>({})
  const gcalTokenRef     = useRef<string | null>(null)
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
  useEffect(() => { evoRef.current           = evo },               [evo])
  useEffect(() => { conversationsRef.current = conversations },     [conversations])
  useEffect(() => { messagesMapRef.current   = messagesMap },       [messagesMap])

  // Load all credentials from Supabase on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('integracoes')
        .select('evo_api_url, evo_api_key, evo_instance, gcal_access_token, gcal_refresh_token')
        .eq('user_id', user.id)
        .maybeSingle()

      // WhatsApp
      if (data?.evo_api_url && data?.evo_api_key && data?.evo_instance) {
        setEvo({ apiUrl: data.evo_api_url, apiKey: data.evo_api_key, instanceName: data.evo_instance })
        localStorage.setItem('evo_apiUrl',   data.evo_api_url)
        localStorage.setItem('evo_apiKey',   data.evo_api_key)
        localStorage.setItem('evo_instance', data.evo_instance)
      }

      // Google Calendar — refresh token if available
      if (data?.gcal_refresh_token) {
        try {
          const res = await fetch('/api/auth/google/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: data.gcal_refresh_token }),
          })
          const refreshed = await res.json()
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
      if (data?.gcal_access_token) setGcalToken(data.gcal_access_token)
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
      const mapped = data.map(mapChat).filter(c => c.id)
      setConversations(mapped)
      if (mapped.length > 0 && !activeId) setActiveId(mapped[0].id)
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

        const seen = seenMsgIds.current[activeId] ?? new Set<string>()

        // Find client messages that arrived after initial load
        const newClientMsgs = mapped.filter(m => !m.mine && m.type === 'text' && !seen.has(m.id))

        // Mark all as seen
        mapped.forEach(m => seen.add(m.id))
        seenMsgIds.current[activeId] = seen

        const isLunna = lunnaActiveRef.current[activeId] ?? true
        if (newClientMsgs.length > 0 && isLunna) {
          lunnaAutoReply(activeId, mapped)
        }

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
          userId: userId ?? undefined,
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

  function toggleLunna() {
    if (!activeId) return
    setLunnaActiveMap(prev => ({ ...prev, [activeId]: !(prev[activeId] ?? true) }))
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  function selectConversation(id: string) {
    setActiveId(id)
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

  function changeStatus(status: ConvStatus) {
    if (!activeId) return
    setStatusMap(prev => ({ ...prev, [activeId]: status }))
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
          userId: userId ?? undefined,
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
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">
            <Plus size={12} /> Nova conversa
          </Button>
        </div>
      </div>

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
                  <Bot size={9} /> lunna
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
                {isLunnaTyping ? 'lunna digitando…' : isLunnaActive ? 'lunna ativa' : 'atendimento humano'}
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
