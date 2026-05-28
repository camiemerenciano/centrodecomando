'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  AlertTriangle, Calendar, Sparkles, Loader2, RefreshCw,
  Clock, Wifi, WifiOff, FolderOpen, Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

type TarefaAtrasada = { id: string; title: string; due_date: string; diasAtraso: number; projetoNome?: string }
type Reuniao        = { id: string; titulo: string; inicio: string; link?: string }

type HealthData = {
  score: number
  label: string
  color: string
  bg: string
  atrasadas: number
  concluidas: number
  emAndamento: number
}

// ─── Health calculation ───────────────────────────────────────────────────────

function calcHealth(atrasadas: number, concluidas: number, emAndamento: number): HealthData {
  const total        = atrasadas + concluidas + emAndamento
  const completionR  = total > 0 ? concluidas   / total : 0
  const overdueR     = total > 0 ? atrasadas    / total : 0
  const score        = Math.round((completionR * 50) + ((1 - overdueR) * 50))
  const clamped      = Math.max(0, Math.min(100, score))

  if (clamped >= 85) return { score: clamped, label: 'Excelente', color: 'text-emerald-400', bg: 'bg-emerald-500/10', atrasadas, concluidas, emAndamento }
  if (clamped >= 70) return { score: clamped, label: 'Bom',       color: 'text-sky-400',     bg: 'bg-sky-500/10',     atrasadas, concluidas, emAndamento }
  if (clamped >= 50) return { score: clamped, label: 'Regular',   color: 'text-amber-400',   bg: 'bg-amber-500/10',   atrasadas, concluidas, emAndamento }
  if (clamped >= 30) return { score: clamped, label: 'Atenção',   color: 'text-orange-400',  bg: 'bg-orange-500/10',  atrasadas, concluidas, emAndamento }
  return              { score: clamped, label: 'Crítico',  color: 'text-red-400',     bg: 'bg-red-500/10',     atrasadas, concluidas, emAndamento }
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function CentroDeComandoModule() {
  const supabase = createClient()

  const [loading, setLoading]                     = useState(true)
  const [atrasadas, setAtrasadas]                 = useState<TarefaAtrasada[]>([])
  const [reunioes, setReunioes]                   = useState<Reuniao[]>([])
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [health, setHealth]                       = useState<HealthData | null>(null)
  const [projetosAtivos, setProjetosAtivos]       = useState(0)
  const [prioridades, setPrioridades]             = useState('')
  const [loadingAI, setLoadingAI]                 = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const today    = new Date()
    const todayStr = today.toISOString().split('T')[0]

    await Promise.all([
      loadTarefas(user.id, todayStr, today),
      loadCalendar(user.id),
      loadProjetos(),
    ])

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Tarefas + saúde operacional ────────────────────────────────────────────

  async function loadTarefas(userId: string, todayStr: string, today: Date) {
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000).toISOString()

    const [{ data: tarefasData }, projRes, { count: concluidasCount }, { count: emAndamentoCount }] = await Promise.all([
      // Atrasadas
      supabase
        .from('tarefas')
        .select('id, title, due_date, projeto_id')
        .or(`user_id.eq.${userId},assignee_id.eq.${userId}`)
        .lt('due_date', todayStr)
        .not('status', 'in', '("concluido","arquivado")')
        .order('due_date', { ascending: true }),

      fetch('/api/projetos'),

      // Concluídas nos últimos 30 dias
      supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},assignee_id.eq.${userId}`)
        .eq('status', 'concluido')
        .gte('created_at', thirtyDaysAgo),

      // Em andamento
      supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},assignee_id.eq.${userId}`)
        .eq('status', 'em_andamento'),
    ])

    const projetos: { id: string; nome: string }[] = projRes.ok ? await projRes.json() : []
    const projMap: Record<string, string> = {}
    projetos.forEach(p => { projMap[p.id] = p.nome })

    const atrasadasList = (tarefasData ?? []).map((t: { id: string; title: string; due_date: string; projeto_id: string | null }) => {
      const due        = new Date(t.due_date + 'T12:00:00')
      const diasAtraso = Math.floor((today.getTime() - due.getTime()) / 86400000)
      return { id: t.id, title: t.title, due_date: t.due_date, diasAtraso, projetoNome: t.projeto_id ? projMap[t.projeto_id] : undefined }
    })

    setAtrasadas(atrasadasList)
    setHealth(calcHealth(atrasadasList.length, concluidasCount ?? 0, emAndamentoCount ?? 0))
  }

  // ── Projetos ativos ────────────────────────────────────────────────────────

  async function loadProjetos() {
    const res = await fetch('/api/projetos')
    if (!res.ok) return
    const projetos: unknown[] = await res.json()
    setProjetosAtivos(projetos.length)
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
      url.searchParams.set('maxResults', '10')

      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${data.gcal_access_token}` } })
      if (res.ok) {
        const calData = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setReunioes((calData.items ?? []).map((ev: any) => ({
          id: ev.id, titulo: ev.summary ?? '(sem título)',
          inicio: ev.start?.dateTime ?? ev.start?.date ?? '', link: ev.hangoutLink,
        })))
      }
    } catch { /* silent */ }
  }

  // ── AI Priorities ──────────────────────────────────────────────────────────

  async function gerarPrioridades() {
    setLoadingAI(true)
    try {
      const res = await fetch('/api/centro/prioridades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarefasAtrasadas: atrasadas.map(t => ({ titulo: t.title, diasAtraso: t.diasAtraso, projeto: t.projetoNome })),
          reunioes:         reunioes.map(r => ({ titulo: r.titulo, inicio: r.inicio })),
          saudeOperacional: health ? { score: health.score, label: health.label, atrasadas: health.atrasadas, concluidas: health.concluidas, emAndamento: health.emAndamento } : null,
          projetosAtivos,
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
    if (isToday) return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tarefas atrasadas */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${atrasadas.length > 0 ? 'bg-red-500/10' : 'bg-muted/30'}`}>
            <AlertTriangle size={15} className={atrasadas.length > 0 ? 'text-red-400' : 'text-muted-foreground'} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground leading-none">{loading ? '–' : atrasadas.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Tarefas Atrasadas</p>
          </div>
        </div>

        {/* Reuniões */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
            <Calendar size={15} className="text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground leading-none">
              {loading ? '–' : calendarConnected ? reunioes.length : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              {calendarConnected ? 'Reuniões (7 dias)' : 'Google Agenda'}
            </p>
          </div>
        </div>

        {/* Projetos ativos */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <FolderOpen size={15} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground leading-none">{loading ? '–' : projetosAtivos}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Projetos Ativos</p>
          </div>
        </div>

        {/* Saúde operacional */}
        <div className={`flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 ${health ? health.bg : 'bg-muted/30'}`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${health ? health.bg : 'bg-muted/30'}`}>
            <Activity size={15} className={health ? health.color : 'text-muted-foreground'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className={`text-2xl font-bold leading-none ${health ? health.color : 'text-muted-foreground'}`}>
                {loading ? '–' : health ? health.score : '—'}
              </p>
              {health && !loading && <span className="text-[10px] text-muted-foreground">/100</span>}
            </div>
            <p className={`text-[10px] mt-0.5 leading-tight font-medium ${health ? health.color : 'text-muted-foreground'}`}>
              {loading ? 'Calculando…' : health ? `Saúde ${health.label}` : 'Saúde Operacional'}
            </p>
          </div>
        </div>
      </div>

      {/* Saúde operacional — detalhe */}
      {!loading && health && (
        <Card className={`border-border bg-card`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={14} className={health.color} />
                <CardTitle className="text-sm font-semibold">Saúde Operacional</CardTitle>
                <Badge className={`text-[10px] border-0 ${health.bg} ${health.color}`}>{health.label}</Badge>
              </div>
              <span className={`text-2xl font-bold tabular-nums ${health.color}`}>{health.score}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Score bar */}
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  health.score >= 85 ? 'bg-emerald-400' :
                  health.score >= 70 ? 'bg-sky-400' :
                  health.score >= 50 ? 'bg-amber-400' :
                  health.score >= 30 ? 'bg-orange-400' : 'bg-red-400'
                }`}
                style={{ width: `${health.score}%` }}
              />
            </div>
            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2.5">
                <p className="text-lg font-bold text-red-400 tabular-nums">{health.atrasadas}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Atrasadas</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2.5">
                <p className="text-lg font-bold text-emerald-400 tabular-nums">{health.concluidas}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Concluídas (30d)</p>
              </div>
              <div className="bg-sky-500/5 border border-sky-500/10 rounded-lg px-3 py-2.5">
                <p className="text-lg font-bold text-sky-400 tabular-nums">{health.emAndamento}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Em Andamento</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Índice calculado com base na proporção de tarefas atrasadas, concluídas e em andamento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tarefas + Reuniões */}
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
                {atrasadas.slice(0, 8).map(t => (
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
                {atrasadas.length > 8 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    +{atrasadas.length - 8} mais
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
                      <a href={r.link} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:underline shrink-0 pt-0.5">
                        Entrar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prioridades do dia com IA */}
      <Card className="bg-card border-border ring-1 ring-primary/15">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <CardTitle className="text-sm font-semibold">Prioridades do Dia com IA</CardTitle>
            </div>
            <Button size="sm" onClick={gerarPrioridades} disabled={loadingAI || loading} className="h-7 text-xs">
              {loadingAI
                ? <><Loader2 size={12} className="animate-spin" /> Gerando…</>
                : <><Sparkles size={12} /> {prioridades ? 'Regerar' : 'Gerar Prioridades'}</>
              }
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
