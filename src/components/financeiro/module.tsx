'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Plus, Trash2, DollarSign, Check, X, Pencil, LayoutGrid, List,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lancamento {
  id: string
  tipo: 'receita' | 'custo'
  descricao: string
  valor: number
  categoria: string
  createdAt: string
}

// ─── Category config ──────────────────────────────────────────────────────────

type CatCfg = { label: string; color: string; bg: string; dot: string }

const CUSTO_CATS: Record<string, CatCfg> = {
  operacional:     { label: 'Operacional',       color: 'text-sky-400',     bg: 'bg-sky-400/12',     dot: 'bg-sky-400'     },
  folha_pagamento: { label: 'Folha de Pagamento', color: 'text-violet-400',  bg: 'bg-violet-400/12',  dot: 'bg-violet-400'  },
  trafego:         { label: 'Tráfego Pago',       color: 'text-orange-400',  bg: 'bg-orange-400/12',  dot: 'bg-orange-400'  },
  ferramentas:     { label: 'Ferramentas / SaaS', color: 'text-teal-400',    bg: 'bg-teal-400/12',    dot: 'bg-teal-400'    },
  impostos:        { label: 'Impostos',           color: 'text-red-400',     bg: 'bg-red-400/12',     dot: 'bg-red-400'     },
  infraestrutura:  { label: 'Infraestrutura',     color: 'text-slate-400',   bg: 'bg-slate-400/12',   dot: 'bg-slate-400'   },
  marketing:       { label: 'Marketing',          color: 'text-pink-400',    bg: 'bg-pink-400/12',    dot: 'bg-pink-400'    },
  outros:          { label: 'Outros',             color: 'text-muted-foreground', bg: 'bg-muted/60', dot: 'bg-muted-foreground' },
}

const RECEITA_CATS: Record<string, CatCfg> = {
  retainer:    { label: 'Retainer / Mensalidade', color: 'text-emerald-400', bg: 'bg-emerald-400/12', dot: 'bg-emerald-400' },
  projeto:     { label: 'Projeto Pontual',        color: 'text-green-400',   bg: 'bg-green-400/12',   dot: 'bg-green-400'   },
  consultoria: { label: 'Consultoria',            color: 'text-teal-400',    bg: 'bg-teal-400/12',    dot: 'bg-teal-400'    },
  comissao:    { label: 'Comissão',               color: 'text-cyan-400',    bg: 'bg-cyan-400/12',    dot: 'bg-cyan-400'    },
  servicos:    { label: 'Serviços Avulsos',       color: 'text-lime-400',    bg: 'bg-lime-400/12',    dot: 'bg-lime-400'    },
  outros:      { label: 'Outros',                 color: 'text-muted-foreground', bg: 'bg-muted/60', dot: 'bg-muted-foreground' },
}

function getCatCfg(tipo: 'receita' | 'custo', cat: string): CatCfg {
  const map = tipo === 'custo' ? CUSTO_CATS : RECEITA_CATS
  return map[cat] ?? map['outros']
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PT_MONTHS       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const PT_MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function currentPeriodo() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function addMonths(periodo: string, n: number) {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(y, m - 1 + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function periodoLabel(p: string) {
  const [y, m] = p.split('-')
  return `${PT_MONTHS[parseInt(m) - 1]} ${y}`
}
function periodoShort(p: string) {
  const [, m] = p.split('-')
  return PT_MONTHS_SHORT[parseInt(m) - 1]
}
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, colorClass, iconClass, icon: Icon, trend }: {
  label: string; value: string; sub?: string
  colorClass: string; iconClass: string; icon: React.ElementType
  trend?: 'up' | 'down' | null
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon size={14} className={iconClass} />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        {sub && (
          <div className="flex items-center gap-1 mt-1.5">
            {trend === 'up'   && <TrendingUp   size={11} className="text-emerald-400" />}
            {trend === 'down' && <TrendingDown  size={11} className="text-red-400"    />}
            <p className={`text-[11px] ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'}`}>{sub}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: { periodo: string; receita: number; custos: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.receita, d.custos]), 1)
  const H   = 72
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tendência — 6 meses</p>
      <div className="flex items-end gap-3">
        {data.map((d, i) => {
          const recH    = Math.max(3, Math.round((d.receita / max) * H))
          const cusH    = Math.max(3, Math.round((d.custos  / max) * H))
          const lucro   = d.receita - d.custos
          const positivo = lucro >= 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="flex items-end gap-0.5" style={{ height: H }}>
                <div style={{ height: recH }} title={`Receita: ${fmtBRL(d.receita)}`} className="w-3.5 bg-emerald-500/50 hover:bg-emerald-500/80 rounded-t-sm transition-colors cursor-default" />
                <div style={{ height: cusH }} title={`Custos: ${fmtBRL(d.custos)}`}   className="w-3.5 bg-red-500/40 hover:bg-red-500/70 rounded-t-sm transition-colors cursor-default" />
              </div>
              <p className="text-[9px] text-muted-foreground">{periodoShort(d.periodo)}</p>
              <p className={`text-[8px] font-bold tabular-nums ${positivo ? 'text-emerald-400' : 'text-red-400'}`}>
                {positivo ? '+' : ''}{fmtBRL(lucro)}
              </p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 pt-1 border-t border-border">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-emerald-500/50 inline-block" /> Receita</span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-red-500/40 inline-block" /> Custos</span>
      </div>
    </div>
  )
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ tipo, items }: { tipo: 'receita' | 'custo'; items: Lancamento[] }) {
  const catMap = tipo === 'custo' ? CUSTO_CATS : RECEITA_CATS
  const total  = items.reduce((s, i) => s + i.valor, 0)
  if (total === 0) return null

  // Group by category
  const grouped: Record<string, { total: number; count: number; cfg: CatCfg }> = {}
  items.forEach(item => {
    const cat = item.categoria || 'outros'
    if (!grouped[cat]) grouped[cat] = { total: 0, count: 0, cfg: catMap[cat] ?? catMap['outros'] }
    grouped[cat].total += item.valor
    grouped[cat].count += 1
  })

  const sorted = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total)
  const isReceita = tipo === 'receita'

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {isReceita ? 'Receitas por categoria' : 'Custos por categoria'}
      </p>
      <div className="space-y-3">
        {sorted.map(([cat, { total: catTotal, count, cfg }]) => {
          const pct = (catTotal / total) * 100
          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className="text-xs text-foreground/80 truncate">{cfg.label}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">({count})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                  <span className="text-xs font-semibold text-foreground tabular-nums">{fmtBRL(catTotal)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cfg.dot}`}
                  style={{ width: `${pct}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── LancamentoRow ────────────────────────────────────────────────────────────

function LancamentoRow({
  item, tipo, onDelete, onUpdate,
}: {
  item: Lancamento
  tipo: 'receita' | 'custo'
  onDelete: (id: string) => void
  onUpdate: (id: string, descricao: string, valor: number, categoria: string) => void
}) {
  const [editingVal,  setEditingVal]  = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [rawVal,  setRawVal]  = useState('')
  const [rawDesc, setRawDesc] = useState('')
  const valRef  = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  function startVal()   { setRawVal(item.valor === 0 ? '' : String(item.valor).replace('.', ',')); setEditingVal(true) }
  function commitVal()  { onUpdate(item.id, item.descricao, parseBRL(rawVal), item.categoria); setEditingVal(false) }
  function startDesc()  { setRawDesc(item.descricao); setEditingDesc(true) }
  function commitDesc() { if (rawDesc.trim()) onUpdate(item.id, rawDesc.trim(), item.valor, item.categoria); setEditingDesc(false) }

  useEffect(() => { if (editingVal)  valRef.current?.select() },  [editingVal])
  useEffect(() => { if (editingDesc) descRef.current?.select() }, [editingDesc])

  const cfg = getCatCfg(tipo, item.categoria)

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/40 hover:bg-muted/25 transition-colors group">
      {/* Category badge */}
      <select
        value={item.categoria || 'outros'}
        onChange={e => onUpdate(item.id, item.descricao, item.valor, e.target.value)}
        className={`shrink-0 text-[10px] font-medium rounded-md px-1.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 ${cfg.color} ${cfg.bg}`}
        onClick={e => e.stopPropagation()}
        title="Categoria"
      >
        {Object.entries(tipo === 'custo' ? CUSTO_CATS : RECEITA_CATS).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>

      {/* Descrição */}
      {editingDesc ? (
        <input
          ref={descRef}
          value={rawDesc}
          onChange={e => setRawDesc(e.target.value)}
          onBlur={commitDesc}
          onKeyDown={e => { if (e.key === 'Enter') commitDesc(); if (e.key === 'Escape') setEditingDesc(false) }}
          className="flex-1 h-6 rounded bg-muted border border-primary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          autoFocus
        />
      ) : (
        <button
          onClick={startDesc}
          className="flex-1 text-left text-sm text-foreground/80 hover:text-foreground truncate group/desc flex items-center gap-1"
        >
          {item.descricao}
          <Pencil size={9} className="text-muted-foreground/30 opacity-0 group-hover/desc:opacity-100 shrink-0" />
        </button>
      )}

      {/* Valor */}
      {editingVal ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">R$</span>
          <input
            ref={valRef}
            value={rawVal}
            onChange={e => setRawVal(e.target.value)}
            onBlur={commitVal}
            onKeyDown={e => { if (e.key === 'Enter') commitVal(); if (e.key === 'Escape') setEditingVal(false) }}
            className="w-28 h-6 rounded bg-muted border border-primary/40 px-2 text-sm text-right text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={startVal}
          className="text-sm font-semibold tabular-nums text-foreground hover:text-primary transition-colors shrink-0 group/val flex items-center gap-1"
        >
          {fmtBRL(item.valor)}
          <Pencil size={9} className="text-muted-foreground/30 opacity-0 group-hover/val:opacity-100" />
        </button>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ─── AddRow ───────────────────────────────────────────────────────────────────

function AddRow({ tipo, onAdd }: { tipo: 'receita' | 'custo'; onAdd: (descricao: string, valor: number, categoria: string) => void }) {
  const defaultCat = tipo === 'custo' ? 'operacional' : 'retainer'
  const [desc, setDesc]   = useState('')
  const [val,  setVal]    = useState('')
  const [cat,  setCat]    = useState(defaultCat)
  const [open, setOpen]   = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

  function submit() {
    const v = parseBRL(val)
    if (!desc.trim() || v <= 0) return
    onAdd(desc.trim(), v, cat)
    setDesc(''); setVal('')
    setCat(defaultCat)
    descRef.current?.focus()
  }

  if (!open) {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => { setOpen(true); setTimeout(() => descRef.current?.focus(), 50) }}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${tipo === 'receita' ? 'text-emerald-400/70 hover:text-emerald-400' : 'text-red-400/70 hover:text-red-400'}`}
        >
          <Plus size={13} />
          {tipo === 'receita' ? 'Adicionar receita' : 'Adicionar custo'}
        </button>
      </div>
    )
  }

  const catMap = tipo === 'custo' ? CUSTO_CATS : RECEITA_CATS

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-dashed border-border bg-muted/20 flex-wrap">
      <select
        value={cat}
        onChange={e => setCat(e.target.value)}
        className="h-7 rounded-lg bg-muted border border-border px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer shrink-0"
      >
        {Object.entries(catMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <input
        ref={descRef}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        placeholder="Descrição..."
        className="flex-1 min-w-[120px] h-7 rounded-lg bg-muted border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
      />
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground">R$</span>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
          placeholder="0,00"
          className="w-24 h-7 rounded-lg bg-muted border border-border px-2 text-xs text-right text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all tabular-nums"
        />
      </div>
      <button onClick={submit} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 ${tipo === 'receita' ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'}`}>
        <Check size={13} />
      </button>
      <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ tipo, items, onAdd, onDelete, onUpdate }: {
  tipo: 'receita' | 'custo'
  items: Lancamento[]
  onAdd: (descricao: string, valor: number, categoria: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, descricao: string, valor: number, categoria: string) => void
}) {
  const total     = items.reduce((s, i) => s + i.valor, 0)
  const isReceita = tipo === 'receita'

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-border ${isReceita ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isReceita ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${isReceita ? 'text-emerald-400' : 'text-red-400'}`}>
            {isReceita ? 'Receitas' : 'Custos'}
          </p>
          <span className="text-[10px] text-muted-foreground">({items.length} {items.length === 1 ? 'lançamento' : 'lançamentos'})</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${isReceita ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(total)}</span>
      </div>

      {items.length === 0 && (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-muted-foreground">Nenhum lançamento neste mês.</p>
        </div>
      )}

      {items.map(item => (
        <LancamentoRow key={item.id} item={item} tipo={tipo} onDelete={onDelete} onUpdate={onUpdate} />
      ))}

      <AddRow tipo={tipo} onAdd={onAdd} />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FinanceiroModule() {
  const [periodo, setPeriodo]     = useState(currentPeriodo)
  const [receitas, setReceitas]   = useState<Lancamento[]>([])
  const [custos,   setCustos]     = useState<Lancamento[]>([])
  const [trendData, setTrendData] = useState<{ periodo: string; receita: number; custos: number }[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [rightTab, setRightTab]   = useState<'tendencia' | 'categorias'>('categorias')
  const supabase = createClient()

  const loadTrend = useCallback(async (uid: string, p: string) => {
    const periods = Array.from({ length: 6 }, (_, i) => addMonths(p, -5 + i))
    const { data } = await supabase.from('financeiro_lancamentos').select('periodo, tipo, valor').eq('user_id', uid).in('periodo', periods)
    setTrendData(periods.map(per => {
      const rows = (data ?? []).filter(r => r.periodo === per)
      return {
        periodo: per,
        receita: rows.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0),
        custos:  rows.filter(r => r.tipo === 'custo').reduce((s, r) => s + Number(r.valor), 0),
      }
    }))
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('financeiro_lancamentos').select('*')
      .eq('user_id', user.id).eq('periodo', periodo)
      .order('created_at', { ascending: true })

    const rows: Lancamento[] = (data ?? []).map(r => ({
      id: r.id, tipo: r.tipo, descricao: r.descricao,
      valor: Number(r.valor), categoria: r.categoria ?? 'outros',
      createdAt: r.created_at,
    }))
    setReceitas(rows.filter(r => r.tipo === 'receita'))
    setCustos(rows.filter(r => r.tipo === 'custo'))
    loadTrend(user.id, periodo)
  }, [periodo, supabase, loadTrend])

  useEffect(() => { load() }, [load])

  async function handleAdd(tipo: 'receita' | 'custo', descricao: string, valor: number, categoria: string) {
    if (!userId) return
    const { data } = await supabase.from('financeiro_lancamentos')
      .insert({ user_id: userId, periodo, tipo, descricao, valor, categoria })
      .select().single()
    if (!data) return
    const item: Lancamento = { id: data.id, tipo, descricao, valor, categoria, createdAt: data.created_at }
    if (tipo === 'receita') setReceitas(prev => [...prev, item])
    else                    setCustos(prev => [...prev, item])
    loadTrend(userId, periodo)
  }

  async function handleDelete(id: string) {
    await supabase.from('financeiro_lancamentos').delete().eq('id', id)
    setReceitas(prev => prev.filter(r => r.id !== id))
    setCustos(prev => prev.filter(r => r.id !== id))
    if (userId) loadTrend(userId, periodo)
  }

  async function handleUpdate(id: string, descricao: string, valor: number, categoria: string) {
    await supabase.from('financeiro_lancamentos').update({ descricao, valor, categoria }).eq('id', id)
    const upd = (item: Lancamento) => item.id === id ? { ...item, descricao, valor, categoria } : item
    setReceitas(prev => prev.map(upd))
    setCustos(prev => prev.map(upd))
    if (userId) loadTrend(userId, periodo)
  }

  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0)
  const totalCustos   = custos.reduce((s, r) => s + r.valor, 0)
  const lucro         = totalReceitas - totalCustos
  const margem        = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0
  const mrr           = receitas.filter(r => r.categoria === 'retainer').reduce((s, r) => s + r.valor, 0)

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Overview Financeiro</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Adicione receitas e custos com categorias para acompanhar o resultado</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <button onClick={() => setPeriodo(p => addMonths(p, -1))} className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-foreground w-40 text-center">{periodoLabel(periodo)}</span>
          <button onClick={() => setPeriodo(p => addMonths(p, 1))} disabled={periodo >= currentPeriodo()} className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="MRR" value={fmtBRL(mrr)} sub="Receita recorrente" colorClass="bg-sky-500/15" iconClass="text-sky-400" icon={TrendingUp} />
        <KpiCard label="Receita do Mês" value={fmtBRL(totalReceitas)} colorClass="bg-emerald-500/15" iconClass="text-emerald-400" icon={TrendingUp} />
        <KpiCard label="Custo do Mês" value={fmtBRL(totalCustos)} colorClass="bg-red-500/15" iconClass="text-red-400" icon={TrendingDown} />
        <KpiCard label="Lucro Líquido" value={fmtBRL(lucro)} sub={lucro >= 0 ? 'Positivo' : 'Negativo'} trend={lucro >= 0 ? 'up' : 'down'} colorClass={lucro >= 0 ? 'bg-primary/15' : 'bg-red-500/15'} iconClass={lucro >= 0 ? 'text-primary' : 'text-red-400'} icon={DollarSign} />
        <KpiCard label="Margem" value={`${margem.toFixed(1)}%`} sub={margem >= 20 ? 'Saudável' : margem < 0 ? 'Negativa' : 'Atenção'} trend={margem >= 20 ? 'up' : margem < 0 ? 'down' : null} colorClass="bg-violet-500/15" iconClass="text-violet-400" icon={TrendingUp} />
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: lancamentos */}
        <div className="lg:col-span-2 space-y-4">
          <Section tipo="receita" items={receitas} onAdd={(d, v, c) => handleAdd('receita', d, v, c)} onDelete={handleDelete} onUpdate={handleUpdate} />
          <Section tipo="custo"   items={custos}   onAdd={(d, v, c) => handleAdd('custo',   d, v, c)} onDelete={handleDelete} onUpdate={handleUpdate} />

          {(receitas.length > 0 || custos.length > 0) && (
            <div className={`rounded-xl border px-5 py-4 flex items-center justify-between ${lucro >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${lucro >= 0 ? 'text-primary' : 'text-red-400'}`}>Resultado do período</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{receitas.length + custos.length} lançamentos · Margem {margem.toFixed(1)}%</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${lucro >= 0 ? 'text-primary' : 'text-red-400'}`}>
                {lucro >= 0 ? '+' : ''}{fmtBRL(lucro)}
              </p>
            </div>
          )}
        </div>

        {/* Right: trend + category breakdown */}
        <div className="space-y-4">

          {/* Tab toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setRightTab('categorias')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded text-xs font-medium transition-all ${rightTab === 'categorias' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid size={12} /> Categorias
            </button>
            <button
              onClick={() => setRightTab('tendencia')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded text-xs font-medium transition-all ${rightTab === 'tendencia' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={12} /> Tendência
            </button>
          </div>

          {rightTab === 'tendencia' && <TrendChart data={trendData} />}

          {rightTab === 'categorias' && (
            <>
              <CategoryBreakdown tipo="custo"   items={custos}   />
              <CategoryBreakdown tipo="receita" items={receitas} />
              {custos.length === 0 && receitas.length === 0 && (
                <div className="bg-card border border-border rounded-xl p-6 text-center">
                  <p className="text-xs text-muted-foreground">Adicione lançamentos para ver o breakdown por categoria.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
