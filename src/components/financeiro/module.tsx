'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Plus, Trash2, Pencil, Check, X, DollarSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Config ───────────────────────────────────────────────────────────────────

const PREDEFINED = [
  { key: 'receita',           label: 'Receita Bruta',          tipo: 'receita' as const },
  { key: 'folha_pagamento',   label: 'Folha de Pagamento',     tipo: 'custo'   as const },
  { key: 'custo_operacional', label: 'Custo Operacional',      tipo: 'custo'   as const },
  { key: 'trafego',           label: 'Tráfego / Mídia Paga',   tipo: 'custo'   as const },
  { key: 'ferramentas',       label: 'Ferramentas e Software',  tipo: 'custo'   as const },
  { key: 'outros',            label: 'Outros',                  tipo: 'custo'   as const },
]
const PREDEFINED_KEYS = new Set(PREDEFINED.map(c => c.key))

const PT_MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const PT_MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── EditableValue ────────────────────────────────────────────────────────────

function EditableValue({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw]         = useState('')
  const ref                   = useRef<HTMLInputElement>(null)

  function start() {
    setRaw(value === 0 ? '' : String(value).replace('.', ','))
    setEditing(true)
  }

  function commit() {
    const v = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0
    onSave(v)
    setEditing(false)
  }

  useEffect(() => { if (editing) ref.current?.select() }, [editing])

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <span className="text-[10px] text-muted-foreground">R$</span>
        <input
          ref={ref}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-36 h-7 rounded-lg bg-muted border border-primary/40 px-2 text-sm text-right text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
          autoFocus
        />
      </div>
    )
  }

  return (
    <button
      onClick={start}
      className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group tabular-nums"
    >
      {fmtBRL(value)}
      <Pencil size={10} className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon: Icon, trend,
}: {
  label: string
  value: string
  sub?: string
  color: string
  icon: React.ElementType
  trend?: 'up' | 'down' | null
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        {sub && (
          <div className="flex items-center gap-1 mt-1.5">
            {trend === 'up' && <TrendingUp size={11} className="text-emerald-400" />}
            {trend === 'down' && <TrendingDown size={11} className="text-red-400" />}
            <p className={`text-[11px] ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            }`}>{sub}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TrendChart ───────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: { periodo: string; receita: number; custos: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.receita, d.custos]), 1)
  const H   = 72

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tendência — 6 meses</p>

      <div className="flex items-end gap-3">
        {data.map((d, i) => {
          const recH  = Math.max(3, Math.round((d.receita / max) * H))
          const cusH  = Math.max(3, Math.round((d.custos  / max) * H))
          const lucro = d.receita - d.custos
          const positive = lucro >= 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="flex items-end gap-0.5" style={{ height: H }}>
                <div
                  style={{ height: recH }}
                  title={`Receita: ${fmtBRL(d.receita)}`}
                  className="w-3.5 bg-emerald-500/50 hover:bg-emerald-500/80 rounded-t-sm transition-colors cursor-default"
                />
                <div
                  style={{ height: cusH }}
                  title={`Custos: ${fmtBRL(d.custos)}`}
                  className="w-3.5 bg-red-500/40 hover:bg-red-500/70 rounded-t-sm transition-colors cursor-default"
                />
              </div>
              <p className="text-[9px] text-muted-foreground">{periodoShort(d.periodo)}</p>
              <p className={`text-[8px] font-bold tabular-nums ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {positive ? '+' : ''}{fmtBRL(lucro)}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FinanceiroModule() {
  const [periodo, setPeriodo]       = useState(currentPeriodo)
  const [valores, setValores]       = useState<Record<string, number>>({})
  const [customCats, setCustomCats] = useState<{ key: string; label: string }[]>([])
  const [trendData, setTrendData]   = useState<{ periodo: string; receita: number; custos: number }[]>([])
  const [addingCat, setAddingCat]   = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [userId, setUserId]         = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // All unique custom categories ever used
    const { data: allRows } = await supabase
      .from('financeiro')
      .select('categoria, valor')
      .eq('user_id', user.id)

    const allCats = [...new Set((allRows ?? []).map(r => r.categoria as string))]
    const custom = allCats
      .filter(c => !PREDEFINED_KEYS.has(c))
      .map(c => ({ key: c, label: c }))
    setCustomCats(custom)

    // Current period values
    const { data: periodoRows } = await supabase
      .from('financeiro')
      .select('categoria, valor')
      .eq('user_id', user.id)
      .eq('periodo', periodo)

    const vals: Record<string, number> = {}
    for (const r of periodoRows ?? []) vals[r.categoria] = Number(r.valor)
    setValores(vals)

    // Trend: last 6 months
    const periods = Array.from({ length: 6 }, (_, i) => addMonths(periodo, -5 + i))
    const { data: trendRows } = await supabase
      .from('financeiro')
      .select('periodo, categoria, valor')
      .eq('user_id', user.id)
      .in('periodo', periods)

    const trend = periods.map(p => {
      const rows   = (trendRows ?? []).filter(r => r.periodo === p)
      const receita = rows.filter(r => r.categoria === 'receita').reduce((s, r) => s + Number(r.valor), 0)
      const custos  = rows.filter(r => r.categoria !== 'receita').reduce((s, r) => s + Number(r.valor), 0)
      return { periodo: p, receita, custos }
    })
    setTrendData(trend)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  useEffect(() => { load() }, [load])

  async function saveValor(categoria: string, valor: number) {
    if (!userId) return
    setValores(prev => ({ ...prev, [categoria]: valor }))
    await supabase.from('financeiro').upsert(
      { user_id: userId, periodo, categoria, valor },
      { onConflict: 'user_id,periodo,categoria' }
    )
    // Refresh trend silently
    const periods = Array.from({ length: 6 }, (_, i) => addMonths(periodo, -5 + i))
    const { data: trendRows } = await supabase
      .from('financeiro').select('periodo, categoria, valor')
      .eq('user_id', userId).in('periodo', periods)
    setTrendData(periods.map(p => {
      const rows    = (trendRows ?? []).filter(r => r.periodo === p)
      const receita = rows.filter(r => r.categoria === 'receita').reduce((s, r) => s + Number(r.valor), 0)
      const custos  = rows.filter(r => r.categoria !== 'receita').reduce((s, r) => s + Number(r.valor), 0)
      return { periodo: p, receita, custos }
    }))
  }

  async function addCustomCategory() {
    const label = newCatName.trim()
    if (!label || !userId) return
    const key = label.toLowerCase().replace(/\s+/g, '_')
    if (PREDEFINED_KEYS.has(key) || customCats.some(c => c.key === key)) return
    // Save a 0-value record so the category persists across period switches
    await supabase.from('financeiro').upsert(
      { user_id: userId, periodo, categoria: key, valor: 0 },
      { onConflict: 'user_id,periodo,categoria' }
    )
    setCustomCats(prev => [...prev, { key, label }])
    setValores(prev => ({ ...prev, [key]: 0 }))
    setNewCatName('')
    setAddingCat(false)
  }

  async function deleteCustomCategory(key: string) {
    if (!userId) return
    await supabase.from('financeiro').delete().eq('user_id', userId).eq('categoria', key)
    setCustomCats(prev => prev.filter(c => c.key !== key))
    setValores(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  // ── Computed ──
  const receita    = valores['receita'] ?? 0
  const custoItems = [
    ...PREDEFINED.filter(c => c.tipo === 'custo'),
    ...customCats,
  ]
  const totalCustos = custoItems.reduce((s, c) => s + (valores[c.key] ?? 0), 0)
  const lucro       = receita - totalCustos
  const margem      = receita > 0 ? (lucro / receita) * 100 : 0

  const rowCls = 'flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group'
  const labelCls = 'text-sm text-foreground/80'

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Overview Financeiro</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhe receita, custos e lucro da sua operação</p>
        </div>

        {/* Month navigator */}
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
          label="Receita"
          value={fmtBRL(receita)}
          color="bg-emerald-500/15 text-emerald-400"
          icon={DollarSign}
        />
        <KpiCard
          label="Total de Custos"
          value={fmtBRL(totalCustos)}
          color="bg-red-500/15 text-red-400"
          icon={TrendingDown}
        />
        <KpiCard
          label="Lucro Líquido"
          value={fmtBRL(lucro)}
          sub={lucro >= 0 ? 'Positivo' : 'Negativo'}
          trend={lucro >= 0 ? 'up' : 'down'}
          color={lucro >= 0 ? 'bg-primary/15 text-primary' : 'bg-red-500/15 text-red-400'}
          icon={TrendingUp}
        />
        <KpiCard
          label="Margem"
          value={`${margem.toFixed(1)}%`}
          sub={margem >= 0 ? 'Sobre a receita' : 'Abaixo do zero'}
          trend={margem >= 20 ? 'up' : margem < 0 ? 'down' : null}
          color="bg-violet-500/15 text-violet-400"
          icon={TrendingUp}
        />
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: editable table */}
        <div className="lg:col-span-2 space-y-3">

          {/* Receita */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-emerald-500/5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Receita</p>
            </div>
            <div className={rowCls}>
              <span className={labelCls}>Receita Bruta</span>
              <EditableValue value={valores['receita'] ?? 0} onSave={v => saveValor('receita', v)} />
            </div>
          </div>

          {/* Custos */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-red-500/5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Custos</p>
            </div>

            {/* Predefined cost categories */}
            {PREDEFINED.filter(c => c.tipo === 'custo').map(cat => (
              <div key={cat.key} className={rowCls + ' border-b border-border/50 last:border-0'}>
                <span className={labelCls}>{cat.label}</span>
                <EditableValue value={valores[cat.key] ?? 0} onSave={v => saveValor(cat.key, v)} />
              </div>
            ))}

            {/* Custom categories */}
            {customCats.map(cat => (
              <div key={cat.key} className={rowCls + ' border-b border-border/50'}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={labelCls + ' truncate'}>{cat.label}</span>
                  <button
                    onClick={() => deleteCustomCategory(cat.key)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all shrink-0"
                    title="Remover categoria"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <EditableValue value={valores[cat.key] ?? 0} onSave={v => saveValor(cat.key, v)} />
              </div>
            ))}

            {/* Add custom category */}
            <div className="px-5 py-3 border-t border-dashed border-border">
              {addingCat ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCustomCategory(); if (e.key === 'Escape') { setAddingCat(false); setNewCatName('') } }}
                    placeholder="Nome da categoria..."
                    className="flex-1 h-7 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  <button onClick={addCustomCategory} className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors">
                    <Check size={13} />
                  </button>
                  <button onClick={() => { setAddingCat(false); setNewCatName('') }} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCat(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={12} /> Adicionar categoria
                </button>
              )}
            </div>

            {/* Total custos */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Total de Custos</span>
              <span className="text-sm font-bold text-red-400 tabular-nums">{fmtBRL(totalCustos)}</span>
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className={`px-5 py-3 flex items-center justify-between ${lucro >= 0 ? 'bg-primary/5' : 'bg-red-500/5'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${lucro >= 0 ? 'bg-primary' : 'bg-red-400'}`} />
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${lucro >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  Resultado do Período
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold tabular-nums ${lucro >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {fmtBRL(lucro)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Margem: {margem.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: trend chart */}
        <div className="space-y-3">
          <TrendChart data={trendData} />

          {/* Breakdown visual */}
          {totalCustos > 0 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Distribuição dos Custos</p>
              <div className="space-y-2.5">
                {[...PREDEFINED.filter(c => c.tipo === 'custo'), ...customCats].map(cat => {
                  const v   = valores[cat.key] ?? 0
                  const pct = totalCustos > 0 ? (v / totalCustos) * 100 : 0
                  if (v === 0) return null
                  return (
                    <div key={cat.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-foreground/70 truncate">{cat.label}</span>
                        <span className="text-[11px] font-semibold text-foreground tabular-nums shrink-0 ml-2">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all duration-500"
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
