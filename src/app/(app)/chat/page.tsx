'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Hash, Send, MessageSquareDot, Plus, Lock, Search, X, MessageSquare, Trash2 } from 'lucide-react'

const CANAIS_PADRAO = ['geral', 'projetos', 'avisos']

// ── types ─────────────────────────────────────────────────────────────────────

type Canal = { id: string; nome: string; descricao: string | null; criado_em: string }

type Mensagem = {
  id: string; canal_id: string; autor_id: string
  autor_nome: string; conteudo: string; criado_em: string
}

type Membro = { id: string; nome: string; email: string }

type DMInfo = {
  id: string; room_id: string
  user1_id: string; user2_id: string
  outro_id: string; outro_nome: string
}

type DMMensagem = {
  id: string; dm_id: string; autor_id: string
  autor_nome: string; conteudo: string; criado_em: string
}

type Modo = 'canal' | 'dm'

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

const COLORS = [
  'bg-orange-500/20 text-orange-400', 'bg-sky-500/20 text-sky-400',
  'bg-emerald-500/20 text-emerald-400', 'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400', 'bg-rose-500/20 text-rose-400',
  'bg-indigo-500/20 text-indigo-400',
]

function authorColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function dmRoomId(a: string, b: string) {
  return [a, b].sort().join('_')
}

// ── message list (shared for canal and DM) ────────────────────────────────────

function MessageList({ mensagens, userId, bottomRef }: {
  mensagens: (Mensagem | DMMensagem)[]
  userId: string
  bottomRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="space-y-0.5">
      {mensagens.map((msg, i) => {
        const prev = mensagens[i - 1]
        const showDate = !prev || !isSameDay(prev.criado_em, msg.criado_em)
        const isMe = msg.autor_id === userId
        const groupBreak = !prev || prev.autor_id !== msg.autor_id ||
          new Date(msg.criado_em).getTime() - new Date(prev.criado_em).getTime() > 5 * 60 * 1000

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2">
                  {formatDate(msg.criado_em)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className={`flex gap-3 ${groupBreak ? 'mt-4' : 'mt-0.5'} group`}>
              {groupBreak ? (
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${authorColor(msg.autor_id)}`}>
                  {getInitials(msg.autor_nome)}
                </div>
              ) : (
                <div className="w-7 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {groupBreak && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-xs font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>
                      {isMe ? 'Você' : msg.autor_nome}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.criado_em)}</span>
                  </div>
                )}
                <p className="text-sm text-foreground/85 leading-relaxed break-words">{msg.conteudo}</p>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const supabase = createClient()
  const { user } = useAuth()

  // canais
  const [canais, setCanais]         = useState<Canal[]>([])
  const [ativo, setAtivo]           = useState<Canal | null>(null)
  const [mensagens, setMensagens]   = useState<Mensagem[]>([])
  const [novoCanal, setNovoCanal]   = useState(false)
  const [nomeCanal, setNomeCanal]   = useState('')
  const [errCanal, setErrCanal]     = useState('')
  const [criandoCanal, setCriandoCanal] = useState(false)

  // DMs
  const [modo, setModo]             = useState<Modo>('canal')
  const [dms, setDms]               = useState<DMInfo[]>([])
  const [dmAtivo, setDmAtivo]       = useState<DMInfo | null>(null)
  const [dmMensagens, setDmMensagens] = useState<DMMensagem[]>([])
  const [membros, setMembros]       = useState<Membro[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [buscaMembro, setBuscaMembro] = useState('')
  const [loadingDM, setLoadingDM]   = useState(false)

  // shared
  const [texto, setTexto]           = useState('')
  const [enviando, setEnviando]     = useState(false)
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // ── load workspace (owner + membros) ─────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    fetch('/api/team/workspace').then(r => r.json()).then(data => {
      const ownerId = data.ownerId ?? user.id
      setWorkspaceOwnerId(ownerId)
      if (Array.isArray(data.members)) setMembros(data.members)

      // Carrega canais do workspace
      supabase.from('chat_canais').select('*').eq('user_id', ownerId).order('criado_em')
        .then(async ({ data: canaisData }) => {
          if (canaisData && canaisData.length > 0) {
            setCanais(canaisData); setAtivo(canaisData[0]); return
          }
          // primeira vez — só o owner cria os canais padrão
          if (ownerId !== user.id) return
          const inserts = CANAIS_PADRAO.map(nome => ({ nome, user_id: ownerId, criado_por: ownerId }))
          const { data: criados } = await supabase.from('chat_canais').insert(inserts).select()
          if (criados?.length) { setCanais(criados); setAtivo(criados[0]) }
        })
    })
  }, [user])

  // ── load DMs existentes ──────────────────────────────────────────────────────

  const loadDMs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('chat_dms')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('criado_em', { ascending: false })

    if (!data) return
    setDms(data.map(dm => {
      const outroId   = dm.user1_id === user.id ? dm.user2_id : dm.user1_id
      const membro    = membros.find(m => m.id === outroId)
      return { ...dm, outro_id: outroId, outro_nome: membro?.nome ?? 'Membro' }
    }))
  }, [user, membros, supabase])

  useEffect(() => { loadDMs() }, [loadDMs])

  // ── mensagens do canal ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!ativo || modo !== 'canal') return
    setMensagens([])
    supabase.from('chat_mensagens').select('*').eq('canal_id', ativo.id)
      .order('criado_em', { ascending: true }).limit(200)
      .then(({ data }) => setMensagens(data ?? []))
  }, [ativo, modo])

  useEffect(() => {
    if (!ativo || modo !== 'canal') return
    const ch = supabase.channel(`chat:${ativo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `canal_id=eq.${ativo.id}` },
        (payload) => setMensagens(prev => [...prev, payload.new as Mensagem]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [ativo, modo])

  // ── mensagens do DM ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dmAtivo || modo !== 'dm') return
    setDmMensagens([])
    supabase.from('chat_dm_mensagens').select('*').eq('dm_id', dmAtivo.id)
      .order('criado_em', { ascending: true }).limit(200)
      .then(({ data }) => setDmMensagens(data ?? []))
  }, [dmAtivo, modo])

  useEffect(() => {
    if (!dmAtivo || modo !== 'dm') return
    const ch = supabase.channel(`dm:${dmAtivo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_dm_mensagens', filter: `dm_id=eq.${dmAtivo.id}` },
        (payload) => setDmMensagens(prev => [...prev, payload.new as DMMensagem]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [dmAtivo, modo])

  // ── scroll ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, dmMensagens])

  // ── abrir DM com pessoa ──────────────────────────────────────────────────────

  async function abrirDM(membro: Membro) {
    if (!user) return
    setLoadingDM(true)
    setShowPicker(false)
    setBuscaMembro('')

    const roomId = dmRoomId(user.id, membro.id)

    // busca DM existente
    const { data: existing } = await supabase
      .from('chat_dms')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle()

    if (existing) {
      const dm: DMInfo = { ...existing, outro_id: membro.id, outro_nome: membro.nome }
      setDmAtivo(dm)
      setModo('dm')
      setLoadingDM(false)
      return
    }

    // cria novo DM
    const { data: created } = await supabase
      .from('chat_dms')
      .insert({ room_id: roomId, user1_id: user.id, user2_id: membro.id })
      .select().single()

    if (created) {
      const dm: DMInfo = { ...created, outro_id: membro.id, outro_nome: membro.nome }
      setDms(prev => [dm, ...prev])
      setDmAtivo(dm)
      setModo('dm')
    }
    setLoadingDM(false)
  }

  // ── enviar mensagem ──────────────────────────────────────────────────────────

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || enviando || !user) return
    const nome = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Membro'
    setEnviando(true)

    if (modo === 'canal' && ativo) {
      await supabase.from('chat_mensagens').insert({
        canal_id: ativo.id, autor_id: user.id, autor_nome: nome, conteudo: texto.trim(),
      })
    } else if (modo === 'dm' && dmAtivo) {
      await supabase.from('chat_dm_mensagens').insert({
        dm_id: dmAtivo.id, autor_id: user.id, autor_nome: nome, conteudo: texto.trim(),
      })
    }

    setTexto('')
    setEnviando(false)
    inputRef.current?.focus()
  }

  async function criarCanal(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeCanal.trim() || !user || criandoCanal) return
    setErrCanal('')
    setCriandoCanal(true)
    const nome = nomeCanal.trim().toLowerCase().replace(/\s+/g, '-')
    const ownerId = workspaceOwnerId ?? user.id
    const { data, error } = await supabase
      .from('chat_canais')
      .insert({ nome, user_id: ownerId })
      .select().single()
    setCriandoCanal(false)
    if (error) {
      setErrCanal(error.message)
      return
    }
    if (data) { setCanais(prev => [...prev, data]); setAtivo(data); setModo('canal') }
    setNomeCanal('')
    setNovoCanal(false)
  }

  async function apagarCanal(canal: Canal, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Apagar #${canal.nome}? As mensagens serão perdidas.`)) return
    await supabase.from('chat_mensagens').delete().eq('canal_id', canal.id)
    await supabase.from('chat_canais').delete().eq('id', canal.id)
    setCanais(prev => {
      const lista = prev.filter(c => c.id !== canal.id)
      if (ativo?.id === canal.id) setAtivo(lista[0] ?? null)
      return lista
    })
  }

  const membrosFiltrados = membros.filter(m =>
    m.nome.toLowerCase().includes(buscaMembro.toLowerCase()) ||
    m.email.toLowerCase().includes(buscaMembro.toLowerCase())
  )

  const headerLabel = modo === 'dm' && dmAtivo
    ? dmAtivo.outro_nome
    : modo === 'canal' && ativo ? `#${ativo.nome}` : ''

  const placeholder = modo === 'dm' && dmAtivo
    ? `Mensagem para ${dmAtivo.outro_nome}`
    : modo === 'canal' && ativo ? `Mensagem em #${ativo.nome}` : 'Selecione um canal'

  const currentMsgs = modo === 'dm' ? dmMensagens : mensagens
  const canSend = modo === 'dm' ? !!dmAtivo : !!ativo

  return (
    <div className="flex h-[calc(100vh-57px)] -m-6 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-52 border-r border-border bg-sidebar flex flex-col shrink-0">

        {/* Canais */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Canais</p>
          <button
            onClick={() => setNovoCanal(v => !v)}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
          >
            <Plus size={13} />
          </button>
        </div>

        {novoCanal && (
          <form onSubmit={criarCanal} className="px-3 py-2 border-b border-border space-y-1.5">
            <input
              autoFocus value={nomeCanal} onChange={e => { setNomeCanal(e.target.value); setErrCanal('') }}
              onKeyDown={e => e.key === 'Escape' && (setNovoCanal(false), setNomeCanal(''), setErrCanal(''))}
              placeholder="nome-do-canal"
              className="w-full rounded-md bg-muted border border-border px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errCanal && <p className="text-[10px] text-red-400 px-0.5">{errCanal}</p>}
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={!nomeCanal.trim() || criandoCanal}
                className="flex-1 h-6 rounded-md bg-primary text-white text-[11px] font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {criandoCanal ? '...' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => { setNovoCanal(false); setNomeCanal(''); setErrCanal('') }}
                className="h-6 px-2 rounded-md bg-muted border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <nav className="px-2 py-2 space-y-0.5 overflow-y-auto">
          {canais.map(canal => {
            const ativo_ = modo === 'canal' && ativo?.id === canal.id
            return (
              <div
                key={canal.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                  ativo_
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
                onClick={() => { setAtivo(canal); setModo('canal') }}
              >
                <Hash size={13} className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{canal.nome}</span>
                <button
                  onClick={(e) => apagarCanal(canal, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })}
        </nav>

        {/* Divisor */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Diretas</p>
          <button
            onClick={() => setShowPicker(true)}
            title="Nova conversa privada"
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
          >
            <Plus size={13} />
          </button>
        </div>

        <nav className="px-2 pb-2 space-y-0.5 overflow-y-auto flex-1">
          {dms.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground/50 italic">
              Nenhuma conversa ainda
            </p>
          )}
          {dms.map(dm => (
            <button
              key={dm.id}
              onClick={() => { setDmAtivo(dm); setModo('dm') }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                modo === 'dm' && dmAtivo?.id === dm.id
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold ${authorColor(dm.outro_id)}`}>
                {getInitials(dm.outro_nome)}
              </div>
              <span className="truncate">{dm.outro_nome}</span>
              <Lock size={9} className="shrink-0 opacity-40 ml-auto" />
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Área de mensagens ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">

        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
          {modo === 'dm'
            ? <Lock size={14} className="text-muted-foreground" />
            : <Hash size={15} className="text-muted-foreground" />
          }
          <span className="text-sm font-semibold text-foreground">{headerLabel}</span>
          {modo === 'dm' && (
            <span className="text-xs text-muted-foreground ml-1">· conversa privada</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {currentMsgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              {loadingDM
                ? <div className="text-sm text-muted-foreground">Carregando...</div>
                : <>
                    {modo === 'dm'
                      ? <Lock size={36} className="text-muted-foreground/25" />
                      : <MessageSquareDot size={36} className="text-muted-foreground/25" />
                    }
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {modo === 'dm'
                          ? `Início da sua conversa com ${dmAtivo?.outro_nome}`
                          : 'Nenhuma mensagem ainda'}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {modo === 'dm'
                          ? 'Esta conversa é privada entre vocês dois'
                          : `Seja o primeiro a escrever em #${ativo?.nome}`}
                      </p>
                    </div>
                  </>
              }
            </div>
          ) : (
            <MessageList
              mensagens={currentMsgs}
              userId={user?.id ?? ''}
              bottomRef={bottomRef}
            />
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <form onSubmit={enviar} className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={placeholder}
              disabled={!canSend}
              className="flex-1 rounded-lg bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!texto.trim() || enviando || !canSend}
              className="w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-30 flex items-center justify-center transition-all shrink-0"
            >
              <Send size={14} className="text-white" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Modal: picker de membro ── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) { setShowPicker(false); setBuscaMembro('') } }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-primary" />
                <p className="text-sm font-semibold">Nova conversa privada</p>
              </div>
              <button
                onClick={() => { setShowPicker(false); setBuscaMembro('') }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={buscaMembro}
                  onChange={e => setBuscaMembro(e.target.value)}
                  placeholder="Buscar pessoa..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto py-2">
              {membrosFiltrados.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground text-center">
                  {membros.length === 0 ? 'Nenhum outro membro encontrado' : 'Nenhum resultado'}
                </p>
              ) : (
                membrosFiltrados.map(m => (
                  <button
                    key={m.id}
                    onClick={() => abrirDM(m)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${authorColor(m.id)}`}>
                      {getInitials(m.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.nome}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
