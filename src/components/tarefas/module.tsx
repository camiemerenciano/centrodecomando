'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus, LayoutGrid, List, X, Clock, MessageSquare,
  Circle, PlayCircle, Eye, CheckCircle2, Pencil, Hourglass,
  Trash2, ChevronDown, ChevronLeft, ChevronRight, GanttChart,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type OpStatus = 'novo' | 'em_andamento' | 'aguardando_cliente' | 'revisao' | 'concluido'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface OpTask {
  id: string
  title: string
  description: string
  client: string
  assignee: string
  assigneeInitials: string
  dueDate: string
  priority: Priority
  status: OpStatus
  conversationOrigin: string | null
  createdAt: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_ORDER: OpStatus[] = [
  'novo', 'em_andamento', 'aguardando_cliente', 'revisao', 'concluido',
]

const STATUS_CFG: Record<OpStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  novo:               { label: 'Novo',           color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20',   icon: <Circle size={11} />       },
  em_andamento:       { label: 'Em andamento',   color: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/20',     icon: <PlayCircle size={11} />   },
  aguardando_cliente: { label: 'Ag. cliente',    color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: <Hourglass size={11} />    },
  revisao:            { label: 'Revisão',        color: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/20',  icon: <Eye size={11} />          },
  concluido:          { label: 'Concluído',      color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: <CheckCircle2 size={11} /> },
}

const PRIORITY_CFG: Record<Priority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-500/15 text-red-400',       dot: 'bg-red-400'          },
  high:   { label: 'Alta',    color: 'bg-orange-500/15 text-orange-400', dot: 'bg-orange-400'       },
  medium: { label: 'Média',   color: 'bg-sky-500/15 text-sky-400',       dot: 'bg-sky-400'          },
  low:    { label: 'Baixa',   color: 'bg-muted text-muted-foreground',   dot: 'bg-muted-foreground' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function isOverdue(d: string) {
  return !!d && new Date(d) < new Date(new Date().toDateString())
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): OpTask {
  return {
    id:                 r.id,
    title:              r.title ?? '',
    description:        r.description ?? '',
    client:             r.client ?? '',
    assignee:           r.assignee ?? '',
    assigneeInitials:   r.assignee_initials ?? '',
    dueDate:            r.due_date ?? '',
    priority:           (r.priority ?? 'medium') as Priority,
    status:             (r.status ?? 'novo') as OpStatus,
    conversationOrigin: r.conversation_origin ?? null,
    createdAt:          r.created_at ?? new Date().toISOString(),
  }
}

// ─── GanttView ────────────────────────────────────────────────────────────────

const PT_WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const PT_MONTHS   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const CELL = 32   // px por dia
const ROW  = 44   // px por tarefa
const HDR  = 52   // px do cabeçalho

function dayOnly(d: Date) {
  const r = new Date(d); r.setHours(0,0,0,0); return r
}

function GanttView({ tasks, onEdit }: { tasks: OpTask[]; onEdit: (t: OpTask) => void }) {
  const today = useMemo(() => dayOnly(new Date()), [])

  const [winStart, setWinStart] = useState<Date>(() => {
    const d = dayOnly(new Date()); d.setDate(d.getDate() - 14); return d
  })

  const DAYS = 90
  const scrollRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(winStart); d.setDate(winStart.getDate() + i); return d
  }), [winStart])

  // group days by month for the top header
  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = []
    for (const d of days) {
      const lbl = `${PT_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
      if (!groups.length || groups[groups.length - 1].label !== lbl)
        groups.push({ label: lbl, count: 0 })
      groups[groups.length - 1].count++
    }
    return groups
  }, [days])

  const todayOff = useMemo(
    () => Math.round((today.getTime() - winStart.getTime()) / 86400000),
    [today, winStart]
  )

  function navigate(months: number) {
    setWinStart(prev => {
      const d = new Date(prev); d.setMonth(d.getMonth() + months); return d
    })
  }

  function goToday() {
    const d = dayOnly(new Date()); d.setDate(d.getDate() - 14); setWinStart(d)
  }

  // Scroll so today is visible on mount
  useEffect(() => {
    if (scrollRef.current && todayOff >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOff * CELL - 120)
    }
  }, [todayOff])

  const totalW = DAYS * CELL

  return (
    <div className="space-y-3">
      {/* Nav */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ChevronLeft size={13} />
        </button>
        <button onClick={() => navigate(1)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ChevronRight size={13} />
        </button>
        <button onClick={goToday} className="h-7 px-3 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/20">
          Hoje
        </button>
        <span className="text-xs text-muted-foreground ml-1">
          {PT_MONTHS[days[0].getMonth()]} {days[0].getFullYear()} – {PT_MONTHS[days[DAYS-1].getMonth()]} {days[DAYS-1].getFullYear()}
        </span>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-border overflow-hidden flex select-none">

        {/* Left: task names */}
        <div className="w-52 shrink-0 border-r border-border z-10 bg-card">
          <div style={{ height: HDR }} className="flex items-end px-4 pb-2.5 border-b border-border bg-muted/30">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tarefa</span>
          </div>
          {tasks.length === 0 && (
            <div style={{ height: ROW * 3 }} className="flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Nenhuma tarefa</p>
            </div>
          )}
          {tasks.map(task => {
            const cfg = STATUS_CFG[task.status]
            return (
              <div
                key={task.id}
                style={{ height: ROW }}
                className="flex items-center gap-2.5 px-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer group transition-colors"
                onClick={() => onEdit(task)}
              >
                <span className={cfg.color + ' shrink-0'}>{cfg.icon}</span>
                <span className="text-xs text-foreground truncate flex-1">{task.title}</span>
              </div>
            )
          })}
        </div>

        {/* Right: scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div style={{ width: totalW }} className="relative">

            {/* Month row */}
            <div style={{ height: HDR / 2 }} className="flex border-b border-border bg-muted/20">
              {monthGroups.map((mg, i) => (
                <div
                  key={i}
                  style={{ width: mg.count * CELL }}
                  className="shrink-0 flex items-center px-2.5 border-r border-border/40 text-[11px] font-semibold text-muted-foreground"
                >
                  {mg.label}
                </div>
              ))}
            </div>

            {/* Day row */}
            <div style={{ height: HDR / 2 }} className="flex border-b border-border bg-muted/30">
              {days.map((d, i) => {
                const isToday = i === todayOff
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div
                    key={i}
                    style={{ width: CELL }}
                    className={`shrink-0 flex flex-col items-center justify-center border-r border-border/30
                      ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/60' : ''}`}
                  >
                    <span className={`text-[8px] font-medium leading-none ${isToday ? 'text-primary' : 'text-muted-foreground/50'}`}>
                      {PT_WEEKDAYS[d.getDay()]}
                    </span>
                    <span className={`text-[10px] font-bold leading-tight ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {d.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Task rows */}
            {tasks.length === 0 && (
              <div style={{ height: ROW * 3, width: totalW }} className="flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Nenhuma tarefa para exibir</p>
              </div>
            )}
            {tasks.map(task => {
              const start = dayOnly(new Date(task.createdAt))
              const end   = task.dueDate ? dayOnly(new Date(task.dueDate)) : null

              const startOff = Math.round((start.getTime() - winStart.getTime()) / 86400000)
              const endOff   = end ? Math.round((end.getTime() - winStart.getTime()) / 86400000) : startOff

              const barL = Math.max(0, startOff) * CELL
              const barR = Math.min(DAYS, endOff + 1) * CELL
              const barW = Math.max(CELL, barR - barL)
              const visible = endOff >= 0 && startOff < DAYS

              const cfg     = STATUS_CFG[task.status]
              const overdue = !!task.dueDate && isOverdue(task.dueDate) && task.status !== 'concluido'

              return (
                <div
                  key={task.id}
                  style={{ height: ROW, width: totalW }}
                  className="relative border-b border-border/40"
                >
                  {/* Weekend shading columns */}
                  {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) ? (
                    <div key={i} style={{ left: i * CELL, width: CELL, height: ROW }} className="absolute bg-muted/25 pointer-events-none" />
                  ) : null)}

                  {/* Today vertical line */}
                  {todayOff >= 0 && todayOff < DAYS && (
                    <div
                      style={{ left: todayOff * CELL + CELL / 2 - 0.5, height: ROW }}
                      className="absolute w-px bg-primary/25 pointer-events-none z-10"
                    />
                  )}

                  {/* Bar */}
                  {visible && (
                    <div
                      style={{ left: barL + 2, width: barW - 4, top: (ROW - 28) / 2, height: 28 }}
                      className={`absolute rounded-lg flex items-center px-2.5 overflow-hidden cursor-pointer border
                        hover:brightness-110 transition-all z-20
                        ${overdue
                          ? 'bg-red-500/20 border-red-500/40 text-red-300'
                          : `${cfg.bg} ${cfg.border} ${cfg.color}`
                        }`}
                      onClick={() => onEdit(task)}
                      title={`${task.title}${task.dueDate ? ' · vence ' + fmtDate(task.dueDate) : ''}${overdue ? ' · ATRASADA' : ''}`}
                    >
                      <span className="text-[10px] font-medium truncate">{task.title}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-[10px] text-muted-foreground">Barra vai da data de criação até o prazo</span>
        <span className="flex items-center gap-1 text-[10px] text-red-400"><span className="w-2 h-2 rounded-sm bg-red-500/20 border border-red-500/40 inline-block" /> Atrasada</span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-px h-3 bg-primary/40 inline-block" /> Hoje</span>
      </div>
    </div>
  )
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, onEdit, onDelete,
}: {
  task: OpTask
  onEdit: (t: OpTask) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pCfg   = PRIORITY_CFG[task.priority]
  const overdue = isOverdue(task.dueDate)

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('taskId', task.id); e.dataTransfer.effectAllowed = 'move' }}
      className="relative bg-card border border-border rounded-xl p-3.5 space-y-2 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:shadow-primary/5 group"
      onClick={() => onEdit(task)}
    >
      {/* Título + menu */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary/90 transition-colors line-clamp-2 flex-1">
          {task.title}
        </p>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
          </svg>
        </button>
      </div>

      {task.client && <p className="text-xs text-muted-foreground">{task.client}</p>}

      {task.conversationOrigin && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <MessageSquare size={9} />
          <span className="truncate">{task.conversationOrigin}</span>
        </div>
      )}

      {/* Prioridade + prazo */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <Badge className={`${pCfg.color} border-0 text-[10px] px-1.5 h-5 gap-1 shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
          {pCfg.label}
        </Badge>
        {task.dueDate && (
          <span className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
            <Clock size={9} />
            {fmtDate(task.dueDate)}
            {overdue && ' · atrasada'}
          </span>
        )}
      </div>

      {/* Responsável */}
      {task.assignee && (
        <div className="flex items-center gap-1.5">
          <Avatar className="w-4 h-4 shrink-0">
            <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-semibold">
              {task.assigneeInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-muted-foreground truncate">{task.assignee}</span>
        </div>
      )}

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
          <div className="absolute right-2 top-8 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); onEdit(task) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
              <Pencil size={11} /> Editar
            </button>
            <button onClick={() => { setMenuOpen(false); onDelete(task.id) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 size={11} /> Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── TaskFormPanel ────────────────────────────────────────────────────────────

function TaskFormPanel({
  task, onSave, onClose, clientNames, memberNames,
}: {
  task: Partial<OpTask> | null
  onSave: (t: OpTask) => void
  onClose: () => void
  clientNames: string[]
  memberNames: string[]
}) {
  const isEdit = !!task?.id
  const [form, setForm] = useState<Partial<OpTask>>({
    title: '', description: '', client: '', assignee: '', assigneeInitials: '',
    dueDate: '', priority: 'medium', status: 'novo', conversationOrigin: null,
    ...task,
  })

  function field<K extends keyof OpTask>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (key === 'assignee') {
        const initials = e.target.value.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase()
        setForm(p => ({ ...p, assignee: e.target.value, assigneeInitials: initials }))
      } else {
        setForm(p => ({ ...p, [key]: e.target.value }))
      }
    }
  }

  function save() {
    if (!form.title?.trim()) return
    onSave({
      id:                 task?.id ?? `task-${Date.now()}`,
      title:              form.title!.trim(),
      description:        form.description ?? '',
      client:             form.client ?? '',
      assignee:           form.assignee ?? '',
      assigneeInitials:   form.assigneeInitials ?? '',
      dueDate:            form.dueDate ?? '',
      priority:           form.priority!,
      status:             form.status!,
      conversationOrigin: form.conversationOrigin?.trim() || null,
      createdAt:          task?.createdAt ?? new Date().toISOString(),
    })
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const lbl = 'block text-[11px] font-medium text-muted-foreground mb-1.5'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[440px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</h2>
            {isEdit && <p className="text-[10px] text-muted-foreground mt-0.5">ID #{task?.id}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <label className={lbl}>Título <span className="text-destructive">*</span></label>
            <input value={form.title ?? ''} onChange={field('title')} placeholder="Ex: Criar artes para campanha de junho" className={inp + ' h-9'} autoFocus />
          </div>

          <div>
            <label className={lbl}>Descrição</label>
            <textarea value={form.description ?? ''} onChange={field('description')} placeholder="Detalhes, contexto ou critérios de aceite..." rows={3} className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Cliente</label>
              <div className="relative">
                <select value={form.client ?? ''} onChange={field('client')} className={inp + ' cursor-pointer appearance-none pr-7'}>
                  <option value="">— Sem cliente —</option>
                  {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={lbl}>Responsável</label>
              <div className="relative">
                <select value={form.assignee ?? ''} onChange={field('assignee')} className={inp + ' cursor-pointer appearance-none pr-7'}>
                  <option value="">— Sem responsável —</option>
                  {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Prazo</label>
              <input type="date" value={form.dueDate ?? ''} onChange={field('dueDate')} className={inp + ' cursor-pointer'} />
            </div>
            <div>
              <label className={lbl}>Prioridade</label>
              <div className="relative">
                <select value={form.priority} onChange={field('priority')} className={inp + ' cursor-pointer appearance-none pr-7'}>
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟠 Alta</option>
                  <option value="medium">🔵 Média</option>
                  <option value="low">⚪ Baixa</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Status</label>
            <div className="relative">
              <select value={form.status} onChange={field('status')} className={inp + ' cursor-pointer appearance-none pr-7'}>
                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={lbl}>Origem da conversa</label>
            <input value={form.conversationOrigin ?? ''} onChange={e => setForm(p => ({ ...p, conversationOrigin: e.target.value || null }))} placeholder="Ex: Ana Beatriz – Loja Bloom" className={inp} />
            <p className="text-[10px] text-muted-foreground mt-1">Deixe em branco se a tarefa não veio de uma conversa.</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <Button size="sm" onClick={save} disabled={!form.title?.trim()} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            {isEdit ? <><Pencil size={12} /> Salvar alterações</> : <><Plus size={12} /> Criar tarefa</>}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Main module ──────────────────────────────────────────────────────────────

export function TarefasModule() {
  const [tasks, setTasks]               = useState<OpTask[]>([])
  const [dragOver, setDragOver]         = useState<OpStatus | null>(null)
  const [view, setView]                 = useState<'kanban' | 'list' | 'gantt'>('kanban')
  const [filterStatus, setFilterStatus] = useState<OpStatus | 'all'>('all')
  const [filterDue, setFilterDue]       = useState('all')
  const [showForm, setShowForm]         = useState(false)
  const [editTask, setEditTask]         = useState<Partial<OpTask> | null>(null)
  const [userId, setUserId]             = useState<string | null>(null)
  const [clientNames, setClientNames]   = useState<string[]>([])
  const [memberNames, setMemberNames]   = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: tarefasData }, { data: clientesData }] = await Promise.all([
        supabase.from('tarefas').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('clientes').select('name').eq('user_id', user.id).order('name'),
      ])

      if (tarefasData) setTasks(tarefasData.map(fromRow))
      if (clientesData) setClientNames(clientesData.map((c: { name: string }) => c.name).filter(Boolean))

      // Team members: current user + any future org members
      const fullName = user.user_metadata?.full_name as string | undefined
      if (fullName) setMemberNames([fullName])
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterDue !== 'all') {
      const today = new Date(new Date().toDateString())
      const due   = new Date(t.dueDate)
      if (filterDue === 'overdue' && due >= today) return false
      if (filterDue === 'today') {
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
        if (due < today || due >= tomorrow) return false
      }
      if (filterDue === 'week') {
        const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7)
        if (due < today || due > nextWeek) return false
      }
    }
    return true
  }), [tasks, filterStatus, filterDue])

  function openCreate(status?: OpStatus) {
    setEditTask(status ? { status } : { status: 'novo' })
    setShowForm(true)
  }

  function openEdit(task: OpTask) {
    setEditTask(task)
    setShowForm(true)
  }

  async function handleSave(task: OpTask) {
    if (!userId) return
    const row = {
      user_id:            userId,
      title:              task.title,
      description:        task.description,
      client:             task.client,
      assignee:           task.assignee,
      assignee_initials:  task.assigneeInitials,
      due_date:           task.dueDate,
      priority:           task.priority,
      status:             task.status,
      conversation_origin: task.conversationOrigin,
    }
    const isNew = !tasks.some(t => t.id === task.id)
    if (isNew) {
      const { data } = await supabase.from('tarefas').insert(row).select().single()
      if (data) setTasks(prev => [...prev, fromRow(data)])
    } else {
      await supabase.from('tarefas').update(row).eq('id', task.id)
      setTasks(prev => prev.map(t => t.id === task.id ? task : t))
    }
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('tarefas').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function moveTask(id: string, status: OpStatus) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await supabase.from('tarefas').update({ status }).eq('id', id)
  }

  const sel = 'h-8 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all'
  const activeFilters = [filterStatus, filterDue].filter(f => f !== 'all').length

  return (
    <div className="space-y-4 max-w-[1440px]">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as OpStatus | 'all')} className={sel}>
            <option value="all">Todos os status</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
          </select>

          <select value={filterDue} onChange={e => setFilterDue(e.target.value)} className={sel}>
            <option value="all">Qualquer prazo</option>
            <option value="overdue">Atrasadas</option>
            <option value="today">Vence hoje</option>
            <option value="week">Esta semana</option>
          </select>

          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterStatus('all'); setFilterDue('all') }}
              className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
            >
              <X size={11} /> Limpar ({activeFilters})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button onClick={() => setView('kanban')} className={`w-7 h-7 flex items-center justify-center rounded transition-all ${view === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Kanban">
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setView('list')} className={`w-7 h-7 flex items-center justify-center rounded transition-all ${view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Lista">
              <List size={13} />
            </button>
            <button onClick={() => setView('gantt')} className={`w-7 h-7 flex items-center justify-center rounded transition-all ${view === 'gantt' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Gantt">
              <GanttChart size={13} />
            </button>
          </div>
          <Button size="sm" onClick={() => openCreate()} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            <Plus size={13} /> Nova tarefa
          </Button>
        </div>
      </div>

      {/* ── Kanban view ── */}
      {view === 'kanban' && (
        <div className="grid grid-cols-5 gap-3 min-h-[60vh]">
          {STATUS_ORDER.map(status => {
            const col = filtered.filter(t => t.status === status)
            const cfg = STATUS_CFG[status]
            const isOver = dragOver === status
            return (
              <div
                key={status}
                className={`flex flex-col gap-2 rounded-xl p-1 -m-1 transition-colors ${isOver ? 'bg-primary/8 ring-1 ring-primary/25' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(status) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                onDrop={e => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('taskId')
                  if (id) moveTask(id, status)
                  setDragOver(null)
                }}
              >
                <div className="flex items-center justify-between px-1 py-0.5">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
                    {cfg.icon}
                    <span>{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({col.length})</span>
                  </div>
                  <button onClick={() => openCreate(status)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={`Nova tarefa em ${cfg.label}`}>
                    <Plus size={12} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {col.map(task => (
                    <TaskCard key={task.id} task={task} onEdit={openEdit} onDelete={handleDelete} />
                  ))}
                  <button onClick={() => openCreate(status)} className="w-full py-2.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                    + Adicionar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Tarefa', 'Cliente', 'Responsável', 'Prazo', 'Prioridade', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-3 first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(task => {
                const stCfg  = STATUS_CFG[task.status]
                const pCfg   = PRIORITY_CFG[task.priority]
                const overdue = isOverdue(task.dueDate)
                return (
                  <tr key={task.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-3 max-w-[260px]">
                      <p className="text-sm text-foreground font-medium truncate">{task.title}</p>
                      {task.conversationOrigin && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <MessageSquare size={9} />{task.conversationOrigin}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{task.client}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {task.assigneeInitials && (
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-semibold">{task.assigneeInitials}</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{task.assignee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                        <Clock size={11} />{fmtDate(task.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${pCfg.color} border-0 text-[10px] px-1.5 h-5`}>{pCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 h-5 rounded-full ${stCfg.bg} ${stCfg.color} border ${stCfg.border}`}>
                        {stCfg.icon}{stCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(task)} className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Editar">
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
                    <button onClick={() => openCreate()} className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors">+ Criar nova tarefa</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Gantt view ── */}
      {view === 'gantt' && (
        <GanttView tasks={filtered} onEdit={openEdit} />
      )}

      {showForm && (
        <TaskFormPanel
          task={editTask}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          clientNames={clientNames}
          memberNames={memberNames}
        />
      )}
    </div>
  )
}
