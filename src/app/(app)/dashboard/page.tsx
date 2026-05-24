import Link from 'next/link'
import {
  Users, CheckSquare, MessageSquare, Clock,
  ArrowRight, AlertTriangle, AlertCircle,
  MessagesSquare, Timer, TrendingUp, DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function parseMrr(raw: string): number {
  return parseFloat((raw ?? '').replace(/[^\d,]/g, '').replace(',', '.')) || 0
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── Clientes ────────────────────────────────────────────────────────────────
  const { data: clientes } = user
    ? await supabase.from('clientes').select('status, mrr').eq('user_id', user.id)
    : { data: [] }

  const ativos      = (clientes ?? []).filter(c => c.status === 'active')
  const totalAtivos = ativos.length
  const mrr         = ativos.reduce((s, c) => s + parseMrr(c.mrr), 0)
  const ticket      = totalAtivos > 0 ? mrr / totalAtivos : 0

  function fmtBrl(n: number) {
    if (n === 0) return '–'
    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // ── Pipeline (funil) ────────────────────────────────────────────────────────
  const { data: leads } = user
    ? await supabase.from('pipeline_leads').select('stage').eq('user_id', user.id)
    : { data: [] }

  const stageCounts: Record<string, number> = {}
  for (const l of leads ?? []) {
    stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1
  }

  const funnelStages = [
    { id: 'recepcao',          label: 'Recepção',           color: 'bg-slate-400' },
    { id: 'viabilidade',       label: 'Viabilidade',        color: 'bg-indigo-400' },
    { id: 'ag_agendamento',    label: 'Ag. Agendamento',    color: 'bg-amber-400' },
    { id: 'agendado',          label: 'Agendado',           color: 'bg-sky-400' },
    { id: 'contrato_enviado',  label: 'Contrato Enviado',   color: 'bg-orange-400' },
    { id: 'contrato_assinado', label: 'Contrato Assinado',  color: 'bg-emerald-400' },
    { id: 'followup',          label: 'Follow-up',          color: 'bg-violet-400' },
  ]
  const totalLeads = funnelStages.reduce((s, st) => s + (stageCounts[st.id] ?? 0), 0)

  return (
    <div className="space-y-8 max-w-[1400px]">

      {/* ── Nível 1: Saúde do Negócio ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Negócio</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Featured stat */}
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
                          ? `${(clientes ?? []).length} total cadastrado${(clientes ?? []).length !== 1 ? 's' : ''}`
                          : 'sem clientes ativos ainda'}
                      </span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </div>
                </div>
              </div>

              {/* Secondary info */}
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
                  <p className="text-3xl font-bold text-red-400 mt-1 leading-none">–</p>
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
                  <p className="text-3xl font-bold text-amber-400 mt-1 leading-none">–</p>
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
                  <p className="text-3xl font-bold text-violet-400 mt-1 leading-none">–</p>
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
                  <p className="text-3xl font-bold text-sky-400 mt-1 leading-none">–</p>
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
                  <p className="text-3xl font-bold text-emerald-400 mt-1 leading-none">–</p>
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
                  <p className="text-3xl font-bold text-indigo-400 mt-1 leading-none">–</p>
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
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckSquare size={28} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa urgente</p>
              </div>
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
