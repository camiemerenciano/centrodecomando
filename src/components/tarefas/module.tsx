'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, LayoutGrid, List, X, Clock, MessageSquare,
  Circle, PlayCircle, Eye, CheckCircle2, Pencil, Hourglass,
  Trash2, Flag,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

type OpStatus   = 'novo' | 'em_andamento' | 'aguardando_cliente' | 'revisao' | 'concluido'
type Priority   = 'low' | 'medium' | 'high' | 'urgent'

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
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_ORDER: OpStatus[] = [
  'novo', 'em_andamento', 'aguardando_cliente', 'revisao', 'concluido',
]

const STATUS_CFG: Record<OpStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  novo:               { label: 'Novo',              color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20',   icon: <Circle size={11} />       },
  em_andamento:       { label: 'Em andamento',       color: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/20',     icon: <PlayCircle size={11} />   },
  aguardando_cliente: { label: 'Aguard. cliente',    color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: <Hourglass size={11} />    },
  revisao:            { label: 'Revisão',            color: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/20',  icon: <Eye size={11} />          },
  concluido:          { label: 'Concluído',          color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: <CheckCircle2 size={11} /> },
}

const PRIORITY_CFG: Record<Priority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-500/15 text-red-400',         dot: 'bg-red-400'     },
  high:   { label: 'Alta',    color: 'bg-orange-500/15 text-orange-400',   dot: 'bg-orange-400'  },
  medium: { label: 'Média',   color: 'bg-sky-500/15 text-sky-400',         dot: 'bg-sky-400'     },
  low:    { label: 'Baixa',   color: 'bg-muted text-muted-foreground',     dot: 'bg-muted-foreground' },
}

const CLIENTS:   string[]                          = []
const ASSIGNEES: { name: string; initials: string }[] = []

const INITIAL_TASKS: OpTask[] = []

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function isOverdue(d: string) {
  return !!d && new Date(d) < new Date(new Date().toDateString())
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onDelete,
}: {
  task: OpTask
  onEdit: (t: OpTask) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pCfg  = PRIORITY_CFG[task.priority]
  const overdue = isOverdue(task.dueDate)

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('taskId', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="relative bg-card border border-border rounded-xl p-3.5 space-y-2.5 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:shadow-primary/5 group"
      onClick={() => onEdit(task)}
    >
      {/* Priority dot */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary/90 transition-colors line-clamp-2 flex-1">
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pCfg.dot}`} />
          {/* Menu button */}
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{task.client}</p>

      {task.conversationOrigin && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <MessageSquare size={9} />
          <span className="truncate">{task.conversationOrigin}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
          <Clock size={10} />
          {fmtDate(task.dueDate)}
          {overdue && ' · atrasada'}
        </span>
        <Avatar className="w-5 h-5">
          <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-semibold">
            {task.assigneeInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Inline dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
          <div
            className="absolute right-2 top-8 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setMenuOpen(false); onEdit(task) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Pencil size={11} /> Editar
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(task.id) }}
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

// ─── TaskFormPanel ────────────────────────────────────────────────────────────

function TaskFormPanel({
  task,
  onSave,
  onClose,
}: {
  task: Partial<OpTask> | null
  onSave: (t: OpTask) => void
  onClose: () => void
}) {
  const isEdit = !!task?.id
  const [form, setForm] = useState<Partial<OpTask>>({
    title: '',
    description: '',
    client: CLIENTS[0],
    assignee: ASSIGNEES[0].name,
    assigneeInitials: ASSIGNEES[0].initials,
    dueDate: '',
    priority: 'medium',
    status: 'novo',
    conversationOrigin: null,
    ...task,
  })

  function field<K extends keyof OpTask>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (key === 'assignee') {
        const a = ASSIGNEES.find(x => x.name === e.target.value)
        setForm(p => ({ ...p, assignee: e.target.value, assigneeInitials: a?.initials ?? '' }))
      } else {
        setForm(p => ({ ...p, [key]: e.target.value }))
      }
    }
  }

  function save() {
    if (!form.title?.trim()) return
    onSave({
      id:                  task?.id ?? `task-${Date.now()}`,
      title:               form.title!.trim(),
      description:         form.description ?? '',
      client:              form.client!,
      assignee:            form.assignee!,
      assigneeInitials:    form.assigneeInitials!,
      dueDate:             form.dueDate ?? '',
      priority:            form.priority!,
      status:              form.status!,
      conversationOrigin:  form.conversationOrigin?.trim() || null,
    })
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const lbl = 'block text-[11px] font-medium text-muted-foreground mb-1.5'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[440px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {isEdit ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            {isEdit && (
              <p className="text-[10px] text-muted-foreground mt-0.5">ID #{task?.id}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className={lbl}>Título <span className="text-destructive">*</span></label>
            <input
              value={form.title ?? ''}
              onChange={field('title')}
              placeholder="Ex: Criar artes para campanha de junho"
              className={inp + ' h-9'}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Descrição</label>
            <textarea
              value={form.description ?? ''}
              onChange={field('description')}
              placeholder="Detalhes, contexto ou critérios de aceite..."
              rows={3}
              className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {/* Client + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Cliente</label>
              <select value={form.client} onChange={field('client')} className={inp + ' cursor-pointer'}>
                {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Responsável</label>
              <select value={form.assignee} onChange={field('assignee')} className={inp + ' cursor-pointer'}>
                {ASSIGNEES.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Due date + Priority */}
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

          {/* Status */}
          <div>
            <label className={lbl}>Status</label>
            <select value={form.status} onChange={field('status')} className={inp + ' cursor-pointer'}>
              {STATUS_ORDER.map(s => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Conversation origin */}
          <div>
            <label className={lbl}>Origem da conversa</label>
            <input
              value={form.conversationOrigin ?? ''}
              onChange={e => setForm(p => ({ ...p, conversationOrigin: e.target.value || null }))}
              placeholder="Ex: Ana Beatriz – Loja Bloom"
              className={inp}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Deixe em branco se a tarefa não veio de uma conversa.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <Button
            size="sm"
            onClick={save}
            disabled={!form.title?.trim()}
            className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5"
          >
            {isEdit ? <><Pencil size={12} /> Salvar alterações</> : <><Plus size={12} /> Criar tarefa</>}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Main module ──────────────────────────────────────────────────────────────

export function TarefasModule() {
  const [tasks, setTasks]               = useState(INITIAL_TASKS)
  const [dragOver, setDragOver]         = useState<OpStatus | null>(null)
  const [view, setView]                 = useState<'kanban' | 'list'>('kanban')
  const [filterStatus, setFilterStatus] = useState<OpStatus | 'all'>('all')
  const [filterClient, setFilterClient] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterDue, setFilterDue]       = useState('all')
  const [showForm, setShowForm]         = useState(false)
  const [editTask, setEditTask]         = useState<Partial<OpTask> | null>(null)

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterClient !== 'all' && t.client !== filterClient) return false
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false
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
  }), [tasks, filterStatus, filterClient, filterAssignee, filterDue])

  function openCreate(status?: OpStatus) {
    setEditTask(status ? { status } : { status: 'novo' })
    setShowForm(true)
  }

  function openEdit(task: OpTask) {
    setEditTask(task)
    setShowForm(true)
  }

  function handleSave(task: OpTask) {
    setTasks(prev => prev.some(t => t.id === task.id)
      ? prev.map(t => t.id === task.id ? task : t)
      : [...prev, task]
    )
    setShowForm(false)
  }

  function handleDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const sel = 'h-8 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all'

  const activeFilters = [filterStatus, filterClient, filterAssignee, filterDue].filter(f => f !== 'all').length

  return (
    <div className="space-y-4 max-w-[1440px]">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as OpStatus | 'all')} className={sel}>
            <option value="all">Todos os status</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
          </select>

          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={sel}>
            <option value="all">Todos os clientes</option>
            {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className={sel}>
            <option value="all">Todos os responsáveis</option>
            {ASSIGNEES.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>

          <select value={filterDue} onChange={e => setFilterDue(e.target.value)} className={sel}>
            <option value="all">Qualquer prazo</option>
            <option value="overdue">Atrasadas</option>
            <option value="today">Vence hoje</option>
            <option value="week">Esta semana</option>
          </select>

          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterStatus('all'); setFilterClient('all'); setFilterAssignee('all'); setFilterDue('all') }}
              className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
            >
              <X size={11} /> Limpar ({activeFilters})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setView('kanban')}
              className={`w-7 h-7 flex items-center justify-center rounded transition-all ${view === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Visão Kanban"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`w-7 h-7 flex items-center justify-center rounded transition-all ${view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Visão Lista"
            >
              <List size={13} />
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
            const col  = filtered.filter(t => t.status === status)
            const cfg  = STATUS_CFG[status]
            const isOver = dragOver === status
            return (
              <div
                key={status}
                className={`flex flex-col gap-2 rounded-xl p-1 -m-1 transition-colors ${isOver ? 'bg-primary/8 ring-1 ring-primary/25' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(status) }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
                }}
                onDrop={e => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('taskId')
                  if (id) setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
                  setDragOver(null)
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-1 py-0.5">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
                    {cfg.icon}
                    <span>{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({col.length})</span>
                  </div>
                  <button
                    onClick={() => openCreate(status)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={`Nova tarefa em ${cfg.label}`}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2">
                  {col.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                  <button
                    onClick={() => openCreate(status)}
                    className="w-full py-2.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
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
                  <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-3 first:pl-5">
                    {h}
                  </th>
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
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-semibold">
                            {task.assigneeInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{task.assignee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                        <Clock size={11} />{fmtDate(task.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${pCfg.color} border-0 text-[10px] px-1.5 h-5`}>
                        {pCfg.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 h-5 rounded-full ${stCfg.bg} ${stCfg.color} border ${stCfg.border}`}>
                        {stCfg.icon}{stCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(task)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        title="Editar"
                      >
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
                    <button
                      onClick={() => openCreate()}
                      className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      + Criar nova tarefa
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Form panel ── */}
      {showForm && (
        <TaskFormPanel
          task={editTask}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
