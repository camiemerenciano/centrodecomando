'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, X, Clock, Pencil, Trash2, GripVertical,
  Inbox, Search, CalendarClock, CalendarCheck2,
  FileText, FileCheck2, RefreshCw, XCircle, Phone, DollarSign,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage    = 'recepcao' | 'viabilidade' | 'ag_agendamento' | 'agendado' | 'contrato_enviado' | 'contrato_assinado' | 'followup' | 'perdido'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface PCard {
  id: string
  title: string       // nome do lead / prospect
  description: string
  client: string      // empresa/origem
  assignee: string
  assigneeInitials: string
  dueDate: string
  priority: Priority
  stage: Stage
  value: string       // valor estimado do contrato
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STAGES: {
  id: Stage; label: string; color: string; bg: string; border: string; icon: React.ReactNode
}[] = [
  { id: 'recepcao',          label: 'Recepção',               icon: <Inbox size={13} />,          color: 'text-slate-400',   bg: 'bg-slate-400/8',   border: 'border-slate-400/20'   },
  { id: 'viabilidade',       label: 'Análise de Viabilidade', icon: <Search size={13} />,         color: 'text-indigo-400',  bg: 'bg-indigo-400/8',  border: 'border-indigo-400/20'  },
  { id: 'ag_agendamento',    label: 'Aguard. Agendamento',    icon: <CalendarClock size={13} />,  color: 'text-amber-400',   bg: 'bg-amber-400/8',   border: 'border-amber-400/20'   },
  { id: 'agendado',          label: 'Agendamento Feito',      icon: <CalendarCheck2 size={13} />, color: 'text-sky-400',     bg: 'bg-sky-400/8',     border: 'border-sky-400/20'     },
  { id: 'contrato_enviado',  label: 'Contrato Enviado',       icon: <FileText size={13} />,       color: 'text-orange-400',  bg: 'bg-orange-400/8',  border: 'border-orange-400/20'  },
  { id: 'contrato_assinado', label: 'Contrato Assinado',      icon: <FileCheck2 size={13} />,     color: 'text-emerald-400', bg: 'bg-emerald-400/8', border: 'border-emerald-400/20' },
  { id: 'followup',          label: 'Follow-up',              icon: <RefreshCw size={13} />,      color: 'text-violet-400',  bg: 'bg-violet-400/8',  border: 'border-violet-400/20'  },
  { id: 'perdido',           label: 'Leads Perdidos',         icon: <XCircle size={13} />,        color: 'text-red-400',     bg: 'bg-red-400/8',     border: 'border-red-400/20'     },
]

const PRIORITY_CFG: Record<Priority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-500/15 text-red-400',       dot: 'bg-red-400'          },
  high:   { label: 'Alta',    color: 'bg-orange-500/15 text-orange-400', dot: 'bg-orange-400'       },
  medium: { label: 'Média',   color: 'bg-sky-500/15 text-sky-400',       dot: 'bg-sky-400'          },
  low:    { label: 'Baixa',   color: 'bg-muted text-muted-foreground',   dot: 'bg-muted-foreground' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): PCard {
  return {
    id:               r.id ?? r.remote_jid ?? '',
    title:            r.title ?? '',
    description:      r.description ?? '',
    client:           r.client ?? '',
    assignee:         r.assignee ?? '',
    assigneeInitials: r.assignee_initials ?? '',
    dueDate:          r.due_date ?? '',
    priority:         (r.priority ?? 'medium') as Priority,
    stage:            (r.stage ?? 'recepcao') as Stage,
    value:            r.value ?? '',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function isOverdue(d: string) {
  return !!d && new Date(d) < new Date(new Date().toDateString())
}

// ─── DraggableCard ────────────────────────────────────────────────────────────

function DraggableCard({
  card,
  onEdit,
  onDelete,
  overlay = false,
}: {
  card: PCard
  onEdit: (c: PCard) => void
  onDelete: (id: string) => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { stage: card.stage },
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const pCfg    = PRIORITY_CFG[card.priority]
  const overdue = isOverdue(card.dueDate)

  const style = overlay
    ? { cursor: 'grabbing' }
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-card border rounded-xl p-3.5 space-y-3 transition-shadow group select-none
        ${overlay
          ? 'border-primary/40 shadow-2xl shadow-primary/20 rotate-1'
          : 'border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5'
        }`}
    >
      {/* Drag handle + title row */}
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 cursor-grab active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
          aria-label="Arrastar"
        >
          <GripVertical size={14} />
        </button>

        <p className="flex-1 text-sm font-medium text-foreground leading-snug group-hover:text-primary/90 transition-colors line-clamp-2">
          {card.title}
        </p>

        <div className="flex items-center gap-1 shrink-0">
          <span className={`w-2 h-2 rounded-full ${pCfg.dot}`} title={pCfg.label} />
          {!overlay && (
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Client + value */}
      <div className="flex items-center justify-between pl-5">
        <p className="text-xs text-muted-foreground truncate">{card.client}</p>
        {card.value && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 shrink-0 ml-2">
            <DollarSign size={9} />{card.value.replace('R$ ', '')}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pl-5">
        <span className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
          <Clock size={10} />
          {fmtDate(card.dueDate)}
          {overdue && ' · atrasado'}
        </span>

        <div className="flex items-center gap-1.5">
          <Badge className={`${pCfg.color} border-0 text-[10px] px-1.5 h-4`}>
            {pCfg.label}
          </Badge>
          <Avatar className="w-5 h-5">
            <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-semibold">
              {card.assigneeInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Inline menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
          <div
            className="absolute right-2 top-8 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setMenuOpen(false); onEdit(card) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Pencil size={11} /> Editar
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(card.id) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={11} /> Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── DroppableColumn ──────────────────────────────────────────────────────────

function DroppableColumn({
  stage,
  cards,
  onAdd,
  onEdit,
  onDelete,
}: {
  stage: typeof STAGES[number]
  cards: PCard[]
  onAdd: (stage: Stage) => void
  onEdit: (c: PCard) => void
  onDelete: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${stage.bg} ${stage.border}`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${stage.color}`}>
          {stage.icon}
          {stage.label}
          <span className="text-[11px] font-normal text-muted-foreground">({cards.length})</span>
        </div>
        <button
          onClick={() => onAdd(stage.id)}
          className={`w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 ${stage.color} transition-colors`}
          title={`Adicionar em ${stage.label}`}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2.5 min-h-[240px] rounded-xl transition-all duration-150 p-1
          ${isOver ? 'bg-primary/5 ring-1 ring-primary/30' : ''}`}
      >
        {cards.map(card => (
          <DraggableCard
            key={card.id}
            card={card}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {cards.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border/50 min-h-[80px]">
            <p className="text-xs text-muted-foreground/40">Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CardFormPanel ────────────────────────────────────────────────────────────

function CardFormPanel({
  card,
  onSave,
  onClose,
}: {
  card: Partial<PCard> | null
  onSave: (c: PCard) => void
  onClose: () => void
}) {
  const isEdit = !!card?.id
  const [form, setForm] = useState<Partial<PCard>>({
    title: '',
    description: '',
    client: '',
    assignee: '',
    assigneeInitials: '',
    dueDate: '',
    priority: 'medium',
    stage: 'recepcao',
    value: '',
    ...card,
  })

  function field<K extends keyof PCard>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (key === 'assignee') {
        const initials = e.target.value.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
        setForm(p => ({ ...p, assignee: e.target.value, assigneeInitials: initials }))
      } else {
        setForm(p => ({ ...p, [key]: e.target.value }))
      }
    }
  }

  function save() {
    if (!form.title?.trim()) return
    onSave({
      id:               card?.id ?? `card-${Date.now()}`,
      title:            form.title!.trim(),
      description:      form.description ?? '',
      client:           form.client!,
      assignee:         form.assignee!,
      assigneeInitials: form.assigneeInitials!,
      dueDate:          form.dueDate ?? '',
      priority:         form.priority!,
      stage:            form.stage!,
      value:            form.value ?? '',
    })
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const lbl = 'block text-[11px] font-medium text-muted-foreground mb-1.5'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            {isEdit ? 'Editar entrega' : 'Nova entrega'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          <div>
            <label className={lbl}>Nome do lead <span className="text-destructive">*</span></label>
            <input
              value={form.title ?? ''}
              onChange={field('title')}
              placeholder="Ex: João Silva"
              className={inp + ' h-9'}
              autoFocus
            />
          </div>

          <div>
            <label className={lbl}>Descrição / Observações</label>
            <textarea
              value={form.description ?? ''}
              onChange={field('description')}
              placeholder="Interesse, origem, contexto..."
              rows={3}
              className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Empresa / Origem</label>
              <input value={form.client ?? ''} onChange={field('client')} placeholder="Ex: Loja XYZ" className={inp} />
            </div>
            <div>
              <label className={lbl}>Responsável</label>
              <input value={form.assignee ?? ''} onChange={field('assignee')} placeholder="Nome do responsável" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Prazo</label>
              <input type="date" value={form.dueDate ?? ''} onChange={field('dueDate')} className={inp + ' cursor-pointer'} />
            </div>
            <div>
              <label className={lbl}>Prioridade</label>
              <select value={form.priority} onChange={field('priority')} className={inp + ' cursor-pointer'}>
                <option value="urgent">🔴 Urgente</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🔵 Média</option>
                <option value="low">⚪ Baixa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Etapa</label>
              <select value={form.stage} onChange={field('stage')} className={inp + ' cursor-pointer'}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Valor estimado</label>
              <input value={form.value ?? ''} onChange={field('value')} placeholder="R$ 0,00" className={inp} />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Cancelar
          </button>
          <Button
            size="sm"
            onClick={save}
            disabled={!form.title?.trim()}
            className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5"
          >
            {isEdit ? <><Pencil size={12} /> Salvar</> : <><Plus size={12} /> Adicionar lead</>}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Main module ──────────────────────────────────────────────────────────────

export function PipelineModule() {
  const [cards, setCards]               = useState<PCard[]>([])
  const [activeCard, setActiveCard]     = useState<PCard | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [editCard, setEditCard]         = useState<Partial<PCard> | null>(null)
  const [filterPriority, setFilterPriority] = useState('all')
  const [saving, setSaving]             = useState<string | null>(null)
  const [userId, setUserId]             = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchCards() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // pipeline_leads é sempre a fonte de verdade
      const leadsRes = await fetch('/api/pipeline/leads')
      const leadsData: Record<string, unknown>[] = leadsRes.ok ? await leadsRes.json() : []
      if (!Array.isArray(leadsData)) return

      if (leadsData.length === 0) { setCards([]); return }

      // tenta enriquecer nomes via Evolution (opcional — se falhar usa o que tem no banco)
      const cfgRes = await fetch('/api/evolution/config')
      if (cfgRes.ok) {
        const { apiUrl, apiKey, instanceName } = await cfgRes.json()
        if (apiUrl && apiKey && instanceName) {
          const evoRes = await fetch('/api/evolution/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiUrl, apiKey, instanceName }),
          })
          if (evoRes.ok) {
            const chats = await evoRes.json()
            if (Array.isArray(chats)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const nameByJid = new Map(chats.map((c: any) => {
                const jid: string = c?.remoteJid ?? c?.id?.remote ?? c?.id ?? ''
                const phone = jid.split('@')[0]
                return [jid, (c?.name ?? c?.pushName ?? `+${phone}`) as string]
              }))
              setCards(leadsData.map(l => fromRow({
                ...l,
                title:  nameByJid.get(l.remote_jid as string) ?? l.title,
                client: nameByJid.get(l.remote_jid as string) ?? l.client,
              })))
              return
            }
          }
        }
      }

      // fallback: só dados do banco
      setCards(leadsData.map(fromRow))
    }

    fetchCards()
    const interval = setInterval(fetchCards, 30_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const filtered = useMemo(() => cards.filter(c => {
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false
    return true
  }), [cards, filterPriority])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    setActiveCard(cards.find(c => c.id === active.id) ?? null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null)
    if (!over) return

    const cardId  = active.id as string
    const overId  = over.id  as string

    // over.id could be a stage id or another card id → resolve to stage
    const targetStage =
      STAGES.find(s => s.id === overId)?.id ??
      cards.find(c => c.id === overId)?.stage

    if (!targetStage) return

    const currentStage = cards.find(c => c.id === cardId)?.stage
    if (currentStage === targetStage) return

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, stage: targetStage } : c))
    setSaving(cardId)
    supabase.from('pipeline_leads').update({ stage: targetStage }).eq('id', cardId)
      .then(() => setSaving(null))
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  function openAdd(stage?: Stage) {
    setEditCard({ stage: stage ?? 'recepcao' })
    setShowForm(true)
  }

  function openEdit(card: PCard) {
    setEditCard(card)
    setShowForm(true)
  }

  async function handleSave(card: PCard) {
    if (!userId) return
    const row = {
      user_id:          userId,
      title:            card.title,
      description:      card.description,
      client:           card.client,
      assignee:         card.assignee,
      assignee_initials: card.assigneeInitials,
      due_date:         card.dueDate,
      priority:         card.priority,
      stage:            card.stage,
      value:            card.value,
    }
    const isNew = !cards.some(c => c.id === card.id)
    if (isNew) {
      const res = await fetch('/api/pipeline/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      })
      if (res.ok) {
        const data = await res.json()
        setCards(prev => [...prev, fromRow(data)])
      }
    } else {
      await supabase.from('pipeline_leads').update(row).eq('id', card.id)
      setCards(prev => prev.map(c => c.id === card.id ? card : c))
    }
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('pipeline_leads').delete().eq('id', id)
    setCards(prev => prev.filter(c => c.id !== id))
  }

  const sel = 'h-8 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all'

  return (
    <div className="space-y-5 max-w-[1440px]">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={sel}>
            <option value="all">Todas as prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          {filterPriority !== 'all' && (
            <button
              onClick={() => setFilterPriority('all')}
              className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[11px] text-muted-foreground animate-pulse">Salvando…</span>
          )}
          <Button size="sm" onClick={() => openAdd()} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            <Plus size={13} /> Novo lead
          </Button>
        </div>
      </div>

      {/* ── Kanban ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-h-[60vh]" style={{ minWidth: `${STAGES.length * 260}px` }}>
            {STAGES.map(stage => (
              <div key={stage.id} className="w-[248px] shrink-0">
                <DroppableColumn
                  stage={stage}
                  cards={filtered.filter(c => c.stage === stage.id)}
                  onAdd={openAdd}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Drag overlay — follows the cursor */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeCard && (
            <DraggableCard
              card={activeCard}
              onEdit={() => {}}
              onDelete={() => {}}
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Form panel ── */}
      {showForm && (
        <CardFormPanel
          card={editCard}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
