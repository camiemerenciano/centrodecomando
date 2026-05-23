'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Search, Send, Mic, Wand2, CheckSquare2, StickyNote,
  AtSign, Mail, MessageSquare, Phone, Plus, X, Loader2,
  CheckCircle2, AlertCircle, Circle, FileAudio, Paperclip,
  ChevronDown,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Local types ────────────────────────────────────────────────────────────

type Channel = 'instagram' | 'email' | 'internal' | 'whatsapp'
type ConvStatus = 'open' | 'in_progress' | 'resolved'
type MsgType = 'text' | 'audio' | 'note'

interface ConvItem {
  id: string
  name: string
  company: string
  channel: Channel
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
  mine: boolean
  type: MsgType
  audioUrl?: string
  transcription?: string
  transcribing?: boolean
}

// ─── Static data ─────────────────────────────────────────────────────────────

const INIT_CONVERSATIONS: ConvItem[] = [
  { id: '1', name: 'Ana Beatriz',  company: 'Loja Bloom',   channel: 'instagram', lastMessage: 'Aprovei os layouts! Pode agendar.',       time: '5min',  unread: 2, status: 'open'        },
  { id: '2', name: 'Carlos M.',    company: 'Studio Fit',   channel: 'email',     lastMessage: 'Preciso do relatório até 5ª.',            time: '28min', unread: 1, status: 'in_progress' },
  { id: '3', name: 'Fernanda L.',  company: 'Café Aurora',  channel: 'whatsapp',  lastMessage: 'Ótimo trabalho no feed!',                 time: '1h',    unread: 0, status: 'resolved'    },
  { id: '4', name: 'Diego R.',     company: 'Tech Solve',   channel: 'internal',  lastMessage: 'Podemos agendar uma call?',               time: '3h',    unread: 1, status: 'open'        },
  { id: '5', name: 'Juliana S.',   company: 'Beleza Pura',  channel: 'instagram', lastMessage: 'Quando saem os stories?',                 time: '5h',    unread: 0, status: 'in_progress' },
]

const INIT_MESSAGES: Record<string, MsgItem[]> = {
  '1': [
    { id: '1a', from: 'Ana Beatriz', content: 'Olá! Revisei todas as artes para a campanha do Dia dos Namorados.',                                         time: '14:23', mine: false, type: 'text' },
    { id: '1b', from: 'me',          content: 'Oi Ana! Tudo certo. Conseguiu ver o story animado também?',                                                  time: '14:25', mine: true,  type: 'text' },
    { id: '1c', from: 'Ana Beatriz', content: 'Sim! Amei o efeito. Mas no 3º slide você pode trocar a foto por uma mais quente, tipo casal no pôr do sol?', time: '14:27', mine: false, type: 'text' },
    { id: '1d', from: 'me',          content: 'Claro! Já tenho algumas opções no banco. Te mando uma prévia em 20 minutos.',                                 time: '14:30', mine: true,  type: 'text' },
    { id: '1e', from: 'Ana Beatriz', content: 'Aprovei os layouts! Pode agendar.',                                                                           time: '14:48', mine: false, type: 'text' },
  ],
  '2': [
    { id: '2a', from: 'Carlos M.', content: 'Bom dia! Precisamos do relatório de performance de abril.',    time: '09:15', mine: false, type: 'text' },
    { id: '2b', from: 'me',        content: 'Bom dia Carlos! Já estou preparando, envio até amanhã.',       time: '09:30', mine: true,  type: 'text' },
    { id: '2c', from: 'Carlos M.', content: 'Preciso do relatório até quinta-feira no máximo.',              time: '09:45', mine: false, type: 'text' },
  ],
  '3': [
    { id: '3a', from: 'Fernanda L.', content: 'Amei as artes do feed! A estética ficou perfeita.',  time: '11:00', mine: false, type: 'text' },
    { id: '3b', from: 'me',          content: 'Que ótimo! Ficamos felizes que gostou.',              time: '11:15', mine: true,  type: 'text' },
    { id: '3c', from: 'Fernanda L.', content: 'Ótimo trabalho no feed!',                            time: '11:20', mine: false, type: 'text' },
  ],
  '4': [
    { id: '4a', from: 'Diego R.', content: 'Olá, temos que discutir a estratégia do próximo trimestre.', time: '10:00', mine: false, type: 'text' },
    { id: '4b', from: 'me',       content: 'Com certeza! Quando seria melhor para você?',                 time: '10:05', mine: true,  type: 'text' },
    { id: '4c', from: 'Diego R.', content: 'Podemos agendar uma call para esta semana?',                   time: '10:10', mine: false, type: 'text' },
  ],
  '5': [
    { id: '5a', from: 'Juliana S.', content: 'Olá! Os stories da semana já estão prontos?',    time: '08:30', mine: false, type: 'text' },
    { id: '5b', from: 'me',         content: 'Estamos finalizando! Devemos ter até amanhã.',    time: '08:45', mine: true,  type: 'text' },
    { id: '5c', from: 'Juliana S.', content: 'Quando saem os stories?',                         time: '09:00', mine: false, type: 'text' },
  ],
}

// ─── Config maps ─────────────────────────────────────────────────────────────

const channelIcon: Record<Channel, React.ReactNode> = {
  instagram: <AtSign size={10} />,
  email:     <Mail size={10} />,
  internal:  <MessageSquare size={10} />,
  whatsapp:  <Phone size={10} />,
}

const channelColor: Record<Channel, string> = {
  instagram: 'bg-pink-500/15 text-pink-400',
  email:     'bg-sky-500/15 text-sky-400',
  internal:  'bg-orange-500/15 text-orange-400',
  whatsapp:  'bg-emerald-500/15 text-emerald-400',
}

const statusCfg: Record<ConvStatus, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  open:        { label: 'Aberta',       color: 'bg-sky-500/15 text-sky-400',     dot: 'bg-sky-400',     icon: <Circle size={9} />        },
  in_progress: { label: 'Em andamento', color: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-400',   icon: <AlertCircle size={9} />   },
  resolved:    { label: 'Resolvida',    color: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400', icon: <CheckCircle2 size={9} /> },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MensagensModule() {
  const [conversations, setConversations] = useState(INIT_CONVERSATIONS)
  const [messagesMap, setMessagesMap]     = useState(INIT_MESSAGES)
  const [activeId, setActiveId]           = useState('1')
  const [input, setInput]                 = useState('')
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<'all' | ConvStatus>('all')

  // Right panel state (per conversation)
  const [notesMap, setNotesMap]           = useState<Record<string, string>>({})
  const [notesSaved, setNotesSaved]       = useState(false)
  const [summaryMap, setSummaryMap]       = useState<Record<string, string>>({})
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle]       = useState('')
  const [taskDone, setTaskDone]         = useState(false)

  const audioRef     = useRef<HTMLInputElement>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)

  const activeConv     = conversations.find(c => c.id === activeId)!
  const activeMessages = messagesMap[activeId] ?? []
  const activeNotes    = notesMap[activeId] ?? ''
  const activeSummary  = summaryMap[activeId] ?? null

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    return (
      (c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || c.status === statusFilter)
    )
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  // ── Actions ──────────────────────────────────────────────────────────────

  function selectConversation(id: string) {
    setActiveId(id)
    setShowTaskForm(false)
    // clear unread
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
  }

  function sendMessage() {
    if (!input.trim()) return
    const msg: MsgItem = {
      id: `msg-${Date.now()}`,
      from: 'me',
      content: input.trim(),
      time: now(),
      mine: true,
      type: 'text',
    }
    appendMessage(msg)
    setConversations(prev =>
      prev.map(c => c.id === activeId ? { ...c, lastMessage: input.trim(), time: 'agora' } : c)
    )
    setInput('')
  }

  function appendMessage(msg: MsgItem) {
    setMessagesMap(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), msg] }))
  }

  function updateMessage(id: string, patch: Partial<MsgItem>) {
    setMessagesMap(prev => ({
      ...prev,
      [activeId]: prev[activeId].map(m => m.id === id ? { ...m, ...patch } : m),
    }))
  }

  function saveNotes() {
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  function changeStatus(status: ConvStatus) {
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, status } : c))
  }

  async function handleSummarize() {
    setIsSummarizing(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: activeMessages
            .filter(m => m.type !== 'note')
            .map(m => ({ from: m.from === 'me' ? 'Equipe' : m.from, content: m.content })),
          clientName: activeConv.name,
        }),
      })
      const data = await res.json()
      setSummaryMap(prev => ({
        ...prev,
        [activeId]: data.summary ?? data.error ?? 'Não foi possível gerar o resumo.',
      }))
    } catch {
      setSummaryMap(prev => ({ ...prev, [activeId]: 'Erro ao conectar com a IA.' }))
    } finally {
      setIsSummarizing(false)
    }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const tempId = `audio-${Date.now()}`
    const audioUrl = URL.createObjectURL(file)

    appendMessage({ id: tempId, from: 'me', content: '', time: now(), mine: true, type: 'audio', audioUrl, transcribing: true })
    setIsTranscribing(true)

    try {
      const form = new FormData()
      form.append('audio', file)
      const res  = await fetch('/api/ai/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      updateMessage(tempId, { transcription: data.transcription ?? data.error ?? 'Transcrição indisponível', transcribing: false })
    } catch {
      updateMessage(tempId, { transcription: 'Erro na transcrição.', transcribing: false })
    } finally {
      setIsTranscribing(false)
      if (audioRef.current) audioRef.current.value = ''
    }
  }

  function openTaskForm() {
    const lastClientMsg = [...activeMessages].reverse().find(m => !m.mine && m.type === 'text')
    setTaskTitle(lastClientMsg?.content ?? '')
    setTaskDone(false)
    setShowTaskForm(true)
  }

  function createTask() {
    // In production: POST to Supabase tasks table with org_id + client_id
    setTaskDone(true)
    setTimeout(() => setShowTaskForm(false), 1600)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-xl overflow-hidden border border-border">

      {/* ── LEFT: Inbox ── */}
      <div className="w-[256px] border-r border-border bg-card flex flex-col shrink-0">
        {/* Search + filter */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
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

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.map(conv => (
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
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
                    {initials(conv.name)}
                  </AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${statusCfg[conv.status].dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-xs font-semibold text-foreground truncate">{conv.name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] text-muted-foreground truncate">{conv.company}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className={`flex items-center gap-0.5 text-[10px] shrink-0 ${channelColor[conv.channel].split(' ')[1]}`}>
                    {channelIcon[conv.channel]}
                  </span>
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
          ))}
        </div>

        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">
            <Plus size={12} /> Nova conversa
          </Button>
        </div>
      </div>

      {/* ── CENTER: Chat ── */}
      <div className="flex flex-col flex-1 bg-background min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initials(activeConv.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{activeConv.name}</p>
            <p className="text-xs text-muted-foreground">{activeConv.company}</p>
          </div>
          <Badge className={`${channelColor[activeConv.channel]} border-0 text-[10px] flex items-center gap-1 shrink-0`}>
            {channelIcon[activeConv.channel]}
            <span className="capitalize">{activeConv.channel}</span>
          </Badge>
          <Badge className={`${statusCfg[activeConv.status].color} border-0 text-[10px] flex items-center gap-1 shrink-0`}>
            {statusCfg[activeConv.status].icon}
            {statusCfg[activeConv.status].label}
          </Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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

            if (msg.type === 'audio') {
              return (
                <div key={msg.id} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
                  {!msg.mine && (
                    <Avatar className="w-6 h-6 mr-2 shrink-0 self-end">
                      <AvatarFallback className="bg-primary/20 text-primary text-[9px] font-semibold">
                        {initials(activeConv.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="max-w-xs">
                    <div className={`px-3 py-2.5 rounded-2xl space-y-1.5 ${
                      msg.mine
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-card border border-border rounded-bl-sm'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FileAudio size={13} className="shrink-0" />
                        <span className="text-xs font-medium">Áudio</span>
                        {msg.audioUrl && (
                          <audio controls src={msg.audioUrl} className="h-5 max-w-[100px] opacity-80" />
                        )}
                      </div>
                      {msg.transcribing ? (
                        <div className="flex items-center gap-1.5 text-[10px] opacity-70">
                          <Loader2 size={9} className="animate-spin" />
                          Transcrevendo…
                        </div>
                      ) : msg.transcription ? (
                        <p className="text-[11px] opacity-80 italic leading-snug">
                          &ldquo;{msg.transcription}&rdquo;
                        </p>
                      ) : null}
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${msg.mine ? 'text-right' : 'text-left'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
                {!msg.mine && (
                  <Avatar className="w-6 h-6 mr-2 shrink-0 self-end">
                    <AvatarFallback className="bg-primary/20 text-primary text-[9px] font-semibold">
                      {initials(activeConv.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-xs lg:max-w-sm xl:max-w-md">
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
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
                placeholder="Escreva uma mensagem… (Enter para enviar, Shift+Enter nova linha)"
                rows={1}
                className="w-full resize-none rounded-xl bg-muted border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-1 pb-0.5">
              <input
                ref={audioRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioUpload}
              />
              <button
                onClick={() => audioRef.current?.click()}
                disabled={isTranscribing}
                title="Enviar áudio para transcrição"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {isTranscribing
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Mic size={15} />}
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
                disabled={!input.trim()}
                className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
              >
                <Send size={13} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Notes + AI panel ── */}
      <div className="w-[252px] border-l border-border bg-card flex flex-col shrink-0 overflow-y-auto">

        {/* Status */}
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status da conversa</p>
          <div className="flex flex-col gap-1">
            {(Object.entries(statusCfg) as [ConvStatus, typeof statusCfg[ConvStatus]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => changeStatus(key)}
                className={`flex items-center gap-2 h-7 px-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeConv.status === key
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
            onChange={e => setNotesMap(prev => ({ ...prev, [activeId]: e.target.value }))}
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
              onClick={() => {
                if (!activeNotes.trim()) return
                appendMessage({
                  id: `note-${Date.now()}`,
                  from: 'me',
                  content: activeNotes.trim(),
                  time: now(),
                  mine: true,
                  type: 'note',
                })
                setNotesMap(prev => ({ ...prev, [activeId]: '' }))
              }}
              title="Inserir na linha do tempo da conversa"
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
            disabled={isSummarizing}
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
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
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
                <span>Cliente: <span className="text-foreground font-medium">{activeConv.company}</span></span>
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
              className="w-full h-8 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
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
