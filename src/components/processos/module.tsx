'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Plus, Search, X, ChevronLeft, GripVertical, Trash2,
  BookOpen, CheckCircle2, Clock, Tag, User, MoreHorizontal,
  Pencil, Archive, Copy, FileText, Layers, AlertCircle,
  Square, SquareCheck, StickyNote, ListChecks, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/contexts/empresa-context'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProcessStatus = 'ativo' | 'rascunho' | 'arquivado'

type ChecklistItem = {
  id: string
  texto: string
  concluido: boolean
}

type Etapa = {
  id: string
  titulo: string
  descricao: string
  responsavel: string
  duracao: string
  ordem: number
  notas: string
  checklist: ChecklistItem[]
  ferramentas: string
}

type Processo = {
  id: string
  titulo: string
  descricao: string
  categoria: string
  status: ProcessStatus
  responsavel: string
  empresa_id: string | null
  created_at: string
  etapas: Etapa[]
}

type EtapaDraft = Omit<Etapa, 'id'>

function blankEtapa(ordem: number): EtapaDraft {
  return { titulo: '', descricao: '', responsavel: '', duracao: '', ordem, notas: '', ferramentas: '', checklist: [] }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  'Comercial', 'Operação', 'Financeiro', 'RH', 'Marketing',
  'Tecnologia', 'Atendimento', 'Outros',
]

const STATUS_CONFIG: Record<ProcessStatus, { label: string; color: string; bg: string; dot: string }> = {
  ativo:     { label: 'Ativo',     color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
  rascunho:  { label: 'Rascunho',  color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',     dot: 'bg-amber-400' },
  arquivado: { label: 'Arquivado', color: 'text-slate-400',   bg: 'bg-slate-400/10 border-slate-400/20',     dot: 'bg-slate-400' },
}

const CAT_COLORS: Record<string, string> = {
  Comercial:   'bg-blue-400/10 text-blue-400 border-blue-400/20',
  Operação:    'bg-violet-400/10 text-violet-400 border-violet-400/20',
  Financeiro:  'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  RH:          'bg-pink-400/10 text-pink-400 border-pink-400/20',
  Marketing:   'bg-orange-400/10 text-orange-400 border-orange-400/20',
  Tecnologia:  'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  Atendimento: 'bg-teal-400/10 text-teal-400 border-teal-400/20',
  Outros:      'bg-slate-400/10 text-slate-400 border-slate-400/20',
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProcessStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function CatBadge({ cat }: { cat: string }) {
  const cls = CAT_COLORS[cat] ?? CAT_COLORS['Outros']
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
      <Tag size={9} />
      {cat}
    </span>
  )
}

// ─── Process Card ─────────────────────────────────────────────────────────────

function ProcessCard({
  processo,
  onClick,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  processo: Processo
  onClick: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const fn = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [menuOpen])

  return (
    <div
      onClick={onClick}
      className="group relative bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            {processo.titulo}
          </h3>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-xl shadow-xl overflow-hidden w-44 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={e => { e.stopPropagation(); onDuplicate(); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
                <Copy size={12} /> Duplicar
              </button>
              <button onClick={e => { e.stopPropagation(); onArchive(); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
                <Archive size={12} /> {processo.status === 'arquivado' ? 'Reativar' : 'Arquivar'}
              </button>
              <div className="border-t border-border" />
              <button onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors">
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={processo.status} />
        {processo.categoria && <CatBadge cat={processo.categoria} />}
      </div>

      {/* Description */}
      {processo.descricao && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {processo.descricao}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Layers size={11} />
            {processo.etapas.length} {processo.etapas.length === 1 ? 'etapa' : 'etapas'}
          </span>
          {processo.responsavel && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate max-w-24">
              <User size={11} />
              {processo.responsavel}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {new Date(processo.created_at).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  )
}

// ─── Etapa Detail Panel ───────────────────────────────────────────────────────

function EtapaDetailPanel({
  etapa,
  index,
  total,
  onClose,
  onSave,
}: {
  etapa: Etapa
  index: number
  total: number
  onClose: () => void
  onSave: (updated: Etapa) => Promise<void>
}) {
  const [titulo, setTitulo]           = useState(etapa.titulo)
  const [descricao, setDescricao]     = useState(etapa.descricao)
  const [responsavel, setResponsavel] = useState(etapa.responsavel)
  const [duracao, setDuracao]         = useState(etapa.duracao)
  const [notas, setNotas]             = useState(etapa.notas ?? '')
  const [ferramentas, setFerramentas] = useState(etapa.ferramentas ?? '')
  const [checklist, setChecklist]     = useState<ChecklistItem[]>(etapa.checklist ?? [])
  const [novoItem, setNovoItem]       = useState('')
  const [saving, setSaving]           = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addItem() {
    const texto = novoItem.trim()
    if (!texto) return
    setChecklist(prev => [...prev, { id: crypto.randomUUID(), texto, concluido: false }])
    setNovoItem('')
    inputRef.current?.focus()
  }

  function toggleItem(id: string) {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, concluido: !c.concluido } : c))
  }

  function removeItem(id: string) {
    setChecklist(prev => prev.filter(c => c.id !== id))
  }

  async function save() {
    setSaving(true)
    await onSave({
      ...etapa,
      titulo: titulo.trim() || etapa.titulo,
      descricao: descricao.trim(),
      responsavel: responsavel.trim(),
      duracao: duracao.trim(),
      notas: notas.trim(),
      ferramentas: ferramentas.trim(),
      checklist,
    })
    setSaving(false)
  }

  const done   = checklist.filter(c => c.concluido).length
  const pct    = checklist.length > 0 ? Math.round((done / checklist.length) * 100) : null
  const inp    = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{index + 1}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{etapa.titulo || `Etapa ${index + 1}`}</p>
              <p className="text-[11px] text-muted-foreground">Etapa {index + 1} de {total}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Título */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inp} />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={4}
              placeholder="Descreva o que deve ser feito nesta etapa..."
              className="w-full rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/40 leading-relaxed"
            />
          </div>

          {/* Responsável + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Responsável</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome" className="w-full h-9 rounded-lg bg-muted border border-border pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Duração</label>
              <div className="relative">
                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input value={duracao} onChange={e => setDuracao(e.target.value)} placeholder="Ex: 2h, 1 dia" className="w-full h-9 rounded-lg bg-muted border border-border pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40" />
              </div>
            </div>
          </div>

          {/* Ferramentas */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Ferramentas / Recursos necessários
            </label>
            <input
              value={ferramentas}
              onChange={e => setFerramentas(e.target.value)}
              placeholder="Ex: Figma, Google Drive, Planilha X..."
              className={inp}
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <ListChecks size={12} /> Checklist
                {pct !== null && (
                  <span className="text-primary font-medium normal-case">{done}/{checklist.length} · {pct}%</span>
                )}
              </label>
            </div>

            {/* Progress bar */}
            {checklist.length > 0 && (
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}

            <div className="space-y-1.5 mb-2">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleItem(item.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                    {item.concluido
                      ? <SquareCheck size={16} className="text-primary" />
                      : <Square size={16} />
                    }
                  </button>
                  <span className={`flex-1 text-sm ${item.concluido ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.texto}
                  </span>
                  <button onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-red-400 transition-all">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add item */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={novoItem}
                onChange={e => setNovoItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="Adicionar item ao checklist..."
                className="flex-1 h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
              />
              <button onClick={addItem} disabled={!novoItem.trim()}
                className="h-8 px-3 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 disabled:opacity-40 transition-colors flex items-center gap-1">
                <Plus size={12} /> Add
              </button>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              <StickyNote size={12} /> Notas e observações
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={4}
              placeholder="Contexto adicional, cuidados, exceções, exemplos..."
              className="w-full rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/40 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Fechar
          </button>
          <button onClick={save} disabled={saving}
            className="h-9 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving ? <><AlertCircle size={13} className="animate-pulse" /> Salvando…</> : <><CheckCircle2 size={13} /> Salvar etapa</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Detail Panel (inline) ───────────────────────────────────────────────────

function ProcessoDetail({
  processo,
  onBack,
  onEdit,
  onSaveEtapa,
}: {
  processo: Processo
  onBack: () => void
  onEdit: () => void
  onSaveEtapa: (etapa: Etapa) => Promise<void>
}) {
  const [etapaAberta, setEtapaAberta] = useState<Etapa | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>(processo.etapas)

  async function handleSaveEtapa(updated: Etapa) {
    await onSaveEtapa(updated)
    setEtapas(prev => prev.map(e => e.id === updated.id ? updated : e))
    setEtapaAberta(updated)
  }

  const sorted = [...etapas].sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={16} /> Voltar para processos
        </button>
        <button onClick={onEdit} className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Pencil size={14} /> Editar processo
        </button>
      </div>

      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <StatusBadge status={processo.status} />
              {processo.categoria && <CatBadge cat={processo.categoria} />}
            </div>
            <h1 className="text-xl font-bold text-foreground">{processo.titulo}</h1>
            {processo.descricao && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{processo.descricao}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              {processo.responsavel && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User size={12} /> {processo.responsavel}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Criado em {new Date(processo.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Layers size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Etapas do processo</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? 'etapa' : 'etapas'}
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Layers size={28} className="text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Edite o processo para adicionar etapas</p>
          </div>
        ) : (
          <div className="space-y-0">
            {sorted.map((etapa, i) => {
              const checkDone  = (etapa.checklist ?? []).filter(c => c.concluido).length
              const checkTotal = (etapa.checklist ?? []).length
              const checkPct   = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : null

              return (
                <div key={etapa.id || i} className="flex gap-5">
                  {/* Timeline */}
                  <div className="flex flex-col items-center shrink-0 w-8">
                    <div className="w-8 h-8 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-primary">{i + 1}</span>
                    </div>
                    {i < sorted.length - 1 && <div className="w-px flex-1 my-1 bg-border min-h-4" />}
                  </div>

                  {/* Content — clicável */}
                  <div className={`flex-1 ${i < sorted.length - 1 ? 'pb-5' : 'pb-1'}`}>
                    <button
                      onClick={() => setEtapaAberta(etapa)}
                      className="w-full text-left group/etapa bg-muted/30 hover:bg-muted/60 border border-border hover:border-primary/30 rounded-xl px-4 py-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground mt-0.5 group-hover/etapa:text-primary transition-colors">
                          {etapa.titulo || `Etapa ${i + 1}`}
                        </p>
                        <ChevronRight size={14} className="text-muted-foreground/40 group-hover/etapa:text-primary shrink-0 mt-1 transition-colors" />
                      </div>

                      {etapa.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{etapa.descricao}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {etapa.responsavel && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <User size={10} /> {etapa.responsavel}
                          </span>
                        )}
                        {etapa.duracao && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock size={10} /> {etapa.duracao}
                          </span>
                        )}
                        {checkTotal > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                            <ListChecks size={10} />
                            {checkDone}/{checkTotal}
                            {checkPct === 100 && <CheckCircle2 size={10} className="text-emerald-400 ml-0.5" />}
                          </span>
                        )}
                      </div>

                      {/* Checklist progress bar */}
                      {checkTotal > 0 && (
                        <div className="h-1 rounded-full bg-border mt-2.5 overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${checkPct}%` }} />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Etapa detail panel */}
      {etapaAberta && (
        <EtapaDetailPanel
          etapa={etapaAberta}
          index={sorted.findIndex(e => e.id === etapaAberta.id)}
          total={sorted.length}
          onClose={() => setEtapaAberta(null)}
          onSave={handleSaveEtapa}
        />
      )}
    </div>
  )
}

// ─── Form Panel (slide-in) ───────────────────────────────────────────────────

function ProcessoForm({
  processo,
  onClose,
  onSave,
}: {
  processo: Processo | null
  onClose: () => void
  onSave: (p: {
    id?: string
    titulo: string; descricao: string; categoria: string
    status: ProcessStatus; responsavel: string
    etapas: EtapaDraft[]
  }) => Promise<void>
}) {
  const isNew = !processo?.id
  const [titulo, setTitulo]           = useState(processo?.titulo ?? '')
  const [descricao, setDescricao]     = useState(processo?.descricao ?? '')
  const [categoria, setCategoria]     = useState(processo?.categoria ?? '')
  const [status, setStatus]           = useState<ProcessStatus>(processo?.status ?? 'rascunho')
  const [responsavel, setResponsavel] = useState(processo?.responsavel ?? '')
  const [etapas, setEtapas]           = useState<EtapaDraft[]>(
    processo?.etapas.length
      ? processo.etapas.map(e => ({ titulo: e.titulo, descricao: e.descricao, responsavel: e.responsavel, duracao: e.duracao, ordem: e.ordem, notas: e.notas ?? '', ferramentas: e.ferramentas ?? '', checklist: e.checklist ?? [] }))
      : [blankEtapa(0)]
  )
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [dragIdx, setDragIdx]   = useState<number | null>(null)
  const [overIdx, setOverIdx]   = useState<number | null>(null)

  function addEtapa() {
    setEtapas(prev => [...prev, blankEtapa(prev.length)])
  }

  function removeEtapa(i: number) {
    setEtapas(prev => prev.filter((_, idx) => idx !== i).map((e, idx) => ({ ...e, ordem: idx })))
  }

  function updateEtapa(i: number, field: keyof Omit<EtapaDraft, 'ordem'>, value: string) {
    setEtapas(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return
    const reordered = [...etapas]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    setEtapas(reordered.map((e, i) => ({ ...e, ordem: i })))
    setDragIdx(null)
    setOverIdx(null)
  }

  async function handleSave() {
    if (!titulo.trim()) { setError('O título é obrigatório'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...(processo?.id ? { id: processo.id } : {}),
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria,
        status,
        responsavel: responsavel.trim(),
        etapas: etapas.map((e, i) => ({ ...e, ordem: i })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText size={15} className="text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {isNew ? 'Novo processo' : 'Editar processo'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título *</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Onboarding de cliente"
              autoFocus
              className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Breve descrição do processo..."
              rows={3}
              className="w-full rounded-xl bg-muted border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Categoria + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Nenhuma</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProcessStatus)}
                className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(STATUS_CONFIG) as ProcessStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Responsável</label>
            <input value={responsavel} onChange={e => setResponsavel(e.target.value)}
              placeholder="Nome do responsável"
              className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Etapas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-muted-foreground">Etapas</label>
              <button onClick={addEtapa}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium">
                <Plus size={12} /> Adicionar etapa
              </button>
            </div>

            <div className="space-y-2">
              {etapas.map((etapa, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={e => { e.preventDefault(); setOverIdx(i) }}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                  className={`group relative bg-muted/50 border rounded-xl p-3 transition-all ${
                    overIdx === i && dragIdx !== i ? 'border-primary/40 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                      <GripVertical size={13} className="text-muted-foreground/40 cursor-grab" />
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        value={etapa.titulo}
                        onChange={e => updateEtapa(i, 'titulo', e.target.value)}
                        placeholder={`Título da etapa ${i + 1}`}
                        className="w-full h-8 rounded-lg bg-background border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <textarea
                        value={etapa.descricao}
                        onChange={e => updateEtapa(i, 'descricao', e.target.value)}
                        placeholder="Descrição desta etapa..."
                        rows={2}
                        className="w-full rounded-lg bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={etapa.responsavel}
                          onChange={e => updateEtapa(i, 'responsavel', e.target.value)}
                          placeholder="Responsável"
                          className="h-7 rounded-lg bg-background border border-border px-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          value={etapa.duracao}
                          onChange={e => updateEtapa(i, 'duracao', e.target.value)}
                          placeholder="Duração (ex: 2h)"
                          className="h-7 rounded-lg bg-background border border-border px-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>

                    <button onClick={() => removeEtapa(i)}
                      className="mt-1 w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!titulo.trim() || saving}
            className="h-10 px-6 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando…' : isNew ? 'Criar processo' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Module ──────────────────────────────────────────────────────────────

export function ProcessosModule() {
  const supabase      = createClient()
  const { empresaId } = useEmpresa()

  const [processos, setProcessos]       = useState<Processo[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('')
  const [filterStatus, setFilterStatus] = useState<ProcessStatus | ''>('')

  // view: 'list' | 'detail'
  const [view, setView]         = useState<'list' | 'detail'>('list')
  const [selected, setSelected] = useState<Processo | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState<Processo | null>(null)

  const empresaIdRef = useRef(empresaId)
  useEffect(() => { empresaIdRef.current = empresaId }, [empresaId])

  const load = useCallback(async () => {
    setLoading(true)
    const eid = empresaIdRef.current
    let q = supabase
      .from('processos')
      .select('*, processo_etapas(*)')
      .order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    else     q = q.is('empresa_id', null)

    const { data, error } = await q
    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProcessos((data as any[]).map(p => ({
        ...p,
        etapas: ((p.processo_etapas ?? []) as Etapa[])
          .sort((a, b) => a.ordem - b.ordem)
          .map(e => ({ ...e, notas: e.notas ?? '', ferramentas: e.ferramentas ?? '', checklist: e.checklist ?? [] })),
      })) as Processo[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load, empresaId])

  async function handleSave(data: {
    id?: string
    titulo: string; descricao: string; categoria: string
    status: ProcessStatus; responsavel: string
    etapas: EtapaDraft[]
  }) {
    const { etapas, id, ...fields } = data
    const eid = empresaIdRef.current

    // Get current user id for owner_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    if (id) {
      // Update
      const { error: upErr } = await supabase
        .from('processos')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (upErr) throw new Error(upErr.message)

      await supabase.from('processo_etapas').delete().eq('processo_id', id)
      if (etapas.length > 0) {
        const { error: etErr } = await supabase.from('processo_etapas').insert(
          etapas.map((e, i) => ({ processo_id: id, ...e, ordem: i }))
        )
        if (etErr) throw new Error(etErr.message)
      }

      // Refresh selected if in detail view
      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, ...fields, etapas: etapas.map((e, i) => ({ ...e, id: '', ordem: i })) } : null)
      }
    } else {
      // Insert
      const { data: created, error: insErr } = await supabase
        .from('processos')
        .insert({ ...fields, empresa_id: eid ?? null, owner_id: user.id })
        .select('id')
        .single()
      if (insErr) throw new Error(insErr.message)

      if (created && etapas.length > 0) {
        const { error: etErr } = await supabase.from('processo_etapas').insert(
          etapas.map((e, i) => ({ processo_id: created.id, ...e, ordem: i }))
        )
        if (etErr) throw new Error(etErr.message)
      }
    }

    setFormOpen(false)
    setEditing(null)
    await load()

    // If in detail, reload the selected process
    if (view === 'detail' && selected?.id === id) {
      const { data: fresh } = await supabase
        .from('processos').select('*, processo_etapas(*)').eq('id', id!).single()
      if (fresh) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fp = fresh as any
        setSelected({ ...fp, etapas: ((fp.processo_etapas ?? []) as Etapa[]).sort((a, b) => a.ordem - b.ordem) })
      }
    }
  }

  async function handleDuplicate(p: Processo) {
    const eid = empresaIdRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: created } = await supabase.from('processos').insert({
      titulo: p.titulo + ' (cópia)', descricao: p.descricao,
      categoria: p.categoria, status: 'rascunho', responsavel: p.responsavel,
      empresa_id: eid ?? null, owner_id: user.id,
    }).select('id').single()
    if (created && p.etapas.length > 0) {
      await supabase.from('processo_etapas').insert(
        p.etapas.map((e, i) => ({ processo_id: created.id, titulo: e.titulo, descricao: e.descricao, responsavel: e.responsavel, duracao: e.duracao, ordem: i }))
      )
    }
    await load()
  }

  async function handleArchive(p: Processo) {
    const newStatus: ProcessStatus = p.status === 'arquivado' ? 'ativo' : 'arquivado'
    await supabase.from('processos').update({ status: newStatus }).eq('id', p.id)
    if (selected?.id === p.id) setSelected(prev => prev ? { ...prev, status: newStatus } : null)
    await load()
  }

  async function handleDelete(p: Processo) {
    if (!confirm(`Excluir "${p.titulo}"? Esta ação não pode ser desfeita.`)) return
    await supabase.from('processos').delete().eq('id', p.id)
    if (selected?.id === p.id) { setView('list'); setSelected(null) }
    await load()
  }

  function openCard(p: Processo) {
    setSelected(p)
    setView('detail')
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(p: Processo) {
    setEditing(p)
    setFormOpen(true)
  }

  async function handleSaveEtapa(etapa: Etapa) {
    const { error } = await supabase
      .from('processo_etapas')
      .update({
        titulo:      etapa.titulo,
        descricao:   etapa.descricao,
        responsavel: etapa.responsavel,
        duracao:     etapa.duracao,
        notas:       etapa.notas       || null,
        ferramentas: etapa.ferramentas || null,
        checklist:   etapa.checklist   ?? [],
      })
      .eq('id', etapa.id)
    if (error) throw new Error(error.message)
  }

  // Filters (only on list view)
  const filtered = processos.filter(p => {
    if (search && !p.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !(p.descricao ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat    && p.categoria !== filterCat)    return false
    if (filterStatus && p.status    !== filterStatus) return false
    return true
  })

  const ativos    = processos.filter(p => p.status === 'ativo').length
  const rascunhos = processos.filter(p => p.status === 'rascunho').length

  // ── Detail view ──
  if (view === 'detail' && selected) {
    return (
      <div>
        <ProcessoDetail
          processo={selected}
          onBack={() => { setView('list'); setSelected(null) }}
          onEdit={() => openEdit(selected)}
          onSaveEtapa={handleSaveEtapa}
        />
        {formOpen && editing && (
          <ProcessoForm
            processo={editing}
            onClose={() => { setFormOpen(false); setEditing(null) }}
            onSave={handleSave}
          />
        )}
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Processos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Documente e padronize os processos da sua operação
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus size={15} /> Novo processo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',      value: processos.length, icon: BookOpen,      color: 'text-primary',      bg: 'bg-primary/10' },
          { label: 'Ativos',     value: ativos,           icon: CheckCircle2,  color: 'text-emerald-400',  bg: 'bg-emerald-400/10' },
          { label: 'Rascunhos',  value: rascunhos,        icon: FileText,      color: 'text-amber-400',    bg: 'bg-amber-400/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar processos..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="h-9 px-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProcessStatus | '')}
          className="h-9 px-3 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_CONFIG) as ProcessStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {processos.length === 0 ? 'Nenhum processo cadastrado' : 'Nenhum resultado encontrado'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {processos.length === 0 ? 'Crie o primeiro processo da sua operação' : 'Ajuste os filtros de busca'}
          </p>
          {processos.length === 0 && (
            <button onClick={openNew}
              className="mt-5 flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus size={15} /> Criar primeiro processo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProcessCard
              key={p.id}
              processo={p}
              onClick={() => openCard(p)}
              onDuplicate={() => handleDuplicate(p)}
              onArchive={() => handleArchive(p)}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {/* Form panel */}
      {formOpen && (
        <ProcessoForm
          processo={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
