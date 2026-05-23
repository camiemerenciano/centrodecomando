'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Hash, Send, MessageSquareDot, Plus } from 'lucide-react'

type Canal = {
  id: string
  nome: string
  descricao: string | null
  criado_em: string
}

type Mensagem = {
  id: string
  canal_id: string
  autor_id: string
  autor_nome: string
  conteudo: string
  criado_em: string
}

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
  'bg-orange-500/20 text-orange-400',
  'bg-sky-500/20 text-sky-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
  'bg-indigo-500/20 text-indigo-400',
]

function authorColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function ChatPage() {
  const supabase = createClient()
  const { user } = useAuth()

  const [canais, setCanais] = useState<Canal[]>([])
  const [ativo, setAtivo] = useState<Canal | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [novoCanal, setNovoCanal] = useState(false)
  const [nomeCanal, setNomeCanal] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('chat_canais')
      .select('*')
      .order('criado_em')
      .then(({ data }) => {
        if (data?.length) {
          setCanais(data)
          setAtivo(data[0])
        }
      })
  }, [])

  useEffect(() => {
    if (!ativo) return
    setMensagens([])
    supabase
      .from('chat_mensagens')
      .select('*')
      .eq('canal_id', ativo.id)
      .order('criado_em', { ascending: true })
      .limit(200)
      .then(({ data }) => setMensagens(data ?? []))
  }, [ativo])

  useEffect(() => {
    if (!ativo) return
    const channel = supabase
      .channel(`chat:${ativo.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `canal_id=eq.${ativo.id}` },
        (payload) => setMensagens(prev => [...prev, payload.new as Mensagem])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [ativo])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || !ativo || !user || enviando) return
    setEnviando(true)
    const nome = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Membro'
    await supabase.from('chat_mensagens').insert({
      canal_id: ativo.id,
      autor_id: user.id,
      autor_nome: nome,
      conteudo: texto.trim(),
    })
    setTexto('')
    setEnviando(false)
    inputRef.current?.focus()
  }

  async function criarCanal(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeCanal.trim() || !user) return
    const { data } = await supabase
      .from('chat_canais')
      .insert({ nome: nomeCanal.trim().toLowerCase().replace(/\s+/g, '-'), criado_por: user.id })
      .select()
      .single()
    if (data) {
      setCanais(prev => [...prev, data])
      setAtivo(data)
    }
    setNomeCanal('')
    setNovoCanal(false)
  }

  return (
    <div className="flex h-[calc(100vh-57px)] -m-6 overflow-hidden">

      {/* ── Canal sidebar ── */}
      <aside className="w-52 border-r border-border bg-sidebar flex flex-col shrink-0">
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
          <form onSubmit={criarCanal} className="px-3 py-2 border-b border-border">
            <input
              autoFocus
              value={nomeCanal}
              onChange={e => setNomeCanal(e.target.value)}
              placeholder="nome-do-canal"
              className="w-full rounded-md bg-muted border border-border px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </form>
        )}

        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {canais.map(canal => (
            <button
              key={canal.id}
              onClick={() => setAtivo(canal)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                ativo?.id === canal.id
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Hash size={13} className="shrink-0 opacity-70" />
              <span className="truncate">{canal.nome}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Messages area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">

        {/* Channel header */}
        {ativo ? (
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
            <Hash size={15} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{ativo.nome}</span>
            {ativo.descricao && (
              <>
                <span className="text-border">·</span>
                <span className="text-xs text-muted-foreground">{ativo.descricao}</span>
              </>
            )}
          </div>
        ) : (
          <div className="px-5 py-3 border-b border-border shrink-0" />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <MessageSquareDot size={36} className="text-muted-foreground/25" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nenhuma mensagem ainda</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Seja o primeiro a escrever em #{ativo?.nome}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {mensagens.map((msg, i) => {
                const prev = mensagens[i - 1]
                const showDate = !prev || !isSameDay(prev.criado_em, msg.criado_em)
                const isMe = msg.autor_id === user?.id
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
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <form onSubmit={enviar} className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={ativo ? `Mensagem em #${ativo.nome}` : 'Selecione um canal'}
              disabled={!ativo}
              className="flex-1 rounded-lg bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!texto.trim() || enviando}
              className="w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-30 flex items-center justify-center transition-all shrink-0"
            >
              <Send size={14} className="text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
