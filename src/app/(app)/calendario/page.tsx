'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Plus, ChevronLeft, ChevronRight,
  AtSign, Video, FileText, Calendar,
  RefreshCw, Loader2, AlertCircle, X, Trash2, ExternalLink,
} from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

type EventType = 'post' | 'reel' | 'story' | 'meeting' | 'deadline' | 'google'

interface CalEvent {
  id: string | number
  title: string
  client: string
  type: EventType
  day: number       // 0=Sun … 6=Sat
  startH: number    // e.g. 9.5 = 09:30
  endH: number
  color: string
}

// ── static helpers ─────────────────────────────────────────────────────────────

const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const hours = Array.from({ length: 10 }, (_, i) => i + 8) // 08h–17h

const typeIcon: Record<EventType, React.ReactNode> = {
  post:     <AtSign size={10} />,
  reel:     <Video size={10} />,
  story:    <AtSign size={10} />,
  meeting:  <Calendar size={10} />,
  deadline: <FileText size={10} />,
  google:   <Calendar size={10} />,
}

const typeColor: Record<EventType, string> = {
  post:     'bg-orange-500/15 text-orange-400 border-0',
  reel:     'bg-sky-500/15 text-sky-400 border-0',
  story:    'bg-pink-500/15 text-pink-400 border-0',
  meeting:  'bg-amber-500/15 text-amber-400 border-0',
  deadline: 'bg-red-500/15 text-red-400 border-0',
  google:   'bg-sky-500/15 text-sky-400 border-0',
}

const eventBgColor: Record<EventType, string> = {
  post:     'bg-orange-500/20 border-orange-500/40 text-orange-300',
  reel:     'bg-sky-500/20 border-sky-500/40 text-sky-300',
  story:    'bg-pink-500/20 border-pink-500/40 text-pink-300',
  meeting:  'bg-amber-500/20 border-amber-500/40 text-amber-300',
  deadline: 'bg-red-500/20 border-red-500/40 text-red-300',
  google:   'bg-sky-500/15 border-sky-500/30 text-sky-200',
}

const typeLabels: Record<EventType, string> = {
  post: 'Post', reel: 'Reel', story: 'Story',
  meeting: 'Reunião', deadline: 'Prazo', google: 'Google',
}

const staticEvents: CalEvent[] = []

// ── date utils ────────────────────────────────────────────────────────────────

function getWeekDays(offset: number): Date[] {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + offset * 7)
  sunday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

const ptMonths = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function formatWeekHeader(days: Date[]): string {
  const first = days[0], last = days[6]
  if (first.getMonth() === last.getMonth()) {
    return `${ptMonths[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${ptMonths[first.getMonth()]} – ${ptMonths[last.getMonth()]} ${last.getFullYear()}`
}

// ── Google event mapper ───────────────────────────────────────────────────────

interface GoogleEvent {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
}

function mapGoogleEvent(gev: GoogleEvent, days: Date[]): CalEvent | null {
  const startStr = gev.start.dateTime ?? gev.start.date
  const endStr   = gev.end.dateTime   ?? gev.end.date
  if (!startStr) return null

  const start = new Date(startStr)
  const end   = new Date(endStr ?? startStr)

  const dayIdx = days.findIndex(d =>
    d.getFullYear() === start.getFullYear() &&
    d.getMonth()    === start.getMonth() &&
    d.getDate()     === start.getDate()
  )
  if (dayIdx === -1) return null

  // All-day events: show at 09:00–10:00
  const isAllDay = !gev.start.dateTime
  const startH = isAllDay ? 9 : start.getHours() + start.getMinutes() / 60
  const endH   = isAllDay ? 10 : end.getHours() + end.getMinutes() / 60

  return {
    id: `g-${gev.id}`,
    title: gev.summary ?? '(sem título)',
    client: 'Google Agenda',
    type: 'google',
    day: dayIdx,
    startH: Math.max(8, Math.min(17, startH)),
    endH:   Math.max(startH + 0.5, Math.min(18, endH)),
    color: 'bg-sky-500/15 border-sky-500/30 text-sky-200',
  }
}

// ── overlap layout ────────────────────────────────────────────────────────────

function assignColumns(events: CalEvent[]): { ev: CalEvent; col: number; totalCols: number }[] {
  if (events.length === 0) return []

  const sorted = [...events].sort((a, b) => a.startH - b.startH)
  const colEnds: number[] = []
  const assignments: { ev: CalEvent; col: number }[] = []

  for (const ev of sorted) {
    let col = colEnds.findIndex(end => end <= ev.startH)
    if (col === -1) { col = colEnds.length; colEnds.push(ev.endH) }
    else colEnds[col] = ev.endH
    assignments.push({ ev, col })
  }

  return assignments.map(a => {
    const overlapping = assignments.filter(b =>
      b.ev.startH < a.ev.endH && b.ev.endH > a.ev.startH
    )
    return { ev: a.ev, col: a.col, totalCols: Math.max(...overlapping.map(b => b.col)) + 1 }
  })
}

// ── component ─────────────────────────────────────────────────────────────────

type EditForm = {
  title: string
  client: string
  type: EventType
  startH: string // "HH:MM"
  endH: string
}

function toTimeStr(h: number) {
  const hh = Math.floor(h)
  const mm = Math.round((h % 1) * 60)
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}

function fromTimeStr(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return h + (m ?? 0) / 60
}

export default function CalendarioPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView]             = useState<'semana' | 'agenda'>('semana')
  const [gcalToken, setGcalToken]   = useState<string | null>(null)
  const [gcalEmail, setGcalEmail]   = useState('')
  const [googleEvents, setGoogleEvents] = useState<CalEvent[]>([])
  const [loadingGcal, setLoadingGcal]   = useState(false)
  const [gcalError, setGcalError]       = useState('')
  const [localEvents, setLocalEvents]   = useState<CalEvent[]>(staticEvents)
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [editForm, setEditForm]         = useState<EditForm | null>(null)

  const weekDays = getWeekDays(weekOffset)
  const today    = new Date()
  const todayIdx = weekDays.findIndex(d =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth() &&
    d.getDate()     === today.getDate()
  )

  // Load Google token from Supabase on mount — auto-refresh if needed
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('integracoes')
        .select('gcal_access_token, gcal_refresh_token, gcal_email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data?.gcal_email) return

      let token = data.gcal_access_token as string | null

      if (data.gcal_refresh_token) {
        try {
          const res = await fetch('/api/auth/google/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: data.gcal_refresh_token }),
          })
          const refreshed = await res.json()
          if (refreshed.access_token) {
            token = refreshed.access_token as string
            await supabase.from('integracoes').upsert(
              { user_id: user.id, gcal_access_token: token },
              { onConflict: 'user_id' }
            )
          }
        } catch { /* use stored token */ }
      }

      if (token) {
        setGcalToken(token)
        setGcalEmail(data.gcal_email as string)
      }
    })
  }, [])

  const fetchGoogleEvents = useCallback(async (token: string, days: Date[]) => {
    if (!token) return
    setLoadingGcal(true)
    setGcalError('')
    try {
      const timeMin = days[0].toISOString()
      const timeMax = new Date(days[6].getTime() + 86400000).toISOString()
      const res = await fetch(
        `/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const data = await res.json()

      if (!res.ok) {
        // Surface the real Google error message
        const googleMsg: string =
          data?.error?.error?.message ??
          data?.error?.message ??
          (typeof data?.error === 'string' ? data.error : null) ??
          `HTTP ${res.status}`

        if (res.status === 401) {
          setGcalToken(null)
          setGcalError('Token expirado. Reconecte em Assistente → Conexões.')
        } else if (res.status === 403) {
          setGcalError(`Acesso negado pelo Google: ${googleMsg}. Verifique se a API do Google Calendar está ativada no Cloud Console.`)
        } else {
          setGcalError(`Erro Google Calendar: ${googleMsg}`)
        }
        return
      }

      const mapped = (data.items ?? [])
        .map((ev: GoogleEvent) => mapGoogleEvent(ev, days))
        .filter(Boolean) as CalEvent[]
      setGoogleEvents(mapped)
    } catch (err) {
      setGcalError(`Erro de rede: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingGcal(false)
    }
  }, [])

  // Fetch when token or week changes
  useEffect(() => {
    if (gcalToken) fetchGoogleEvents(gcalToken, weekDays)
    else setGoogleEvents([])
  }, [gcalToken, weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  const allEvents = [...localEvents, ...googleEvents]

  function openEdit(ev: CalEvent) {
    if (ev.type === 'google') return // Google events are read-only
    setEditingEvent(ev)
    setEditForm({
      title:  ev.title,
      client: ev.client,
      type:   ev.type,
      startH: toTimeStr(ev.startH),
      endH:   toTimeStr(ev.endH),
    })
  }

  function saveEdit() {
    if (!editingEvent || !editForm) return
    setLocalEvents(prev => prev.map(e =>
      e.id === editingEvent.id
        ? { ...e,
            title:  editForm.title,
            client: editForm.client,
            type:   editForm.type,
            startH: fromTimeStr(editForm.startH),
            endH:   fromTimeStr(editForm.endH),
            color:  typeColor[editForm.type]
              .replace('bg-','').split(' ')[0]
              .replace(/\/15|\/20/,'') + ' ' + eventBgColor[editForm.type],
          }
        : e
    ))
    setEditingEvent(null)
    setEditForm(null)
  }

  function deleteEvent() {
    if (!editingEvent) return
    setLocalEvents(prev => prev.filter(e => e.id !== editingEvent.id))
    setEditingEvent(null)
    setEditForm(null)
  }

  return (
    <div className="flex gap-5 max-w-[1400px] h-[calc(100vh-8.5rem)]">
      {/* Main calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">{formatWeekHeader(weekDays)}</h2>
            <div className="flex gap-1">
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setWeekOffset(o => o - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setWeekOffset(o => o + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <button
              className="h-7 px-3 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/20"
              onClick={() => setWeekOffset(0)}
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center gap-2">
            {gcalToken && (
              <div className="flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-2.5 h-7">
                {loadingGcal
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Calendar size={11} />
                }
                <span className="hidden sm:inline">{gcalEmail || 'Google Agenda'}</span>
                <button onClick={() => gcalToken && fetchGoogleEvents(gcalToken, weekDays)}>
                  <RefreshCw size={10} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity" />
                </button>
              </div>
            )}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['semana', 'agenda'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`h-7 px-3 text-xs font-medium capitalize transition-colors ${
                    view === v ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {v === 'semana' ? 'Semana' : 'Agenda'}
                </button>
              ))}
            </div>
            <Button size="sm" className="h-7 bg-primary hover:bg-primary/90 text-xs">
              <Plus size={13} /> Evento
            </Button>
          </div>
        </div>

        {/* Google error banner */}
        {gcalError && (
          <div className="flex items-center gap-2 mb-3 rounded-lg bg-red-500/8 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            <AlertCircle size={13} className="shrink-0" />
            {gcalError}
          </div>
        )}

        {/* ── Agenda view ── */}
        {view === 'agenda' && (
          <Card className="bg-card border-border flex-1 overflow-auto">
            <CardContent className="p-0">
              {weekDays.map((date, dayIdx) => {
                const dayEvents = allEvents
                  .filter(e => e.day === dayIdx)
                  .sort((a, b) => a.startH - b.startH)
                const isToday = dayIdx === todayIdx
                return (
                  <div key={dayIdx} className="border-b border-border last:border-b-0">
                    <div className={`flex items-center gap-3 px-4 py-2 border-b border-border/50 ${isToday ? 'bg-primary/5' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isToday ? 'bg-primary text-white' : 'text-muted-foreground'}`}>
                        {date.getDate()}
                      </div>
                      <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {weekDayLabels[date.getDay()]}{isToday ? ' — Hoje' : ''}
                      </span>
                    </div>
                    {dayEvents.length === 0 ? (
                      <p className="px-14 py-3 text-xs text-muted-foreground/50 italic">Sem eventos</p>
                    ) : (
                      <div className="py-1">
                        {dayEvents.map(ev => (
                          <div key={ev.id} onClick={() => openEdit(ev)} className="flex items-center gap-4 px-4 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors group">
                            <div className="w-10 text-right shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {String(Math.floor(ev.startH)).padStart(2,'0')}:{String(Math.round((ev.startH % 1) * 60)).padStart(2,'0')}
                              </span>
                            </div>
                            <div className={`w-1 self-stretch rounded-full shrink-0 ${ev.color.split(' ')[0].replace('/20','/60').replace('/15','/60')}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{ev.title}</p>
                              <p className="text-[10px] text-muted-foreground">{ev.client}</p>
                            </div>
                            <Badge className={`text-[9px] px-1.5 h-4 shrink-0 ${typeColor[ev.type]}`}>
                              {ev.type === 'google' ? 'Google' : ev.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Week grid ── */}
        {view === 'semana' && (
        <Card className="bg-card border-border flex-1 overflow-auto">
          <div className="flex h-full">
            {/* Time column */}
            <div className="w-14 shrink-0 border-r border-border pt-10">
              {hours.map(h => (
                <div key={h} className="h-16 px-2 flex items-start pt-1">
                  <span className="text-[10px] text-muted-foreground">{h}h</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((date, dayIdx) => {
                const isToday = dayIdx === todayIdx
                return (
                  <div key={dayIdx} className="border-r border-border last:border-r-0 flex flex-col">
                    {/* Day header */}
                    <div className={`h-10 border-b border-border flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-primary/8' : ''}`}>
                      <p className="text-[10px] text-muted-foreground">{weekDayLabels[date.getDay()]}</p>
                      <p className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {date.getDate()}
                      </p>
                    </div>

                    {/* Hour slots */}
                    <div className="relative flex-1">
                      {hours.map(h => (
                        <div key={h} className="h-16 border-b border-border/50" />
                      ))}

                      {/* Events — side by side when overlapping */}
                      {assignColumns(allEvents.filter(e => e.day === dayIdx)).map(({ ev, col, totalCols }) => {
                        const w = 100 / totalCols
                        return (
                          <div
                            key={ev.id}
                            onClick={() => openEdit(ev)}
                            className={`absolute rounded-md border px-1.5 py-1 cursor-pointer hover:brightness-110 transition-all text-[10px] font-medium overflow-hidden ${ev.color} ${ev.type !== 'google' ? 'hover:ring-1 hover:ring-white/20' : ''}`}
                            style={{
                              top:    `${(ev.startH - 8) * 64}px`,
                              height: `${Math.max(20, (ev.endH - ev.startH) * 64 - 4)}px`,
                              left:   `calc(${col * w}% + 2px)`,
                              width:  `calc(${w}% - ${totalCols > 1 ? 3 : 4}px)`,
                            }}
                          >
                            <div className="flex items-start gap-1 mb-0.5">
                              <span className="shrink-0 mt-px">{typeIcon[ev.type]}</span>
                              <span className="break-words leading-tight">{ev.title}</span>
                            </div>
                            <p className="text-[9px] opacity-70 break-words leading-tight">{ev.client}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        {/* Google connect banner if not connected */}
        {!gcalToken && (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">Google Agenda</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Conecte sua conta para ver os eventos reais do Google aqui.
              </p>
              <a
                href="/assistente/conexoes"
                className="text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Conectar em Conexões →
              </a>
            </CardContent>
          </Card>
        )}

        {/* Upcoming events */}
        <Card className="bg-card border-border flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-sm font-semibold">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 overflow-y-auto">
            {allEvents
              .slice()
              .sort((a, b) => a.day * 100 + a.startH - (b.day * 100 + b.startH))
              .slice(0, 8)
              .map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ev.type === 'google' ? 'bg-sky-400' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-[10px] text-muted-foreground">{ev.client}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {weekDayLabels[weekDays[ev.day]?.getDay() ?? ev.day]}, {String(Math.floor(ev.startH)).padStart(2,'0')}h
                      </span>
                      <Badge className={`text-[9px] px-1 h-3.5 ${typeColor[ev.type]}`}>
                        {ev.type === 'google' ? 'Google' : ev.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-card border-border shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Legenda</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {(Object.entries(typeColor) as [EventType, string][]).map(([type, cls]) => (
              <div key={type} className="flex items-center gap-2">
                <Badge className={`text-[10px] px-2 h-5 capitalize ${cls}`}>
                  <span className="mr-1">{typeIcon[type]}</span>
                  {type === 'google' ? 'Google Agenda' : type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* ── Edit modal ── */}
      {editingEvent && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) { setEditingEvent(null); setEditForm(null) } }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className={`px-5 py-4 flex items-center justify-between border-b border-border ${eventBgColor[editingEvent.type]} bg-opacity-30`}>
              <div className="flex items-center gap-2">
                <span>{typeIcon[editingEvent.type]}</span>
                <p className="text-sm font-semibold text-foreground">Editar evento</p>
              </div>
              <button
                onClick={() => { setEditingEvent(null); setEditForm(null) }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">Título</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => f && ({ ...f, title: e.target.value }))}
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">Cliente</label>
                <input
                  value={editForm.client}
                  onChange={e => setEditForm(f => f && ({ ...f, client: e.target.value }))}
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">Tipo</label>
                <select
                  value={editForm.type}
                  onChange={e => setEditForm(f => f && ({ ...f, type: e.target.value as EventType }))}
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                >
                  {(Object.keys(typeLabels) as EventType[]).filter(t => t !== 'google').map(t => (
                    <option key={t} value={t}>{typeLabels[t]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">Início</label>
                  <input
                    type="time"
                    value={editForm.startH}
                    onChange={e => setEditForm(f => f && ({ ...f, startH: e.target.value }))}
                    className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">Fim</label>
                  <input
                    type="time"
                    value={editForm.endH}
                    onChange={e => setEditForm(f => f && ({ ...f, endH: e.target.value }))}
                    className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary/90 flex-1"
                onClick={saveEdit}
                disabled={!editForm.title.trim()}
              >
                Salvar alterações
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                onClick={deleteEvent}
              >
                <Trash2 size={13} />
              </Button>
              {editingEvent.type === 'google' && (
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors ml-auto"
                >
                  <ExternalLink size={12} /> Abrir no Google
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
