'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useEmpresa } from '@/contexts/empresa-context'
import {
  Plus, X, Pencil, Trash2, ChevronDown, Calendar,
  FolderKanban, Clock, Layers, CheckCircle2, PauseCircle,
  XCircle, Loader2, ChevronLeft, GripVertical, User,
  AlertCircle, MoreHorizontal, Circle, ArrowRight, Check,
  ExternalLink, Link2, FileText, Target, TrendingUp, TrendingDown,
  Copy, BarChart3, Info, Lock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjStatus = 'ativo' | 'pausado' | 'concluido' | 'cancelado'
type Priority   = 'low' | 'medium' | 'high' | 'urgent'
type AcaoStatus = 'fazer' | 'fazendo' | 'feito'
type MetaStatus = 'em_andamento' | 'atingida' | 'nao_atingida'
type CusTipo    = 'entrada' | 'saida'
type ProjetoTab = 'sobre' | 'planejamento' | 'custos' | 'metas' | 'links' | 'relatorios'

interface Projeto {
  id: string; nome: string; descricao: string; cliente: string
  status: ProjStatus; prioridade: Priority
  data_inicio: string | null; data_fim: string | null
  cor: string; created_at: string
}

interface Acao {
  id: string; projeto_id: string
  titulo: string; descricao: string; responsavel: string
  prazo: string | null; prioridade: Priority
  status: AcaoStatus; ordem: number; created_at: string
  dependencias: string[]
}

interface Custo {
  id: string; projeto_id: string
  descricao: string; categoria: string
  valor: number; tipo: CusTipo
  data: string | null; created_at: string
}

interface Meta {
  id: string; projeto_id: string
  titulo: string; descricao: string
  valor_meta: number | null; valor_atual: number | null; unidade: string
  status: MetaStatus; created_at: string
}

interface ProjetoLink {
  id: string; projeto_id: string
  titulo: string; url: string; categoria: string
  created_at: string
}

interface Relatorio {
  id: string; projeto_id: string
  titulo: string; conteudo: string
  data_referencia: string | null; created_at: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ProjStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ativo:     { label: 'Ativo',     cls: 'bg-emerald-500/15 text-emerald-400 border-0', icon: <Layers size={10} />       },
  pausado:   { label: 'Pausado',   cls: 'bg-amber-500/15 text-amber-400 border-0',     icon: <PauseCircle size={10} />  },
  concluido: { label: 'Concluído', cls: 'bg-sky-500/15 text-sky-400 border-0',         icon: <CheckCircle2 size={10} /> },
  cancelado: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-400 border-0',         icon: <XCircle size={10} />      },
}

const PRIORITY_CFG: Record<Priority, { label: string; dot: string; color: string }> = {
  urgent: { label: 'Urgente', dot: 'bg-red-400',          color: 'text-red-400'          },
  high:   { label: 'Alta',    dot: 'bg-orange-400',       color: 'text-orange-400'       },
  medium: { label: 'Média',   dot: 'bg-sky-400',          color: 'text-sky-400'          },
  low:    { label: 'Baixa',   dot: 'bg-muted-foreground', color: 'text-muted-foreground' },
}

const META_STATUS_CFG: Record<MetaStatus, { label: string; cls: string }> = {
  em_andamento: { label: 'Em andamento', cls: 'bg-amber-500/15 text-amber-400 border-0'   },
  atingida:     { label: 'Atingida',     cls: 'bg-emerald-500/15 text-emerald-400 border-0' },
  nao_atingida: { label: 'Não atingida', cls: 'bg-red-500/15 text-red-400 border-0'         },
}

const ACAO_COLS: { id: AcaoStatus; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
  { id: 'fazer',   label: 'Fazer',   icon: <Circle size={12} />,    color: 'text-slate-400',   bg: 'bg-slate-400/8',   border: 'border-slate-400/20' },
  { id: 'fazendo', label: 'Fazendo', icon: <ArrowRight size={12} />, color: 'text-amber-400',  bg: 'bg-amber-400/8',   border: 'border-amber-400/20' },
  { id: 'feito',   label: 'Feito',   icon: <Check size={12} />,     color: 'text-emerald-400', bg: 'bg-emerald-400/8', border: 'border-emerald-400/20' },
]

const PROJETO_TABS: { id: ProjetoTab; label: string; icon: React.ReactNode }[] = [
  { id: 'sobre',        label: 'Sobre o Projeto',  icon: <Info size={12} />        },
  { id: 'planejamento', label: 'Plano de Ação',    icon: <Layers size={12} />      },
  { id: 'custos',       label: 'Custos',           icon: <BarChart3 size={12} />   },
  { id: 'metas',        label: 'Metas',            icon: <Target size={12} />      },
  { id: 'links',        label: 'Links',            icon: <Link2 size={12} />       },
  { id: 'relatorios',   label: 'Relatórios',       icon: <FileText size={12} />    },
]

const CORES = [
  '#818cf8', '#38bdf8', '#4ade80', '#fbbf24',
  '#f472b6', '#fb923c', '#c084fc', '#f87171',
  '#2dd4bf', '#a78bfa',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function progressPct(inicio: string | null, fim: string | null): number | null {
  if (!inicio || !fim) return null
  const s = new Date(inicio).getTime()
  const e = new Date(fim).getTime()
  const now = Date.now()
  if (e <= s) return null
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)))
}

const inp  = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'
const lbl  = 'text-[11px] text-muted-foreground mb-1 block'

// ─── Project Form ─────────────────────────────────────────────────────────────

interface FormState {
  nome: string; descricao: string; cliente: string
  status: ProjStatus; prioridade: Priority
  data_inicio: string; data_fim: string; cor: string
}

function ProjetoForm({ initial, clientNames, onSave, onClose, saving }: {
  initial: Partial<Projeto> | null
  clientNames: string[]
  onSave: (f: FormState) => void
  onClose: () => void
  saving: boolean
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState<FormState>({
    nome: initial?.nome ?? '', descricao: initial?.descricao ?? '',
    cliente: initial?.cliente ?? '', status: initial?.status ?? 'ativo',
    prioridade: initial?.prioridade ?? 'medium',
    data_inicio: initial?.data_inicio ?? '', data_fim: initial?.data_fim ?? '',
    cor: initial?.cor ?? CORES[0],
  })

  const sel = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer appearance-none'
  const flbl = 'block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'
  const finp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">{isEdit ? 'Editar projeto' : 'Novo projeto'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <label className={flbl}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, cor: c }))}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${form.cor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className={flbl}>Nome <span className="text-destructive normal-case">*</span></label>
            <input autoFocus value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Campanha de Lançamento" className={finp} />
          </div>
          <div>
            <label className={flbl}>Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Objetivos, escopo, observações..." rows={3}
              className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>
          <div>
            <label className={flbl}>Cliente</label>
            <div className="relative">
              <select value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} className={sel}>
                <option value="">— Sem cliente —</option>
                {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={flbl}>Status</label>
              <div className="relative">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjStatus }))} className={sel}>
                  {(Object.keys(STATUS_CFG) as ProjStatus[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={flbl}>Prioridade</label>
              <div className="relative">
                <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as Priority }))} className={sel}>
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟠 Alta</option>
                  <option value="medium">🔵 Média</option>
                  <option value="low">⚪ Baixa</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={flbl}>Início</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                className="w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer" />
            </div>
            <div>
              <label className={flbl}>Prazo</label>
              <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                className="w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <Button size="sm" onClick={() => onSave(form)} disabled={!form.nome.trim() || saving}
            className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando...</> : isEdit ? <><Pencil size={12} /> Salvar</> : <><Plus size={12} /> Criar projeto</>}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Acao Form ────────────────────────────────────────────────────────────────

function AcaoForm({ acao, projetoId, defaultStatus, acoes, onSave, onClose }: {
  acao: Acao | null
  projetoId: string
  defaultStatus: AcaoStatus
  acoes: Acao[]
  onSave: () => void
  onClose: () => void
}) {
  const supabase = createClient()
  const isEdit   = !!acao?.id
  const [titulo, setTitulo]           = useState(acao?.titulo ?? '')
  const [descricao, setDescricao]     = useState(acao?.descricao ?? '')
  const [responsavel, setResponsavel] = useState(acao?.responsavel ?? '')
  const [prazo, setPrazo]             = useState(acao?.prazo ?? '')
  const [prioridade, setPrioridade]   = useState<Priority>(acao?.prioridade ?? 'medium')
  const [status, setStatus]           = useState<AcaoStatus>(acao?.status ?? defaultStatus)
  const [dependencias, setDependencias] = useState<string[]>(acao?.dependencias ?? [])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const outrasAcoes = acoes.filter(a => a.id !== acao?.id)

  function toggleDep(id: string, checked: boolean) {
    setDependencias(prev => checked ? [...prev, id] : prev.filter(d => d !== id))
  }

  async function handleSave() {
    if (!titulo.trim()) { setError('Título obrigatório'); return }
    setSaving(true)
    const payload = {
      projeto_id: projetoId, titulo: titulo.trim(),
      descricao: descricao.trim(), responsavel: responsavel.trim(),
      prazo: prazo || null, prioridade, status,
    }
    const { data: saved, error: err } = isEdit
      ? await supabase.from('projeto_acoes').update(payload).eq('id', acao!.id).select('id').single()
      : await supabase.from('projeto_acoes').insert(payload).select('id').single()
    if (err) { setError(err.message); setSaving(false); return }

    const acaoId = saved?.id ?? acao?.id
    if (acaoId) {
      await supabase.from('projeto_acao_dependencias').delete().eq('acao_id', acaoId)
      if (dependencias.length > 0) {
        await supabase.from('projeto_acao_dependencias').insert(
          dependencias.map(depId => ({ acao_id: acaoId, depende_de_id: depId }))
        )
      }
    }
    onSave()
  }

  const ainp = 'w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">{isEdit ? 'Editar ação' : 'Nova ação'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
              placeholder="Ex: Criar briefing do projeto" className={ainp} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
              placeholder="Detalhes da ação..." className="w-full rounded-xl bg-muted border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AcaoStatus)}
                className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                {ACAO_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
              <select value={prioridade} onChange={e => setPrioridade(e.target.value as Priority)}
                className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="urgent">🔴 Urgente</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🔵 Média</option>
                <option value="low">⚪ Baixa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Responsável</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={responsavel} onChange={e => setResponsavel(e.target.value)}
                placeholder="Nome do responsável" className="w-full h-10 rounded-xl bg-muted border border-border pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prazo</label>
            <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className={ainp} />
          </div>

          {outrasAcoes.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                <Lock size={10} className="text-amber-400" />
                Bloqueada por (depende de)
              </label>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-muted/50 divide-y divide-border/50">
                {outrasAcoes.map(a => {
                  const checked = dependencias.includes(a.id)
                  const done    = a.status === 'feito'
                  return (
                    <label key={a.id} className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors">
                      <input type="checkbox" checked={checked} onChange={e => toggleDep(a.id, e.target.checked)} className="accent-primary shrink-0" />
                      <span className={`text-xs truncate flex-1 ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {a.titulo}
                      </span>
                      {done
                        ? <Check size={11} className="text-emerald-400 shrink-0" />
                        : <Circle size={11} className="text-muted-foreground/40 shrink-0" />
                      }
                    </label>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Esta ação não poderá avançar enquanto as selecionadas não forem concluídas.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={!titulo.trim() || saving}
            className="h-10 px-6 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar ação'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Acao Card ────────────────────────────────────────────────────────────────

function AcaoCard({ acao, blockerTitles, onEdit, onDelete, onDragStart, onDragEnd }: {
  acao: Acao
  blockerTitles: string[]
  onEdit: () => void
  onDelete: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pCfg = PRIORITY_CFG[acao.prioridade]
  const isOverdue  = acao.prazo && new Date(acao.prazo) < new Date() && acao.status !== 'feito'
  const isBlocked  = blockerTitles.length > 0

  useEffect(() => {
    if (!menu) return
    const fn = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [menu])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group bg-card border border-border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={12} className="text-muted-foreground/30 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className={`text-xs font-semibold leading-snug flex-1 ${acao.status === 'feito' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {acao.titulo}
            </p>
            <div className="relative shrink-0" ref={menuRef}>
              <button onClick={e => { e.stopPropagation(); setMenu(v => !v) }}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal size={12} />
              </button>
              {menu && (
                <div className="absolute right-0 top-6 z-20 bg-popover border border-border rounded-xl shadow-xl overflow-hidden w-32 animate-in fade-in duration-100">
                  <button onClick={() => { onEdit(); setMenu(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted">
                    <Pencil size={11} /> Editar
                  </button>
                  <button onClick={() => { onDelete(); setMenu(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10">
                    <Trash2 size={11} /> Excluir
                  </button>
                </div>
              )}
            </div>
          </div>

          {acao.descricao && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{acao.descricao}</p>
          )}

          {isBlocked && (
            <div className="flex items-center gap-1.5 mt-2 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1.5">
              <Lock size={10} className="text-amber-400 shrink-0" />
              <span className="text-[10px] text-amber-400 truncate">Aguarda: {blockerTitles.join(', ')}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} title={pCfg.label} />
              {acao.responsavel && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <User size={9} /> {acao.responsavel}
                </span>
              )}
            </div>
            {acao.prazo && (
              <span className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                <Clock size={9} /> {fmtDate(acao.prazo)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanBoard({ projetoId }: { projetoId: string }) {
  const supabase = createClient()
  const [acoes, setAcoes]               = useState<Acao[]>([])
  const [loading, setLoading]           = useState(true)
  const [formOpen, setFormOpen]         = useState(false)
  const [editingAcao, setEditingAcao]   = useState<Acao | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<AcaoStatus>('fazer')
  const [dragging, setDragging]         = useState<Acao | null>(null)
  const [overCol, setOverCol]           = useState<AcaoStatus | null>(null)
  const [blockedMsg, setBlockedMsg]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: acoesData } = await supabase
      .from('projeto_acoes').select('*')
      .eq('projeto_id', projetoId).order('ordem')

    if (!acoesData) { setLoading(false); return }

    const ids = acoesData.map(a => a.id)
    const { data: depsData } = ids.length > 0
      ? await supabase.from('projeto_acao_dependencias').select('acao_id, depende_de_id').in('acao_id', ids)
      : { data: [] }

    const depMap = new Map<string, string[]>()
    for (const dep of depsData ?? []) {
      const arr = depMap.get(dep.acao_id) ?? []
      arr.push(dep.depende_de_id)
      depMap.set(dep.acao_id, arr)
    }

    setAcoes(acoesData.map(a => ({ ...a, dependencias: depMap.get(a.id) ?? [] })) as Acao[])
    setLoading(false)
  }, [supabase, projetoId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta ação?')) return
    await supabase.from('projeto_acoes').delete().eq('id', id)
    setAcoes(prev => prev.filter(a => a.id !== id))
  }

  async function handleDrop(targetStatus: AcaoStatus) {
    if (!dragging || dragging.status === targetStatus) {
      setDragging(null); setOverCol(null); return
    }

    if (targetStatus !== 'fazer') {
      const blockers = (dragging.dependencias ?? [])
        .map(id => acoes.find(a => a.id === id))
        .filter((a): a is Acao => !!a && a.status !== 'feito')
        .map(a => a.titulo)
      if (blockers.length > 0) {
        setBlockedMsg(`"${dragging.titulo}" está bloqueada. Conclua primeiro: ${blockers.join(', ')}`)
        setDragging(null); setOverCol(null)
        setTimeout(() => setBlockedMsg(null), 6000)
        return
      }
    }

    await supabase.from('projeto_acoes').update({ status: targetStatus }).eq('id', dragging.id)
    setAcoes(prev => prev.map(a => a.id === dragging.id ? { ...a, status: targetStatus } : a))
    setDragging(null); setOverCol(null)
  }

  function openNew(status: AcaoStatus) {
    setDefaultStatus(status); setEditingAcao(null); setFormOpen(true)
  }

  function getBlockerTitles(acao: Acao): string[] {
    return (acao.dependencias ?? [])
      .map(id => acoes.find(a => a.id === id))
      .filter((a): a is Acao => !!a && a.status !== 'feito')
      .map(a => a.titulo)
  }

  const byStatus = (s: AcaoStatus) => acoes.filter(a => a.status === s)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Plano de ação</h3>
        <button onClick={() => openNew('fazer')}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          <Plus size={13} /> Nova ação
        </button>
      </div>

      {blockedMsg && (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <Lock size={14} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400 flex-1">{blockedMsg}</p>
          <button onClick={() => setBlockedMsg(null)} className="text-amber-400/60 hover:text-amber-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {ACAO_COLS.map(col => {
            const items = byStatus(col.id)
            const isOver = overCol === col.id
            return (
              <div
                key={col.id}
                onDragOver={e => { e.preventDefault(); setOverCol(col.id) }}
                onDrop={() => handleDrop(col.id)}
                onDragLeave={() => setOverCol(null)}
                className={`flex flex-col rounded-xl border transition-all min-h-[200px] ${isOver ? `${col.border} ${col.bg}` : 'border-border bg-muted/20'}`}
              >
                <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isOver ? col.border : 'border-border'}`}>
                  <div className="flex items-center gap-2">
                    <span className={col.color}>{col.icon}</span>
                    <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-px">{items.length}</span>
                  </div>
                  <button onClick={() => openNew(col.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors ${col.color}`}>
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  {items.map(a => (
                    <AcaoCard key={a.id} acao={a}
                      blockerTitles={getBlockerTitles(a)}
                      onEdit={() => { setEditingAcao(a); setFormOpen(true) }}
                      onDelete={() => handleDelete(a.id)}
                      onDragStart={() => setDragging(a)}
                      onDragEnd={() => { setDragging(null); setOverCol(null) }}
                    />
                  ))}
                  {items.length === 0 && !isOver && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-[11px] text-muted-foreground/50">Arraste ou</p>
                      <button onClick={() => openNew(col.id)}
                        className="text-[11px] text-primary hover:text-primary/80 transition-colors mt-0.5">
                        + adicionar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formOpen && (
        <AcaoForm acao={editingAcao} projetoId={projetoId} defaultStatus={defaultStatus} acoes={acoes}
          onSave={() => { setFormOpen(false); setEditingAcao(null); load() }}
          onClose={() => { setFormOpen(false); setEditingAcao(null) }}
        />
      )}
    </div>
  )
}

// ─── SobreTab ─────────────────────────────────────────────────────────────────

function SobreTab({ projeto }: { projeto: Projeto }) {
  const stCfg = STATUS_CFG[projeto.status]
  const pCfg  = PRIORITY_CFG[projeto.prioridade]

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      {/* Descrição */}
      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h3>
        {projeto.descricao
          ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{projeto.descricao}</p>
          : <p className="text-sm text-muted-foreground/60 italic">Nenhuma descrição cadastrada.</p>
        }
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Detalhes */}
        <div>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detalhes</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Status</span>
              <Badge className={`text-[10px] px-1.5 h-5 flex items-center gap-1 ${stCfg.cls}`}>
                {stCfg.icon} {stCfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Prioridade</span>
              <span className={`flex items-center gap-1 text-xs ${pCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} /> {pCfg.label}
              </span>
            </div>
            {projeto.cliente && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">Cliente</span>
                <span className="text-xs text-foreground">{projeto.cliente}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prazo */}
        <div>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Prazo</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Início</span>
              <span className="text-xs text-foreground">{fmtDate(projeto.data_inicio) ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Prazo final</span>
              <span className="text-xs text-foreground">{fmtDate(projeto.data_fim) ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Criado em</span>
              <span className="text-xs text-foreground">{new Date(projeto.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CustosTab ────────────────────────────────────────────────────────────────

function CustosTab({ projetoId }: { projetoId: string }) {
  const supabase = createClient()
  const [custos, setCustos]     = useState<Custo[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ descricao: '', categoria: '', valor: '', tipo: 'saida' as CusTipo, data: '' })

  const load = useCallback(async () => {
    const { data } = await supabase.from('projeto_custos').select('*')
      .eq('projeto_id', projetoId).order('created_at', { ascending: false })
    if (data) setCustos(data as Custo[])
    setLoading(false)
  }, [supabase, projetoId])

  useEffect(() => { load() }, [load])

  const totalEntrada = custos.filter(c => c.tipo === 'entrada').reduce((s, c) => s + Number(c.valor), 0)
  const totalSaida   = custos.filter(c => c.tipo === 'saida').reduce((s, c) => s + Number(c.valor), 0)
  const saldo        = totalEntrada - totalSaida

  async function handleAdd() {
    if (!form.descricao.trim() || !form.valor) return
    const { data } = await supabase.from('projeto_custos').insert({
      projeto_id: projetoId, descricao: form.descricao.trim(),
      categoria: form.categoria.trim(), valor: parseFloat(form.valor),
      tipo: form.tipo, data: form.data || null,
    }).select().single()
    if (data) {
      setCustos(prev => [data as Custo, ...prev])
      setForm({ descricao: '', categoria: '', valor: '', tipo: 'saida', data: '' })
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('projeto_custos').delete().eq('id', id)
    setCustos(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Entradas</p>
          <p className="text-lg font-bold text-emerald-400">{fmtCurrency(totalEntrada)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Saídas</p>
          <p className="text-lg font-bold text-red-400">{fmtCurrency(totalSaida)}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${saldo >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <p className="text-[11px] text-muted-foreground mb-1">Saldo</p>
          <p className={`text-lg font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtCurrency(saldo)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Lançamentos</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium">
          <Plus size={13} /> Adicionar
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as CusTipo }))}
                className={inp}>
                <option value="saida">↓ Saída / Custo</option>
                <option value="entrada">↑ Entrada / Receita</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Valor (R$)</label>
              <input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00" step="0.01" min="0" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Descrição *</label>
            <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Design das peças, Anúncios..." className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Categoria</label>
              <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                placeholder="Ex: Design, Marketing..." className={inp} />
            </div>
            <div>
              <label className={lbl}>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={inp} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            <button onClick={handleAdd} disabled={!form.descricao.trim() || !form.valor}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
      ) : custos.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card border border-border rounded-2xl">
          <BarChart3 size={28} className="text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum lançamento cadastrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Registre entradas e saídas do projeto</p>
        </div>
      ) : (
        <div className="space-y-2">
          {custos.map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.tipo === 'entrada' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {c.tipo === 'entrada'
                  ? <TrendingUp size={14} className="text-emerald-400" />
                  : <TrendingDown size={14} className="text-red-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{c.descricao}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.categoria && <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-px">{c.categoria}</span>}
                  {c.data && <span className="text-[10px] text-muted-foreground">{fmtDate(c.data)}</span>}
                </div>
              </div>
              <span className={`text-sm font-semibold tabular-nums shrink-0 ${c.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                {c.tipo === 'entrada' ? '+' : '-'}{fmtCurrency(Number(c.valor))}
              </span>
              <button onClick={() => handleDelete(c.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MetasTab ─────────────────────────────────────────────────────────────────

function MetasTab({ projetoId }: { projetoId: string }) {
  const supabase = createClient()
  const [metas, setMetas]       = useState<Meta[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', valor_meta: '', valor_atual: '0', unidade: '', status: 'em_andamento' as MetaStatus })

  const load = useCallback(async () => {
    const { data } = await supabase.from('projeto_metas').select('*')
      .eq('projeto_id', projetoId).order('created_at')
    if (data) setMetas(data as Meta[])
    setLoading(false)
  }, [supabase, projetoId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.titulo.trim()) return
    const { data } = await supabase.from('projeto_metas').insert({
      projeto_id: projetoId, titulo: form.titulo.trim(), descricao: form.descricao.trim(),
      valor_meta: form.valor_meta ? parseFloat(form.valor_meta) : null,
      valor_atual: parseFloat(form.valor_atual) || 0,
      unidade: form.unidade.trim(), status: form.status,
    }).select().single()
    if (data) {
      setMetas(prev => [...prev, data as Meta])
      setForm({ titulo: '', descricao: '', valor_meta: '', valor_atual: '0', unidade: '', status: 'em_andamento' })
      setShowForm(false)
    }
  }

  async function updateStatus(id: string, status: MetaStatus) {
    await supabase.from('projeto_metas').update({ status }).eq('id', id)
    setMetas(prev => prev.map(m => m.id === id ? { ...m, status } : m))
  }

  async function updateValorAtual(id: string, val: string) {
    const valor_atual = parseFloat(val) || 0
    await supabase.from('projeto_metas').update({ valor_atual }).eq('id', id)
    setMetas(prev => prev.map(m => m.id === id ? { ...m, valor_atual } : m))
  }

  async function handleDelete(id: string) {
    await supabase.from('projeto_metas').delete().eq('id', id)
    setMetas(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Metas do projeto</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium">
          <Plus size={13} /> Nova meta
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className={lbl}>Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Alcançar 10k seguidores, Taxa de conversão 5%..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={2} placeholder="Contexto, critérios de sucesso..."
              className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Meta</label>
              <input type="number" value={form.valor_meta} onChange={e => setForm(f => ({ ...f, valor_meta: e.target.value }))}
                placeholder="100" className={inp} />
            </div>
            <div>
              <label className={lbl}>Atual</label>
              <input type="number" value={form.valor_atual} onChange={e => setForm(f => ({ ...f, valor_atual: e.target.value }))}
                placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>Unidade</label>
              <input value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                placeholder="%, R$, leads..." className={inp} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            <button onClick={handleAdd} disabled={!form.titulo.trim()}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
      ) : metas.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card border border-border rounded-2xl">
          <Target size={28} className="text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Defina objetivos mensuráveis para o projeto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {metas.map(m => {
            const pct = (m.valor_meta != null && m.valor_meta > 0 && m.valor_atual != null)
              ? Math.min(100, Math.round((m.valor_atual / m.valor_meta) * 100))
              : null
            const sCfg = META_STATUS_CFG[m.status]
            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{m.titulo}</p>
                      <Badge className={`text-[10px] px-1.5 h-4 ${sCfg.cls}`}>{sCfg.label}</Badge>
                    </div>
                    {m.descricao && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                    <select value={m.status} onChange={e => updateStatus(m.id, e.target.value as MetaStatus)}
                      className="h-7 rounded-lg bg-muted border border-border px-2 text-[11px] text-foreground focus:outline-none cursor-pointer">
                      <option value="em_andamento">Em andamento</option>
                      <option value="atingida">Atingida</option>
                      <option value="nao_atingida">Não atingida</option>
                    </select>
                    <button onClick={() => handleDelete(m.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {m.valor_meta != null && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <label className="text-muted-foreground">Atual:</label>
                        <input type="number" defaultValue={m.valor_atual ?? 0}
                          key={`${m.id}-${m.valor_atual}`}
                          onBlur={e => updateValorAtual(m.id, e.target.value)}
                          className="w-20 h-6 rounded bg-muted border border-border px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        {m.unidade && <span className="text-muted-foreground">/ {m.valor_meta} {m.unidade}</span>}
                      </div>
                      {pct !== null && <span className="font-medium text-foreground">{pct}%</span>}
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-400' : 'bg-primary'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── LinksTab ─────────────────────────────────────────────────────────────────

function LinksTab({ projetoId }: { projetoId: string }) {
  const supabase = createClient()
  const [links, setLinks]       = useState<ProjetoLink[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', url: '', categoria: '' })
  const [copied, setCopied]     = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('projeto_links').select('*')
      .eq('projeto_id', projetoId).order('created_at', { ascending: false })
    if (data) setLinks(data as ProjetoLink[])
    setLoading(false)
  }, [supabase, projetoId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.titulo.trim() || !form.url.trim()) return
    let url = form.url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    const { data } = await supabase.from('projeto_links').insert({
      projeto_id: projetoId, titulo: form.titulo.trim(),
      url, categoria: form.categoria.trim(),
    }).select().single()
    if (data) {
      setLinks(prev => [data as ProjetoLink, ...prev])
      setForm({ titulo: '', url: '', categoria: '' })
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('projeto_links').delete().eq('id', id)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Links do projeto</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium">
          <Plus size={13} /> Adicionar link
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className={lbl}>Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Briefing, Drive, Planilha de custos..." className={inp} />
          </div>
          <div>
            <label className={lbl}>URL *</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Categoria</label>
            <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              placeholder="Ex: Drive, Figma, Planilha..." className={inp} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            <button onClick={handleAdd} disabled={!form.titulo.trim() || !form.url.trim()}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
      ) : links.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card border border-border rounded-2xl">
          <Link2 size={28} className="text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum link cadastrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Adicione drives, figmas, planilhas e outros recursos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(l => (
            <div key={l.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{l.titulo}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{l.url}</p>
                {l.categoria && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-px mt-0.5 inline-block">{l.categoria}</span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button onClick={() => copyUrl(l.url, l.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" title="Copiar URL">
                  {copied === l.id ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
                <a href={l.url} target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" title="Abrir">
                  <ExternalLink size={12} />
                </a>
                <button onClick={() => handleDelete(l.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── RelatoriosTab ────────────────────────────────────────────────────────────

function RelatoriosTab({ projetoId }: { projetoId: string }) {
  const supabase = createClient()
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [form, setForm] = useState({ titulo: '', conteudo: '', data_referencia: '' })

  const load = useCallback(async () => {
    const { data } = await supabase.from('projeto_relatorios').select('*')
      .eq('projeto_id', projetoId).order('created_at', { ascending: false })
    if (data) setRelatorios(data as Relatorio[])
    setLoading(false)
  }, [supabase, projetoId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.titulo.trim()) return
    const { data } = await supabase.from('projeto_relatorios').insert({
      projeto_id: projetoId, titulo: form.titulo.trim(),
      conteudo: form.conteudo.trim(), data_referencia: form.data_referencia || null,
    }).select().single()
    if (data) {
      setRelatorios(prev => [data as Relatorio, ...prev])
      setForm({ titulo: '', conteudo: '', data_referencia: '' })
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este relatório?')) return
    await supabase.from('projeto_relatorios').delete().eq('id', id)
    setRelatorios(prev => prev.filter(r => r.id !== id))
    if (expanded === id) setExpanded(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Relatórios</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium">
          <Plus size={13} /> Novo relatório
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Título *</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Relatório Semanal..." className={inp} />
            </div>
            <div>
              <label className={lbl}>Data de referência</label>
              <input type="date" value={form.data_referencia} onChange={e => setForm(f => ({ ...f, data_referencia: e.target.value }))} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Conteúdo</label>
            <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
              rows={5} placeholder="Resultados, observações, próximos passos..."
              className="w-full rounded-lg bg-muted border border-border px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            <button onClick={handleAdd} disabled={!form.titulo.trim()}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
      ) : relatorios.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card border border-border rounded-2xl">
          <FileText size={28} className="text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum relatório cadastrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Documente resultados e acompanhamento do projeto</p>
        </div>
      ) : (
        <div className="space-y-2">
          {relatorios.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl overflow-hidden group">
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{r.titulo}</p>
                  {r.data_referencia && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(r.data_referencia)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={12} />
                  </button>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${expanded === r.id ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {expanded === r.id && (
                <div className="px-4 py-4 border-t border-border bg-muted/20">
                  {r.conteudo
                    ? <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{r.conteudo}</p>
                    : <p className="text-xs text-muted-foreground italic">Sem conteúdo registrado.</p>
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Project Detail ───────────────────────────────────────────────────────────

function ProjetoDetail({ projeto, onBack, onEdit }: {
  projeto: Projeto
  onBack: () => void
  onEdit: () => void
}) {
  const [tab, setTab] = useState<ProjetoTab>('sobre')
  const stCfg     = STATUS_CFG[projeto.status]
  const pCfg      = PRIORITY_CFG[projeto.prioridade]
  const pct       = progressPct(projeto.data_inicio, projeto.data_fim)
  const isOverdue = projeto.data_fim && new Date(projeto.data_fim) < new Date() && projeto.status !== 'concluido'

  return (
    <div className="space-y-5">
      {/* Back + edit */}
      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={16} /> Voltar para projetos
        </button>
        <button onClick={onEdit}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors">
          <Pencil size={14} /> Editar projeto
        </button>
      </div>

      {/* Project header */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: projeto.cor }} />
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: projeto.cor + '20' }}>
              <FolderKanban size={22} style={{ color: projeto.cor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className={`text-[10px] px-1.5 h-4 flex items-center gap-1 ${stCfg.cls}`}>
                  {stCfg.icon} {stCfg.label}
                </Badge>
                <span className={`flex items-center gap-1 text-[10px] ${pCfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} /> {pCfg.label}
                </span>
                {projeto.cliente && (
                  <span className="text-[10px] text-muted-foreground">· {projeto.cliente}</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground">{projeto.nome}</h1>
              {(projeto.data_inicio || projeto.data_fim) && (
                <span className={`flex items-center gap-1 text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                  <Calendar size={11} />
                  {fmtDate(projeto.data_inicio) ?? '—'} → {fmtDate(projeto.data_fim) ?? '—'}
                  {isOverdue && ' · atrasado'}
                </span>
              )}
            </div>
            {pct !== null && (
              <div className="shrink-0 text-right">
                <span className="text-2xl font-bold text-foreground">{pct}%</span>
                <p className="text-[10px] text-muted-foreground">progresso</p>
              </div>
            )}
          </div>
          {pct !== null && (
            <div className="h-1 rounded-full bg-muted overflow-hidden mt-3">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: projeto.cor }} />
            </div>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <div className="flex overflow-x-auto">
          {PROJETO_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {tab === 'sobre'        && <SobreTab projeto={projeto} />}
        {tab === 'planejamento' && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <KanbanBoard projetoId={projeto.id} />
          </div>
        )}
        {tab === 'custos'      && <CustosTab projetoId={projeto.id} />}
        {tab === 'metas'       && <MetasTab projetoId={projeto.id} />}
        {tab === 'links'       && <LinksTab projetoId={projeto.id} />}
        {tab === 'relatorios'  && <RelatoriosTab projetoId={projeto.id} />}
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjetoCard({ projeto, onClick, onEdit, onDelete }: {
  projeto: Projeto
  onClick: () => void
  onEdit: (p: Projeto) => void
  onDelete: (p: Projeto) => void
}) {
  const stCfg = STATUS_CFG[projeto.status]
  const pCfg  = PRIORITY_CFG[projeto.prioridade]
  const pct   = progressPct(projeto.data_inicio, projeto.data_fim)
  const isOverdue = projeto.data_fim && new Date(projeto.data_fim) < new Date() && projeto.status !== 'concluido'

  return (
    <Card
      onClick={onClick}
      className="bg-card border-border hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all group overflow-hidden cursor-pointer"
    >
      <div className="h-1 w-full" style={{ background: projeto.cor }} />
      <CardContent className="p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary/90 transition-colors">
              {projeto.nome}
            </p>
            {projeto.cliente && <p className="text-xs text-muted-foreground mt-0.5">{projeto.cliente}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onEdit(projeto) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(projeto) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {projeto.descricao && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{projeto.descricao}</p>
        )}

        {pct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">Progresso</span>
              <span className="text-[10px] font-medium text-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: projeto.cor }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge className={`text-[10px] px-1.5 h-4 flex items-center gap-1 ${stCfg.cls}`}>
              {stCfg.icon} {stCfg.label}
            </Badge>
            <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} title={pCfg.label} />
          </div>
          {(projeto.data_inicio || projeto.data_fim) && (
            <div className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
              <Clock size={9} />
              {fmtDate(projeto.data_inicio) ?? '—'} → {fmtDate(projeto.data_fim) ?? '—'}
              {isOverdue && ' · atrasado'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Module ──────────────────────────────────────────────────────────────

export function ProjetosModule() {
  const [projetos, setProjetos]       = useState<Projeto[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterStatus, setFilter]     = useState<ProjStatus | 'all'>('all')
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Projeto | null>(null)
  const [saving, setSaving]           = useState(false)
  const [clientNames, setClientNames] = useState<string[]>([])
  const [selected, setSelected]       = useState<Projeto | null>(null)
  const { empresaId } = useEmpresa()

  async function load() {
    const qs = empresaId ? `?empresa_id=${empresaId}` : '?empresa_id='
    const [projRes, cliRes] = await Promise.all([
      fetch(`/api/projetos${qs}`),
      fetch('/api/clientes'),
    ])
    if (projRes.ok) setProjetos(await projRes.json())
    if (cliRes.ok) {
      const cli = await cliRes.json()
      if (Array.isArray(cli)) setClientNames(cli.map((c: { name?: string; nome?: string }) => c.name ?? c.nome ?? '').filter(Boolean))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [empresaId])

  const filtered = useMemo(() =>
    filterStatus === 'all' ? projetos : projetos.filter(p => p.status === filterStatus),
    [projetos, filterStatus]
  )

  const counts = useMemo(() => ({
    total:     projetos.length,
    ativo:     projetos.filter(p => p.status === 'ativo').length,
    pausado:   projetos.filter(p => p.status === 'pausado').length,
    concluido: projetos.filter(p => p.status === 'concluido').length,
  }), [projetos])

  async function handleSave(form: FormState) {
    setSaving(true)
    const body = {
      empresa_id: empresaId || null, nome: form.nome.trim(),
      descricao: form.descricao.trim(), cliente: form.cliente,
      status: form.status, prioridade: form.prioridade,
      data_inicio: form.data_inicio || null, data_fim: form.data_fim || null, cor: form.cor,
    }
    try {
      if (editing) {
        const res = await fetch(`/api/projetos/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (res.ok) {
          const updated = await res.json()
          setProjetos(prev => prev.map(p => p.id === editing.id ? updated : p))
          if (selected?.id === editing.id) setSelected(updated)
        }
      } else {
        const res = await fetch('/api/projetos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (res.ok) { const created = await res.json(); setProjetos(prev => [created, ...prev]) }
      }
    } finally {
      setSaving(false); setShowForm(false); setEditing(null)
    }
  }

  async function handleDelete(projeto: Projeto) {
    if (!confirm(`Excluir "${projeto.nome}"?`)) return
    await fetch(`/api/projetos/${projeto.id}`, { method: 'DELETE' })
    setProjetos(prev => prev.filter(p => p.id !== projeto.id))
    if (selected?.id === projeto.id) setSelected(null)
  }

  function openEdit(projeto: Projeto) { setEditing(projeto); setShowForm(true) }
  function openCreate() { setEditing(null); setShowForm(true) }

  const fsel = 'h-8 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all'

  if (selected) {
    return (
      <div className="max-w-[1200px]">
        <ProjetoDetail
          projeto={selected}
          onBack={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setShowForm(true) }}
        />
        {showForm && (
          <ProjetoForm
            initial={editing}
            clientNames={clientNames}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditing(null) }}
            saving={saving}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: counts.total,     color: 'text-foreground',  bg: 'bg-muted/60' },
          { label: 'Ativos',     value: counts.ativo,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pausados',   value: counts.pausado,   color: 'text-amber-400',   bg: 'bg-amber-500/10' },
          { label: 'Concluídos', value: counts.concluido, color: 'text-sky-400',     bg: 'bg-sky-500/10' },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <FolderKanban size={16} className={s.color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <select value={filterStatus} onChange={e => setFilter(e.target.value as ProjStatus | 'all')} className={fsel}>
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS_CFG) as ProjStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
        <Button size="sm" onClick={openCreate} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
          <Plus size={13} /> Novo projeto
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <FolderKanban size={24} className="text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nenhum projeto encontrado</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Crie seu primeiro projeto para começar</p>
          </div>
          <Button size="sm" onClick={openCreate} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5 mt-1">
            <Plus size={13} /> Criar projeto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjetoCard key={p.id} projeto={p}
              onClick={() => setSelected(p)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
          <button onClick={openCreate}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all p-8 text-muted-foreground hover:text-primary min-h-[140px]">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={18} />
            </div>
            <span className="text-xs font-medium">Novo projeto</span>
          </button>
        </div>
      )}

      {showForm && (
        <ProjetoForm
          initial={editing}
          clientNames={clientNames}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}
