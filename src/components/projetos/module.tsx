'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useEmpresa } from '@/contexts/empresa-context'
import {
  Plus, X, Pencil, Trash2, ChevronDown, Calendar,
  FolderKanban, Clock, Layers, CheckCircle2, PauseCircle,
  XCircle, Loader2, ChevronLeft, GripVertical, User,
  AlertCircle, MoreHorizontal, Circle, ArrowRight, Check,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjStatus   = 'ativo' | 'pausado' | 'concluido' | 'cancelado'
type Priority     = 'low' | 'medium' | 'high' | 'urgent'
type AcaoStatus   = 'fazer' | 'fazendo' | 'feito'

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
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ProjStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ativo:     { label: 'Ativo',     cls: 'bg-emerald-500/15 text-emerald-400 border-0', icon: <Layers size={10} />      },
  pausado:   { label: 'Pausado',   cls: 'bg-amber-500/15 text-amber-400 border-0',     icon: <PauseCircle size={10} /> },
  concluido: { label: 'Concluído', cls: 'bg-sky-500/15 text-sky-400 border-0',         icon: <CheckCircle2 size={10} /> },
  cancelado: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-400 border-0',         icon: <XCircle size={10} />     },
}

const PRIORITY_CFG: Record<Priority, { label: string; dot: string; color: string }> = {
  urgent: { label: 'Urgente', dot: 'bg-red-400',          color: 'text-red-400'          },
  high:   { label: 'Alta',    dot: 'bg-orange-400',       color: 'text-orange-400'       },
  medium: { label: 'Média',   dot: 'bg-sky-400',          color: 'text-sky-400'          },
  low:    { label: 'Baixa',   dot: 'bg-muted-foreground', color: 'text-muted-foreground' },
}

const ACAO_COLS: { id: AcaoStatus; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
  { id: 'fazer',   label: 'Fazer',   icon: <Circle size={12} />,    color: 'text-slate-400',   bg: 'bg-slate-400/8',   border: 'border-slate-400/20' },
  { id: 'fazendo', label: 'Fazendo', icon: <ArrowRight size={12} />, color: 'text-amber-400',  bg: 'bg-amber-400/8',   border: 'border-amber-400/20' },
  { id: 'feito',   label: 'Feito',   icon: <Check size={12} />,     color: 'text-emerald-400', bg: 'bg-emerald-400/8', border: 'border-emerald-400/20' },
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

function progressPct(inicio: string | null, fim: string | null): number | null {
  if (!inicio || !fim) return null
  const s = new Date(inicio).getTime()
  const e = new Date(fim).getTime()
  const now = Date.now()
  if (e <= s) return null
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)))
}

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
  const lbl = 'block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'
  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all'

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
            <label className={lbl}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, cor: c }))}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${form.cor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Nome <span className="text-destructive normal-case">*</span></label>
            <input autoFocus value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Campanha de Lançamento" className={inp} />
          </div>
          <div>
            <label className={lbl}>Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Objetivos, escopo, observações..." rows={3}
              className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>
          <div>
            <label className={lbl}>Cliente</label>
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
              <label className={lbl}>Status</label>
              <div className="relative">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjStatus }))} className={sel}>
                  {(Object.keys(STATUS_CFG) as ProjStatus[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={lbl}>Prioridade</label>
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
              <label className={lbl}>Início</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                className="w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer" />
            </div>
            <div>
              <label className={lbl}>Prazo</label>
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

// ─── Acao Form (side panel) ──────────────────────────────────────────────────

function AcaoForm({ acao, projetoId, defaultStatus, onSave, onClose }: {
  acao: Acao | null
  projetoId: string
  defaultStatus: AcaoStatus
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
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  async function handleSave() {
    if (!titulo.trim()) { setError('Título obrigatório'); return }
    setSaving(true)
    const payload = {
      projeto_id: projetoId, titulo: titulo.trim(),
      descricao: descricao.trim(), responsavel: responsavel.trim(),
      prazo: prazo || null, prioridade, status,
    }
    const { error: err } = isEdit
      ? await supabase.from('projeto_acoes').update(payload).eq('id', acao!.id)
      : await supabase.from('projeto_acoes').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const inp = 'w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'

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
              placeholder="Ex: Criar briefing do projeto" className={inp} />
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
            <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className={inp} />
          </div>
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

function AcaoCard({ acao, onEdit, onDelete, onDragStart, onDragEnd }: {
  acao: Acao
  onEdit: () => void
  onDelete: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pCfg = PRIORITY_CFG[acao.prioridade]
  const isOverdue = acao.prazo && new Date(acao.prazo) < new Date() && acao.status !== 'feito'

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
  const [acoes, setAcoes]           = useState<Acao[]>([])
  const [loading, setLoading]       = useState(true)
  const [formOpen, setFormOpen]     = useState(false)
  const [editingAcao, setEditingAcao] = useState<Acao | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<AcaoStatus>('fazer')
  const [dragging, setDragging]     = useState<Acao | null>(null)
  const [overCol, setOverCol]       = useState<AcaoStatus | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('projeto_acoes')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('ordem')
    if (data) setAcoes(data as Acao[])
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
    await supabase.from('projeto_acoes').update({ status: targetStatus }).eq('id', dragging.id)
    setAcoes(prev => prev.map(a => a.id === dragging.id ? { ...a, status: targetStatus } : a))
    setDragging(null); setOverCol(null)
  }

  function openNew(status: AcaoStatus) {
    setDefaultStatus(status)
    setEditingAcao(null)
    setFormOpen(true)
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
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isOver ? col.border : 'border-border'}`}>
                  <div className="flex items-center gap-2">
                    <span className={col.color}>{col.icon}</span>
                    <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-px">
                      {items.length}
                    </span>
                  </div>
                  <button onClick={() => openNew(col.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors ${col.color}`}>
                    <Plus size={12} />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2">
                  {items.map(a => (
                    <AcaoCard
                      key={a.id}
                      acao={a}
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
        <AcaoForm
          acao={editingAcao}
          projetoId={projetoId}
          defaultStatus={defaultStatus}
          onSave={() => { setFormOpen(false); setEditingAcao(null); load() }}
          onClose={() => { setFormOpen(false); setEditingAcao(null) }}
        />
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
  const stCfg  = STATUS_CFG[projeto.status]
  const pCfg   = PRIORITY_CFG[projeto.prioridade]
  const pct    = progressPct(projeto.data_inicio, projeto.data_fim)
  const isOverdue = projeto.data_fim && new Date(projeto.data_fim) < new Date() && projeto.status !== 'concluido'

  return (
    <div className="space-y-5">
      {/* Back */}
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
        <div className="p-6">
          <div className="flex items-start gap-4">
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
              </div>
              <h1 className="text-xl font-bold text-foreground">{projeto.nome}</h1>
              {projeto.cliente && <p className="text-sm text-muted-foreground mt-0.5">{projeto.cliente}</p>}
              {projeto.descricao && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{projeto.descricao}</p>}

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {(projeto.data_inicio || projeto.data_fim) && (
                  <span className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                    <Calendar size={12} />
                    {fmtDate(projeto.data_inicio) ?? '—'} → {fmtDate(projeto.data_fim) ?? '—'}
                    {isOverdue && ' · atrasado'}
                  </span>
                )}
              </div>

              {pct !== null && (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">Progresso temporal</span>
                    <span className="text-[10px] font-medium text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: projeto.cor }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <KanbanBoard projetoId={projeto.id} />
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
  const [projetos, setProjetos]     = useState<Projeto[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterStatus, setFilter]   = useState<ProjStatus | 'all'>('all')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Projeto | null>(null)
  const [saving, setSaving]         = useState(false)
  const [clientNames, setClientNames] = useState<string[]>([])
  const [selected, setSelected]     = useState<Projeto | null>(null)
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

  const sel = 'h-8 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all'

  // ── Detail view ──
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

  // ── List view ──
  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Stats */}
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

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <select value={filterStatus} onChange={e => setFilter(e.target.value as ProjStatus | 'all')} className={sel}>
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS_CFG) as ProjStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
        <Button size="sm" onClick={openCreate} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
          <Plus size={13} /> Novo projeto
        </Button>
      </div>

      {/* Grid */}
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
            <ProjetoCard
              key={p.id}
              projeto={p}
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

      {projetos.length > 0 && (
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar size={11} /> Projetos com datas aparecem no Calendário
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FolderKanban size={11} /> Leads do Pipeline podem ser vinculados a projetos
          </div>
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
