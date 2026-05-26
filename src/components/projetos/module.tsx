'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, X, Pencil, Trash2, ChevronDown, Calendar,
  FolderKanban, Clock, Layers, CheckCircle2, PauseCircle,
  XCircle, Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjStatus = 'ativo' | 'pausado' | 'concluido' | 'cancelado'
type Priority   = 'low' | 'medium' | 'high' | 'urgent'

interface Projeto {
  id: string
  nome: string
  descricao: string
  cliente: string
  status: ProjStatus
  prioridade: Priority
  data_inicio: string | null
  data_fim: string | null
  cor: string
  created_at: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ProjStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ativo:     { label: 'Ativo',     cls: 'bg-emerald-500/15 text-emerald-400 border-0', icon: <Layers size={10} />      },
  pausado:   { label: 'Pausado',   cls: 'bg-amber-500/15 text-amber-400 border-0',     icon: <PauseCircle size={10} /> },
  concluido: { label: 'Concluído', cls: 'bg-sky-500/15 text-sky-400 border-0',         icon: <CheckCircle2 size={10} /> },
  cancelado: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-400 border-0',         icon: <XCircle size={10} />     },
}

const PRIORITY_CFG: Record<Priority, { label: string; dot: string }> = {
  urgent: { label: 'Urgente', dot: 'bg-red-400'          },
  high:   { label: 'Alta',    dot: 'bg-orange-400'       },
  medium: { label: 'Média',   dot: 'bg-sky-400'          },
  low:    { label: 'Baixa',   dot: 'bg-muted-foreground' },
}

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

// ─── Form panel ──────────────────────────────────────────────────────────────

interface FormState {
  nome: string; descricao: string; cliente: string
  status: ProjStatus; prioridade: Priority
  data_inicio: string; data_fim: string; cor: string
}

function ProjetoForm({
  initial, clientNames, onSave, onClose, saving,
}: {
  initial: Partial<Projeto> | null
  clientNames: string[]
  onSave: (f: FormState) => void
  onClose: () => void
  saving: boolean
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState<FormState>({
    nome: initial?.nome ?? '',
    descricao: initial?.descricao ?? '',
    cliente: initial?.cliente ?? '',
    status: initial?.status ?? 'ativo',
    prioridade: initial?.prioridade ?? 'medium',
    data_inicio: initial?.data_inicio ?? '',
    data_fim: initial?.data_fim ?? '',
    cor: initial?.cor ?? CORES[0],
  })

  const sel = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer appearance-none'
  const lbl = 'block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'
  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">{isEdit ? 'Editar projeto' : 'Novo projeto'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Color picker */}
          <div>
            <label className={lbl}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, cor: c }))}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${form.cor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Nome <span className="text-destructive normal-case">*</span></label>
            <input autoFocus value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Campanha de Lançamento" className={inp} />
          </div>

          <div>
            <label className={lbl}>Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Objetivos, escopo, observações..."
              rows={3}
              className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
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
                  {(Object.keys(STATUS_CFG) as ProjStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                  ))}
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
                className="w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer" />
            </div>
            <div>
              <label className={lbl}>Prazo</label>
              <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                className="w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <Button
            size="sm"
            onClick={() => onSave(form)}
            disabled={!form.nome.trim() || saving}
            className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5"
          >
            {saving
              ? <><Loader2 size={12} className="animate-spin" /> Salvando...</>
              : isEdit ? <><Pencil size={12} /> Salvar</> : <><Plus size={12} /> Criar projeto</>
            }
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjetoCard({ projeto, onEdit, onDelete }: {
  projeto: Projeto
  onEdit: (p: Projeto) => void
  onDelete: (p: Projeto) => void
}) {
  const stCfg = STATUS_CFG[projeto.status]
  const pCfg  = PRIORITY_CFG[projeto.prioridade]
  const pct   = progressPct(projeto.data_inicio, projeto.data_fim)
  const isOverdue = projeto.data_fim && new Date(projeto.data_fim) < new Date() && projeto.status !== 'concluido'

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all group overflow-hidden">
      <div className="h-1 w-full" style={{ background: projeto.cor }} />
      <CardContent className="p-5 space-y-3.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary/90 transition-colors">{projeto.nome}</p>
            {projeto.cliente && <p className="text-xs text-muted-foreground mt-0.5">{projeto.cliente}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(projeto)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(projeto)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Description */}
        {projeto.descricao && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{projeto.descricao}</p>
        )}

        {/* Progress bar */}
        {pct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">Progresso</span>
              <span className="text-[10px] font-medium text-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: projeto.cor }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
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

// ─── Main module ─────────────────────────────────────────────────────────────

export function ProjetosModule() {
  const [projetos, setProjetos]     = useState<Projeto[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterStatus, setFilter]   = useState<ProjStatus | 'all'>('all')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Projeto | null>(null)
  const [saving, setSaving]         = useState(false)
  const [clientNames, setClientNames] = useState<string[]>([])

  async function load() {
    const [projRes, cliRes] = await Promise.all([
      fetch('/api/projetos'),
      fetch('/api/clientes'),
    ])
    if (projRes.ok) setProjetos(await projRes.json())
    if (cliRes.ok) {
      const cli = await cliRes.json()
      if (Array.isArray(cli)) setClientNames(cli.map((c: { name?: string; nome?: string }) => c.name ?? c.nome ?? '').filter(Boolean))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
      nome:        form.nome.trim(),
      descricao:   form.descricao.trim(),
      cliente:     form.cliente,
      status:      form.status,
      prioridade:  form.prioridade,
      data_inicio: form.data_inicio || null,
      data_fim:    form.data_fim || null,
      cor:         form.cor,
    }
    try {
      if (editing) {
        const res = await fetch(`/api/projetos/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const updated = await res.json()
          setProjetos(prev => prev.map(p => p.id === editing.id ? updated : p))
        }
      } else {
        const res = await fetch('/api/projetos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const created = await res.json()
          setProjetos(prev => [created, ...prev])
        }
      }
    } finally {
      setSaving(false)
      setShowForm(false)
      setEditing(null)
    }
  }

  async function handleDelete(projeto: Projeto) {
    if (!confirm(`Excluir "${projeto.nome}"? Os leads vinculados serão desvinculados.`)) return
    await fetch(`/api/projetos/${projeto.id}`, { method: 'DELETE' })
    setProjetos(prev => prev.filter(p => p.id !== projeto.id))
  }

  function openEdit(projeto: Projeto) {
    setEditing(projeto)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  const sel = 'h-8 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all'

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: counts.total,     color: 'text-foreground',    bg: 'bg-muted/60' },
          { label: 'Ativos',    value: counts.ativo,     color: 'text-emerald-400',   bg: 'bg-emerald-500/10' },
          { label: 'Pausados',  value: counts.pausado,   color: 'text-amber-400',     bg: 'bg-amber-500/10' },
          { label: 'Concluídos',value: counts.concluido, color: 'text-sky-400',       bg: 'bg-sky-500/10' },
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
            <ProjetoCard key={p.id} projeto={p} onEdit={openEdit} onDelete={handleDelete} />
          ))}
          {/* Add card */}
          <button
            onClick={openCreate}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all p-8 text-muted-foreground hover:text-primary min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={18} />
            </div>
            <span className="text-xs font-medium">Novo projeto</span>
          </button>
        </div>
      )}

      {/* Integration hints */}
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
