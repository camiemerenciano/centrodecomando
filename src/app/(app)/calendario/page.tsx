import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, ChevronLeft, ChevronRight, AtSign, Video, FileText, Calendar } from 'lucide-react'

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const hours = Array.from({ length: 10 }, (_, i) => i + 8) // 8h–17h

type EventType = 'post' | 'reel' | 'story' | 'meeting' | 'deadline'

interface CalEvent {
  id: number; title: string; client: string; type: EventType
  day: number; startH: number; endH: number; color: string
}

const events: CalEvent[] = [
  { id: 1, title: 'Post – Café Aurora',    client: 'Café Aurora', type: 'post',     day: 1, startH: 9,  endH: 10, color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
  { id: 2, title: 'Reel – Loja Bloom',     client: 'Loja Bloom',  type: 'reel',     day: 1, startH: 11, endH: 13, color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
  { id: 3, title: 'Call estratégia',       client: 'Studio Fit',  type: 'meeting',  day: 2, startH: 10, endH: 11, color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
  { id: 4, title: 'Story – promoção',      client: 'Loja Bloom',  type: 'story',    day: 2, startH: 14, endH: 15, color: 'bg-pink-500/20 border-pink-500/40 text-pink-300' },
  { id: 5, title: 'Relatório maio',        client: 'Studio Fit',  type: 'deadline', day: 3, startH: 9,  endH: 10, color: 'bg-red-500/20 border-red-500/40 text-red-300' },
  { id: 6, title: 'Feed planning junho',   client: 'Café Aurora', type: 'meeting',  day: 4, startH: 14, endH: 16, color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
  { id: 7, title: 'Reels semana',          client: 'Beleza Pura', type: 'reel',     day: 5, startH: 11, endH: 12, color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
  { id: 8, title: 'Posts programados',     client: 'Tech Solve',  type: 'post',     day: 6, startH: 10, endH: 11, color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
]

const typeIcon: Record<EventType, React.ReactNode> = {
  post:     <AtSign size={10} />,
  reel:     <Video size={10} />,
  story:    <AtSign size={10} />,
  meeting:  <Calendar size={10} />,
  deadline: <FileText size={10} />,
}

const upcomingEvents = [
  { title: 'Post – Café Aurora',  client: 'Café Aurora', time: 'Hoje, 09:00', type: 'post' as EventType },
  { title: 'Reel – Loja Bloom',   client: 'Loja Bloom',  time: 'Hoje, 11:00', type: 'reel' as EventType },
  { title: 'Call estratégia',     client: 'Studio Fit',  time: 'Amanhã, 10:00', type: 'meeting' as EventType },
  { title: 'Story – promoção',    client: 'Loja Bloom',  time: 'Amanhã, 14:00', type: 'story' as EventType },
  { title: 'Relatório maio',      client: 'Studio Fit',  time: '25/05',         type: 'deadline' as EventType },
]

const typeColor: Record<EventType, string> = {
  post:     'bg-violet-500/15 text-violet-400 border-0',
  reel:     'bg-sky-500/15 text-sky-400 border-0',
  story:    'bg-pink-500/15 text-pink-400 border-0',
  meeting:  'bg-amber-500/15 text-amber-400 border-0',
  deadline: 'bg-red-500/15 text-red-400 border-0',
}

export default function CalendarioPage() {
  return (
    <div className="flex gap-5 max-w-[1400px] h-[calc(100vh-8.5rem)]">
      {/* Main calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">Maio 2025</h2>
            <div className="flex gap-1">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
            <button className="h-7 px-3 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/20">
              Hoje
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['Semana', 'Mês', 'Agenda'] as const).map((v, i) => (
                <button
                  key={v}
                  className={`h-7 px-3 text-xs font-medium transition-colors ${
                    i === 0
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button size="sm" className="h-7 bg-primary hover:bg-primary/90 text-xs">
              <Plus size={13} /> Evento
            </Button>
          </div>
        </div>

        {/* Week grid */}
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
              {weekDays.map((day, dayIdx) => (
                <div key={day} className="border-r border-border last:border-r-0 flex flex-col">
                  {/* Day header */}
                  <div className={`h-10 border-b border-border flex flex-col items-center justify-center shrink-0 ${
                    dayIdx === 1 ? 'bg-primary/8' : ''
                  }`}>
                    <p className="text-[10px] text-muted-foreground">{day}</p>
                    <p className={`text-sm font-semibold ${dayIdx === 1 ? 'text-primary' : 'text-foreground'}`}>
                      {19 + dayIdx}
                    </p>
                  </div>

                  {/* Hour slots */}
                  <div className="relative flex-1">
                    {hours.map(h => (
                      <div key={h} className="h-16 border-b border-border/50" />
                    ))}

                    {/* Events */}
                    {events.filter(e => e.day === dayIdx).map(ev => (
                      <div
                        key={ev.id}
                        className={`absolute left-1 right-1 rounded-md border px-1.5 py-1 cursor-pointer hover:opacity-90 transition-opacity text-[10px] font-medium ${ev.color}`}
                        style={{
                          top: `${(ev.startH - 8) * 64}px`,
                          height: `${(ev.endH - ev.startH) * 64 - 4}px`,
                        }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          {typeIcon[ev.type]}
                          <span className="truncate">{ev.title}</span>
                        </div>
                        <p className="text-[9px] opacity-70 truncate">{ev.client}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {upcomingEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                  <p className="text-[10px] text-muted-foreground">{ev.client}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{ev.time}</span>
                    <Badge className={`text-[9px] px-1 h-3.5 ${typeColor[ev.type]}`}>
                      {ev.type}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Legenda</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {(Object.entries(typeColor) as [EventType, string][]).map(([type, cls]) => (
              <div key={type} className="flex items-center gap-2">
                <Badge className={`text-[10px] px-2 h-5 capitalize ${cls}`}>
                  <span className="mr-1">{typeIcon[type]}</span>{type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
