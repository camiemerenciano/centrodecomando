'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, CheckSquare, MessageSquare, Clock,
  ArrowRight, AlertTriangle, AlertCircle,
  MessagesSquare, Timer, TrendingUp, DollarSign,
  Circle, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

// ── helpers ───────────────────────────────────────────────────────────────────

function parseMrr(raw: string): number {
  return parseFloat((raw ?? '').replace(/[^\d,]/g, '').replace(',', '.')) || 0
}

function fmtBrl(n: number) {
  if (n === 0) return '–'
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtHours(h: number): string {
  if (h < 1)  return `${Math.round(h * 60)}min`
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}

type Priority = 'low' | 'medium' | 'high' | 'urgent'

const priorityCls: Record<Priority, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/20',
  high:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  medium: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  low:    'bg-muted text-muted-foreground border-border',
}
const priorityLabel: Record<Priority, string> = {
  urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa',
}

function fmtDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  return d
}

const funnelStages = [
  { id: 'recepcao',          label: 'Recepção',          color: 'bg-slate-400'   },
  { id: 'viabilidade',       label: 'Viabilidade',       color: 'bg-indigo-400'  },
  { id: 'ag_agendamento',    label: 'Ag. Agendamento',   color: 'bg-amber-400'   },
  { id: 'agendado',          label: 'Agendado',          color: 'bg-sky-400'     },
  { id: 'contrato_enviado',  label: 'Contrato Enviado',  color: 'bg-orange-400'  },
  { id: 'contrato_assinado', label: 'Contrato Assinado', color: 'bg-emerald-400' },
  { id: 'followup',          label: 'Follow-up',         color: 'bg-violet-400'  },
]

// ── types ─────────────────────────────────────────────────────────────────────

interface Cliente { status: string; mrr: string }
interface Lead    { stage: string }
interface Tarefa  { id: string; title: string; client: string; priority: string; status: string; due_date: string }
interface MsgStats {
  connected: boolean
  naoLidas:   number
  semResposta: number
  novas:      number
  tempoMedio: number | null
}

// ── component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient()
  const todayStr = new Date().toISOString().split('T')[0]

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [leads,    setLeads]    = useState<Lead[]>([])
  const [tarefas,  setTarefas]  = useState<Tarefa[]>([])
  const [msgStats, setMsgStats] = useState<MsgStats>({ connected: false, naoLidas: 0, semResposta: 0, novas: 0, tempoMedio: null })
  const [loading,  setLoading]  = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // ── fetch base data ──────────────────────────────────────────────────────────

  const fetchBase = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: c }, { data: l }, { data: t }] = await Promise.all([
      supabase.from('clientes').select('status, mrr'),
      supabase.from('pipeline_leads').select('stage'),
      supabase.from('tarefas').select('id, title, client, priority, status, due_date'),
    ])

    if (c) setClientes(c)
    if (l) setLeads(l)
    if (t) setTarefas(t)
    setLoading(false)
  }, [supabase])

  // ── fetch messages stats ─────────────────────────────────────────────────────

  const fetchMsgStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/messages')
      if (res.ok) {
        const data = await res.json()
        setMsgStats(data)
        setLastSync(new Date())
      }
    } catch { /* silently ignore */ }
  }, [])

  // ── on mount: load + realtime ────────────────────────────────────────────────

  useEffect(() => {
    fetchBase()
    fetchMsgStats()

    // poll messages every 60s
    const msgInterval = setInterval(fetchMsgStats, 60_000)

    // re-fetch on window focus (switching from mensagens tab back)
    const onFocus = () => fetchMsgStats()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(msgInterval)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchBase, fetchMsgStats])

  // ── supabase realtime ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      const channel = supabase
        .channel('dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_leads', filter: `user_id=eq.${user.id}` },
          () => supabase.from('pipeline_leads').select('stage').then(({ data }) => { if (data) setLeads(data) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas', filter: `user_id=eq.${user.id}` },
          () => supabase.from('tarefas').select('id, title, client, priority, status, due_date').then(({ data }) => { if (data) setTarefas(data) })
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `user_id=eq.${user.id}` },
          () => supabase.from('clientes').select('status, mrr').then(({ data }) => { if (data) setClientes(data) })
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [supabase])

  // ── derived data ─────────────────────────────────────────────────────────────

  const ativos      = clientes.filter(c => c.status === 'active')
  const totalAtivos = ativos.length
  const mrr         = ativos.reduce((s, c) => s + parseMrr(c.mrr), 0)
  const ticket      = totalAtivos > 0 ? mrr / totalAtivos : 0

  const stageCounts: Record<string, number> = {}
  for (const l of leads) stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1
  const totalLeads = funnelStages.reduce((s, st) => s + (stageCounts[st.id] ?? 0), 0)

  const tarefasAbertas   = tarefas.filter(t => t.status !== 'concluido')
  const tarefasAtrasadas = tarefasAbertas.filter(t => t.due_date && t.due_date < todayStr)
  const tarefasUrgentes  = tarefasAbertas.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 5)

  const { connected, naoLidas, semResposta, novas, tempoMedio } = msgStats

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground text-sm">
        <RefreshCw size={14} className="animate-spin" /> Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-[1400px]">

      {/* sync indicator */}
      {lastSync && (
        <div className="flex items-center justify-end gap-1.5 -mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-muted-foreground/50">
            atualizado {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* ── Nível 1: Saúde do Negócio ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Negócio</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="flex-1 p-6 border-b sm:border-b-0 sm:border-r border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clientes Ativos</p>
                    <p className="text-5xl font-bold text-foreground mt-2 leading-none">
                      {totalAtivos > 0 ? totalAtivos : '–'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span className="text-xs text-muted-foreground">
                        {totalAtivos > 0
                          ? `${clientes.length} total cadastrado${clientes.length !== 1 ? 's' : ''}`
                          : 'sem clientes ativos ainda'}
                      </span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col divide-x sm:divide-x-0 sm:divide-y divide-border">
                <div className="flex-1 px-6 py-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">MRR</p>
                  <p className="text-xl font-bold text-foreground mt-1">{fmtBrl(mrr)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">receita mensal</p>
                </div>
                <div className="flex-1 px-6 py-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio</p>
                  <p className="text-xl font-bold text-foreground mt-1">{fmtBrl(ticket)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">por cliente</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Nível 2: Alertas ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={11} className="text-amber-400" />
          <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-400/80">Requer Atenção</span>
          <div className="flex-1 h-px bg-amber-400/20" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border border-l-2 border-l-red-500/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tarefas Atrasadas</p>
                  <p className="text-3xl font-bold text-red-400 mt-1 leading-none">
                    {tarefasAtrasadas.length > 0 ? tarefasAtrasadas.length : '–'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle size={16} className="text-red-400" />
                </div>
              </div>
              <Link href="/tarefas" className="mt-3 flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 transition-colors">
                Ver tarefas <ArrowRight size={10} />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-l-2 border-l-amber-500/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Msgs sem Resposta</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1 leading-none">
                    {semResposta > 0 ? semResposta : connected ? '0' : '–'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <MessagesSquare size={16} className="text-amber-400" />
                </div>
              </div>
              <Link href="/mensagens" className="mt-3 flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                Ver mensagens <ArrowRight size={10} />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-l-2 border-l-violet-500/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tempo Médio sem Resp.</p>
                  <p className="text-3xl font-bold text-violet-400 mt-1 leading-none">
                    {tempoMedio !== null ? fmtHours(tempoMedio) : '–'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Timer size={16} className="text-violet-400" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">tempo médio de resposta</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Nível 3: Operação & Comunicação ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Operação & Comunicação</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tarefas em Aberto</p>
                  <p className="text-3xl font-bold text-sky-400 mt-1 leading-none">
                    {tarefasAbertas.length > 0 ? tarefasAbertas.length : '–'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center">
                  <CheckSquare size={16} className="text-sky-400" />
                </div>
              </div>
              <Link href="/tarefas" className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-400 transition-colors">
                Ver todas <ArrowRight size={10} />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Mensagens Não Lidas</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1 leading-none">
                    {naoLidas > 0 ? naoLidas : connected ? '0' : '–'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                  <MessageSquare size={16} className="text-emerald-400" />
                </div>
              </div>
              <Link href="/mensagens" className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors">
                Ver mensagens <ArrowRight size={10} />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Novas Conversas</p>
                  <p className="text-3xl font-bold text-indigo-400 mt-1 leading-none">
                    {novas > 0 ? novas : connected ? '0' : '–'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-400/10 flex items-center justify-center">
                  <Clock size={16} className="text-indigo-400" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">últimas 24h</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Painéis de detalhe ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-400" />
                  Tarefas Urgentes
                </CardTitle>
                <Link href="/tarefas" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  Ver todas <ArrowRight size={11} />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {tarefasUrgentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CheckSquare size={28} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa urgente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tarefasUrgentes.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                      <Circle size={8} className={t.priority === 'urgent' ? 'text-red-400 shrink-0' : 'text-orange-400 shrink-0'} fill="currentColor" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                        {t.client && <p className="text-[10px] text-muted-foreground">{t.client}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.due_date && (
                          <span className={`text-[10px] ${t.due_date < todayStr ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {fmtDate(t.due_date)}
                          </span>
                        )}
                        <Badge className={`text-[10px] px-1.5 ${priorityCls[t.priority as Priority]}`}>
                          {priorityLabel[t.priority as Priority]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Funil de Vendas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Funil de Vendas</CardTitle>
              <Link href="/pipeline" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver pipeline <ArrowRight size={11} />
              </Link>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{totalLeads} lead{totalLeads !== 1 ? 's' : ''} no funil</p>
          </CardHeader>
          <CardContent className="pt-1 pb-4">
            {totalLeads === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <DollarSign size={28} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground text-center">Nenhum lead no pipeline</p>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {funnelStages.map(stage => {
                  const count = stageCounts[stage.id] ?? 0
                  if (count === 0) return null
                  const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
                  return (
                    <div key={stage.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground truncate">{stage.label}</span>
                        <span className="text-[11px] font-semibold text-foreground ml-2 shrink-0">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${stage.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
