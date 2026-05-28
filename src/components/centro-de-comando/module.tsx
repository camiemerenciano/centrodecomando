'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  AlertTriangle, Calendar, FolderOpen, UsersRound, BarChart3,
  Sparkles, Loader2, RefreshCw, Clock, Wifi, WifiOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

type TarefaAtrasada = { id: string; title: string; due_date: string; diasAtraso: number; projetoNome?: string }
type Reuniao        = { id: string; titulo: string; inicio: string; link?: string }
type ProjetoParado  = { id: string; nome: string; diasParado: number }
type Membro         = { id: string; nome: string; tarefasAtivas: number }
type Etapa          = { stage: string; label: string; count: number }

const STAGE_LABELS: Record<string, string> = {
  recepcao:          'Recepção',
  viabilidade:       'Viabilidade',
  ag_agendamento:    'Ag. Agendamento',
  agendado:          'Agendado',
  contrato_enviado:  'Contrato Enviado',
  contrato_assinado: 'Contrato Assinado',
  followup:          'Follow-up',
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function CentroDeComandoModule() {
  const supabase = createClient()

  const [loading, setLoading]                     = useState(true)
  const [atrasadas, setAtrasadas]                 = useState<TarefaAtrasada[]>([])
  const [reunioes, setReunioes]                   = useState<Reuniao[]>([])
  const [parados, setParados]                     = useState<ProjetoParado[]>([])
  const [sobrecarregados, setSobrecarregados]     = useState<Membro[]>([])
  const [etapas, setEtapas]                       = useState<Etapa[]>([])
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [prioridades, setPrioridades]             = useState('')
  const [loadingAI, setLoadingAI]                 = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const today    = new Date()
    const todayStr = today.toISOString().split('T')[0]

    await Promise.all([
      loadTarefas(user.id, todayStr, today),
      loadProjetos(user.id, today),
      loadMembros(user.id),
      loadPipeline(),
      loadCalendar(user.id),
    ])

    setLoading(false)
  }

  // ── Tarefas atrasadas ──────────────────────────────────────────────────────

  async function loadTarefas(userId: string, todayStr: string, today: Date) {
    const [{ data: tarefasData }, projRes] = await Promise.all([
      supabase
        .from('tarefas')
        .select('id, title, due_date, projeto_id')
        .or(`user_id.eq.${userId},assignee_id.eq.${userId}`)
        .lt('due_date', todayStr)
        .neq('status', 'concluido')
        .order('due_date', { ascending: true }),
      fetch('/api/projetos'),
    ])

    const projetos: { id: string; nome: string }[] = projRes.ok ? await projRes.json() : []
    const projMap: Record<string, string> = {}
    projetos.forEach(p => { projMap[p.id] = p.nome })

    setAtrasadas((tarefasData ?? []).map((t: { id: string; title: string; due_date: string; projeto_id: string | null }) => {
      const due       = new Date(t.due_date + 'T12:00:00')
      const diasAtraso = Math.floor((today.getTime() - due.getTime()) / 86400000)
      return { id: t.id, title: t.title, due_date: t.due_date, diasAtraso, projetoNome: t.projeto_id ? projMap[t.projeto_id] : undefined }
    }))
  }

  // ── Projetos parados ───────────────────────────────────────────────────────

  async function loadProjetos(userId: string, today: Date) {
    const projRes = await fetch('/api/projetos')
    if (!projRes.ok) return
    const projetos: { id: string; nome: string; created_at: string }[] = await projRes.json()

    const { data: tasks } = await supabase
      .from('tarefas')
      .select('projeto_id, created_at')
      .or(`user_id.eq.${userId},assignee_id.eq.${userId}`)
      .neq('status', 'concluido')
      .not('projeto_id', 'is', null)
      .order('created_at', { ascending: false })

    const lastActivity: Record<string, Date> = {}
    ;(tasks ?? []).forEach((t: { projeto_id: string; created_at: string }) => {
      if (t.projeto_id && !lastActivity[t.projeto_id]) {
        lastActivity[t.projeto_id] = new Date(t.created_at)
      }
    })

    setParados(
      projetos
        .map(p => {
          const last      = lastActivity[p.id] ?? new Date(p.created_at)
          const diasParado = Math.floor((today.getTime() - last.getTime()) / 86400000)
          return { id: p.id, nome: p.nome, diasParado }
        })
        .filter(p => p.diasParado >= 7)
        .sort((a, b) => b.diasParado - a.diasParado)
    )
  }

  // ── Membros sobrecarregados ────────────────────────────────────────────────

  async function loadMembros(userId: string) {
    const wsRes = await fetch('/api/team/workspace')
    if (!wsRes.ok) return
    const ws      = await wsRes.json()
    const members: { id: string; nome: string }[] = ws.members ?? []
    if (members.length === 0) return

    const { data: tasks } = await supabase
      .from('tarefas')
      .select('assignee_id')
      .eq('user_id', userId)
      .neq('status', 'concluido')
      .not('assignee_id', 'is', null)

    const counts: Record<string, number> = {}
    ;(tasks ?? []).forEach((t: { assignee_id: string }) => {
      if (t.assignee_id) counts[t.assignee_id] = (counts[t.assignee_id] ?? 0) + 1
    })

    setSobrecarregados(
      members
        .filter(m => (counts[m.id] ?? 0) >= 5)
        .map(m => ({ id: m.id, nome: m.nome, tarefasAtivas: counts[m.id] ?? 0 }))
        .sort((a, b) => b.tarefasAtivas - a.tarefasAtivas)
    )
  }

  // ── Pipeline ───────────────────────────────────────────────────────────────

  async function loadPipeline() {
    const res = await fetch('/api/pipeline/leads')
    if (!res.ok) return
    const leads: { stage: string }[] = await res.json()

    const counts: Record<string, number> = {}
    leads.forEach(l => {
      if (l.stage && l.stage !== 'perdido') {
        counts[l.stage] = (counts[l.stage] ?? 0) + 1
      }
    })

    setEtapas(
      Object.entries(counts)
        .map(([stage, count]) => ({ stage, label: STAGE_LABELS[stage] ?? stage, count }))
        .sort((a, b) => b.count - a.count)
    )
  }

  // ── Google Calendar ────────────────────────────────────────────────────────

  async function loadCalendar(userId: string) {
    const { data } = await supabase
      .from('integracoes')
      .select('gcal_access_token')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data?.gcal_access_token) return
    setCalendarConnected(true)

    try {
      const now = new Date()
      const end = new Date(now.getTime() + 7 * 86400000)
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      url.searchParams.set('timeMin', now.toISOString())
      url.searchParams.set('timeMax', end.toISOString())
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('maxResults', '5')

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${data.gcal_access_token}` },
      })

      if (res.ok) {
        const calData = await res.json()
        setReunioes(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (calData.items ?? []).map((ev: any) => ({
            id:     ev.id,
            titulo: ev.summary ?? '(sem título)',
            inicio: ev.start?.dateTime ?? ev.start?.date ?? '',
            link:   ev.hangoutLink,
          }))
        )
      }
    } catch { /* silent */ }
  }

  // ── AI Priorities ──────────────────────────────────────────────────────────

  async function gerarPrioridades() {
    setLoadingAI(true)
    try {
      const res = await fetch('/api/centro/prioridades', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tarefasAtrasadas:       atrasadas.map(t => ({ titulo: t.title, diasAtraso: t.diasAtraso, projeto: t.projetoNome })),
          reunioes:               reunioes.map(r => ({ titulo: r.titulo, inicio: r.inicio })),
          projetosParados:        parados.map(p => ({ nome: p.nome, diasParado: p.diasParado })),
          membrossobrecarregados: sobrecarregados.map(m => ({ nome: m.nome, tarefasAtivas: m.tarefasAtivas })),
          etapasAcumuladas:       etapas.filter(e => e.count >= 3).map(e => ({ etapa: e.label, quantidade: e.count })),
        }),
      })
      const data = await res.json()
      setPrioridades(data.priorities ?? '')
    } catch { /* silent */ }
    finally { setLoadingAI(false) }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function fmtEvento(dateStr: string) {
    if (!dateStr) return '—'
    const d       = new Date(dateStr)
    const isToday = d.toDateString() === new Date().toDateString()
    if (isToday) {
      return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Centro de Comando</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral operacional do dia</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading} className="h-8 text-xs">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Tarefas Atrasadas',
            value: atrasadas.length,
            icon:  AlertTriangle,
            color: atrasadas.length > 0 ? 'text-red-400'    : 'text-muted-foreground',
            bg:    atrasadas.length > 0 ? 'bg-red-500/10'   : 'bg-muted/30',
          },
          {
            label: calendarConnected ? 'Reuniões (7 dias)' : 'Google Agenda',
            value: calendarConnected ? reunioes.length       : '—',
            icon:  Calendar,
            color: 'text-sky-400',
            bg:    'bg-sky-500/10',
          },
          {
            label: 'Projetos Parados',
            value: parados.length,
            icon:  FolderOpen,
            color: parados.length > 0 ? 'text-amber-400'    : 'text-muted-foreground',
            bg:    parados.length > 0 ? 'bg-amber-500/10'   : 'bg-muted/30',
          },
          {
            label: 'Membros Sobrecrg.',
            value: sobrecarregados.length,
            icon:  UsersRound,
            color: sobrecarregados.length > 0 ? 'text-orange-400'  : 'text-muted-foreground',
            bg:    sobrecarregados.length > 0 ? 'bg-orange-500/10' : 'bg-muted/30',
          },
        ].map(kpi => (
          <div key={kpi.label} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
            <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
              <kpi.icon size={15} className={kpi.color} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-foreground leading-none">
                {loading ? '–' : kpi.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tarefas atrasadas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <CardTitle className="text-sm font-semibold">Tarefas Atrasadas</CardTitle>
              </div>
              <Link href="/tarefas" className="text-[11px] text-primary hover:underline">Ver todas</Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingRow />
            ) : atrasadas.length === 0 ? (
              <EmptyRow text="Nenhuma tarefa atrasada" />
            ) : (
              <div className="space-y-2">
                {atrasadas.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                      {t.projetoNome && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.projetoNome}</p>
                      )}
                    </div>
                    <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px] shrink-0">
                      {t.diasAtraso}d atraso
                    </Badge>
                  </div>
                ))}
                {atrasadas.length > 5 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    +{atrasadas.length - 5} mais
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reuniões próximas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-sky-400" />
                <CardTitle className="text-sm font-semibold">Reuniões Próximas</CardTitle>
              </div>
              {calendarConnected ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Wifi size={10} /> Sincronizado
                </span>
              ) : (
                <Link href="/configuracoes" className="text-[11px] text-primary hover:underline">
                  Conectar agenda
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!calendarConnected ? (
              <div className="flex flex-col items-center gap-2 py-5 text-center">
                <WifiOff size={20} className="text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Google Agenda não conectado</p>
                <Link href="/configuracoes" className="text-[11px] text-primary hover:underline">
                  Configurar em Integrações
                </Link>
              </div>
            ) : loading ? (
              <LoadingRow />
            ) : reunioes.length === 0 ? (
              <EmptyRow text="Sem eventos nos próximos 7 dias" />
            ) : (
              <div className="space-y-2">
                {reunioes.map(r => (
                  <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{r.titulo}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={9} />
                        {fmtEvento(r.inicio)}
                      </p>
                    </div>
                    {r.link && (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-sky-400 hover:underline shrink-0 pt-0.5"
                      >
                        Entrar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projetos parados */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen size={14} className="text-amber-400" />
                <CardTitle className="text-sm font-semibold">Projetos Parados</CardTitle>
              </div>
              <Link href="/projetos" className="text-[11px] text-primary hover:underline">Ver todos</Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingRow />
            ) : parados.length === 0 ? (
              <EmptyRow text="Nenhum projeto parado" />
            ) : (
              <div className="space-y-2">
                {parados.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <p className="text-xs font-medium text-foreground flex-1 truncate">{p.nome}</p>
                    <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] shrink-0">
                      {p.diasParado}d parado
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Etapas acumuladas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-primary" />
                <CardTitle className="text-sm font-semibold">Etapas Acumuladas</CardTitle>
              </div>
              <Link href="/pipeline" className="text-[11px] text-primary hover:underline">Ver pipeline</Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingRow />
            ) : etapas.length === 0 ? (
              <EmptyRow text="Pipeline vazio" />
            ) : (
              <div className="space-y-2.5">
                {etapas.map(e => {
                  const maxCount = Math.max(...etapas.map(x => x.count))
                  const pct      = maxCount > 0 ? Math.round((e.count / maxCount) * 100) : 0
                  const alert    = e.count >= 3
                  return (
                    <div key={e.stage} className="flex items-center gap-3">
                      <p className="text-[11px] text-muted-foreground w-28 shrink-0 truncate">{e.label}</p>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${alert ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <Badge className={`text-[10px] border-0 shrink-0 ${alert ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {e.count}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Membros sobrecarregados — só aparece se houver */}
      {!loading && sobrecarregados.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UsersRound size={14} className="text-orange-400" />
              <CardTitle className="text-sm font-semibold">Membros Sobrecarregados</CardTitle>
              <Badge className="bg-orange-500/15 text-orange-400 border-0 text-[10px]">5+ tarefas ativas</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sobrecarregados.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-[11px] font-bold text-orange-400 shrink-0">
                    {m.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{m.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{m.tarefasAtivas} tarefas ativas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prioridades do dia com IA */}
      <Card className="bg-card border-border ring-1 ring-primary/15">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <CardTitle className="text-sm font-semibold">Prioridades do Dia com IA</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={gerarPrioridades}
              disabled={loadingAI || loading}
              className="h-7 text-xs"
            >
              {loadingAI ? (
                <><Loader2 size={12} className="animate-spin" /> Gerando…</>
              ) : (
                <><Sparkles size={12} /> {prioridades ? 'Regerar' : 'Gerar Prioridades'}</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {prioridades ? (
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {prioridades}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clique em "Gerar Prioridades" para que a IA analise o contexto atual e defina o que focar hoje.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Micro helpers ────────────────────────────────────────────────────────────

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
      <Loader2 size={13} className="animate-spin" /> Carregando…
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground py-4 text-center">{text}</p>
}
