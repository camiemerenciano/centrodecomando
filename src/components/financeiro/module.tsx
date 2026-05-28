'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Plus, Trash2, DollarSign, Check, X, Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lancamento {
  id: string
  tipo: 'receita' | 'custo'
  descricao: string
  valor: number
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PT_MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
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

function KpiCard({
  label, value, sub, colorClass, iconClass, icon: Icon, trend,
}: {
  label: string
  value: string
  sub?: string
  colorClass: string
  iconClass: string
  icon: React.ElementType
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
            <p className={`text-[11px] ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            }`}>{sub}</p>
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
                <div style={{ height: recH }} title={`Receita: ${fmtBRL(d.receita)}`}
                  className="w-3.5 bg-emerald-500/50 hover:bg-emerald-500/80 rounded-t-sm transition-colors cursor-default" />
                <div style={{ height: cusH }} title={`Custos: ${fmtBRL(d.custos)}`}
                  className="w-3.5 bg-red-500/40 hover:bg-red-500/70 rounded-t-sm transition-colors cursor-default" />
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
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/50 inline-block" /> Receita
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-2 h-2 rounded-sm bg-red-500/40 inline-block" /> Custos
        </span>
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
  onUpdate: (id: string, descricao: string, valor: number) => void
}) {
  const [editingVal, setEditingVal]   = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [rawVal, setRawVal]           = useState('')
  const [rawDesc, setRawDesc]         = useState('')
  const valRef  = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  function startVal() {
    setRawVal(item.valor === 0 ? '' : String(item.valor).replace('.', ','))
    setEditingVal(true)
  }
  function commitVal() {
    onUpdate(item.id, item.descricao, parseBRL(rawVal))
    setEditingVal(false)
  }
  function startDesc() {
    setRawDesc(item.descricao)
    setEditingDesc(true)
  }
  function commitDesc() {
    if (rawDesc.trim()) onUpdate(item.id, rawDesc.trim(), item.valor)
    setEditingDesc(false)
  }

  useEffect(() => { if (editingVal)  valRef.current?.select()  }, [editingVal])
  useEffect(() => { if (editingDesc) descRef.current?.select()  }, [editingDesc])

  const dot = tipo === 'receita' ? 'bg-emerald-400/60' : 'bg-red-400/60'

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border/40 hover:bg-muted/25 transition-colors group">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />

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

      {/* Delete */}
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

function AddRow({
  tipo, onAdd,
}: {
  tipo: 'receita' | 'custo'
  onAdd: (descricao: string, valor: number) => void
}) {
  const [desc, setDesc] = useState('')
  const [val,  setVal]  = useState('')
  const [open, setOpen] = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

  function submit() {
    const v = parseBRL(val)
    if (!desc.trim() || v <= 0) return
    onAdd(desc.trim(), v)
    setDesc('')
    setVal('')
    descRef.current?.focus()
  }

  if (!open) {
    return (
      <div className="px-5 py-3">
        <button
          onClick={() => { setOpen(true); setTimeout(() => descRef.current?.focus(), 50) }}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors
            ${tipo === 'receita'
              ? 'text-emerald-400/70 hover:text-emerald-400'
              : 'text-red-400/70 hover:text-red-400'
            }`}
        >
          <Plus size={13} />
          {tipo === 'receita' ? 'Adicionar receita' : 'Adicionar custo'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-5 py-3 border-t border-dashed border-border bg-muted/20">
      <input
        ref={descRef}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        placeholder="Descrição..."
        className="flex-1 h-7 rounded-lg bg-muted border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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
      <button
        onClick={submit}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0
          ${tipo === 'receita' ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'}`}
      >
        <Check size={13} />
      </button>
      <button
        onClick={() => setOpen(false)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  tipo, items, onAdd, onDelete, onUpdate,
}: {
  tipo: 'receita' | 'custo'
  items: Lancamento[]
  onAdd: (descricao: string, valor: number) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, descricao: string, valor: number) => void
}) {
  const total     = items.reduce((s, i) => s + i.valor, 0)
  const isReceita = tipo === 'receita'

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3 border-b border-border ${isReceita ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isReceita ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${isReceita ? 'text-emerald-400' : 'text-red-400'}`}>
            {isReceita ? 'Receitas' : 'Custos'}
          </p>
          <span className="text-[10px] text-muted-foreground">({items.length} {items.length === 1 ? 'lançamento' : 'lançamentos'})</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${isReceita ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtBRL(total)}
        </span>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-muted-foreground">Nenhum lançamento neste mês.</p>
        </div>
      )}

      {/* Items */}
      {items.map(item => (
        <LancamentoRow
          key={item.id}
          item={item}
          tipo={tipo}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}

      {/* Add row */}
      <AddRow tipo={tipo} onAdd={onAdd} />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FinanceiroModule() {
  const [periodo, setPeriodo] = useState(currentPeriodo)
  const [receitas, setReceitas] = useState<Lancamento[]>([])
  const [custos,   setCustos]   = useState<Lancamento[]>([])
  const [trendData, setTrendData] = useState<{ periodo: string; receita: number; custos: number }[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  // ── Load ──
  const loadTrend = useCallback(async (uid: string, p: string) => {
    const periods = Array.from({ length: 6 }, (_, i) => addMonths(p, -5 + i))
    const { data } = await supabase
      .from('financeiro_lancamentos')
      .select('periodo, tipo, valor')
      .eq('user_id', uid)
      .in('periodo', periods)
    setTrendData(periods.map(per => {
      const rows    = (data ?? []).filter(r => r.periodo === per)
      const receita = rows.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0)
      const custos  = rows.filter(r => r.tipo === 'custo').reduce((s, r) => s + Number(r.valor), 0)
      return { periodo: per, receita, custos }
    }))
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('financeiro_lancamentos')
      .select('*')
      .eq('user_id', user.id)
      .eq('periodo', periodo)
      .order('created_at', { ascending: true })

    const rows: Lancamento[] = (data ?? []).map(r => ({
      id: r.id, tipo: r.tipo, descricao: r.descricao,
      valor: Number(r.valor), createdAt: r.created_at,
    }))
    setReceitas(rows.filter(r => r.tipo === 'receita'))
    setCustos(rows.filter(r => r.tipo === 'custo'))

    loadTrend(user.id, periodo)
  }, [periodo, supabase, loadTrend])

  useEffect(() => { load() }, [load])

  // ── CRUD ──
  async function handleAdd(tipo: 'receita' | 'custo', descricao: string, valor: number) {
    if (!userId) return
    const { data } = await supabase
      .from('financeiro_lancamentos')
      .insert({ user_id: userId, periodo, tipo, descricao, valor })
      .select().single()
    if (!data) return
    const item: Lancamento = { id: data.id, tipo, descricao, valor, createdAt: data.created_at }
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

  async function handleUpdate(id: string, descricao: string, valor: number) {
    await supabase.from('financeiro_lancamentos').update({ descricao, valor }).eq('id', id)
    const upd = (item: Lancamento) => item.id === id ? { ...item, descricao, valor } : item
    setReceitas(prev => prev.map(upd))
    setCustos(prev => prev.map(upd))
    if (userId) loadTrend(userId, periodo)
  }

  // ── Totals ──
  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0)
  const totalCustos   = custos.reduce((s, r) => s + r.valor, 0)
  const lucro         = totalReceitas - totalCustos
  const margem        = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Overview Financeiro</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Adicione receitas e custos individualmente para acompanhar o resultado</p>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <button
            onClick={() => setPeriodo(p => addMonths(p, -1))}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-foreground w-40 text-center">
            {periodoLabel(periodo)}
          </span>
          <button
            onClick={() => setPeriodo(p => addMonths(p, 1))}
            disabled={periodo >= currentPeriodo()}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Receitas"
          value={fmtBRL(totalReceitas)}
          colorClass="bg-emerald-500/15"
          iconClass="text-emerald-400"
          icon={TrendingUp}
        />
        <KpiCard
          label="Total de Custos"
          value={fmtBRL(totalCustos)}
          colorClass="bg-red-500/15"
          iconClass="text-red-400"
          icon={TrendingDown}
        />
        <KpiCard
          label="Lucro Líquido"
          value={fmtBRL(lucro)}
          sub={lucro >= 0 ? 'Positivo' : 'Negativo'}
          trend={lucro >= 0 ? 'up' : 'down'}
          colorClass={lucro >= 0 ? 'bg-primary/15' : 'bg-red-500/15'}
          iconClass={lucro >= 0 ? 'text-primary' : 'text-red-400'}
          icon={DollarSign}
        />
        <KpiCard
          label="Margem"
          value={`${margem.toFixed(1)}%`}
          sub={margem >= 20 ? 'Saudável' : margem < 0 ? 'Negativa' : 'Atenção'}
          trend={margem >= 20 ? 'up' : margem < 0 ? 'down' : null}
          colorClass="bg-violet-500/15"
          iconClass="text-violet-400"
          icon={TrendingUp}
        />
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: sections */}
        <div className="lg:col-span-2 space-y-4">
          <Section
            tipo="receita"
            items={receitas}
            onAdd={(d, v) => handleAdd('receita', d, v)}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
          <Section
            tipo="custo"
            items={custos}
            onAdd={(d, v) => handleAdd('custo', d, v)}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />

          {/* Resultado */}
          {(receitas.length > 0 || custos.length > 0) && (
            <div className={`rounded-xl border px-5 py-4 flex items-center justify-between
              ${lucro >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${lucro >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  Resultado do período
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {receitas.length + custos.length} lançamentos · Margem {margem.toFixed(1)}%
                </p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${lucro >= 0 ? 'text-primary' : 'text-red-400'}`}>
                {lucro >= 0 ? '+' : ''}{fmtBRL(lucro)}
              </p>
            </div>
          )}
        </div>

        {/* Right: trend + distribution */}
        <div className="space-y-4">
          <TrendChart data={trendData} />

          {/* Cost distribution */}
          {totalCustos > 0 && custos.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Maiores custos</p>
              <div className="space-y-2.5">
                {[...custos]
                  .sort((a, b) => b.valor - a.valor)
                  .slice(0, 6)
                  .map(item => {
                    const pct = totalCustos > 0 ? (item.valor / totalCustos) * 100 : 0
                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-foreground/70 truncate">{item.descricao}</span>
                          <span className="text-[11px] font-semibold text-foreground tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500/50 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Revenue breakdown */}
          {totalReceitas > 0 && receitas.length > 1 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Maiores receitas</p>
              <div className="space-y-2.5">
                {[...receitas]
                  .sort((a, b) => b.valor - a.valor)
                  .slice(0, 6)
                  .map(item => {
                    const pct = totalReceitas > 0 ? (item.valor / totalReceitas) * 100 : 0
                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-foreground/70 truncate">{item.descricao}</span>
                          <span className="text-[11px] font-semibold text-foreground tabular-nums shrink-0">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500/50 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
