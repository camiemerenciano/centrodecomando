import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckSquare,
  MessageSquare,
  DollarSign,
  Clock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const stats = [
  {
    label: 'Clientes Ativos',
    value: '24',
    change: '+2',
    trend: 'up',
    icon: Users,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
  {
    label: 'Tarefas em Aberto',
    value: '47',
    change: '-8',
    trend: 'down',
    icon: CheckSquare,
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
  },
  {
    label: 'Mensagens Não Lidas',
    value: '13',
    change: '+5',
    trend: 'up',
    icon: MessageSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    label: 'MRR',
    value: 'R$ 38.400',
    change: '+12%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
]

const urgentTasks = [
  { id: 1, title: 'Aprovar copy campanha Dia dos Namorados', client: 'Loja Bloom', priority: 'urgent', due: 'Hoje' },
  { id: 2, title: 'Relatório mensal – Maio', client: 'Studio Fit', priority: 'high', due: 'Amanhã' },
  { id: 3, title: 'Agendar stories semana', client: 'Café Aurora', priority: 'high', due: '24/05' },
  { id: 4, title: 'Revisão de identidade visual', client: 'Tech Solve', priority: 'medium', due: '25/05' },
]

const recentMessages = [
  { id: 1, name: 'Ana Beatriz', company: 'Loja Bloom', message: 'Aprovei os layouts! Pode agendar.', time: '5min', unread: true },
  { id: 2, name: 'Carlos M.', company: 'Studio Fit', message: 'Preciso do relatório até 5ª feira.', time: '28min', unread: true },
  { id: 3, name: 'Fernanda L.', company: 'Café Aurora', message: 'Ótimo trabalho no feed!', time: '1h', unread: false },
  { id: 4, name: 'Diego R.', company: 'Tech Solve', message: 'Podemos agendar uma call?', time: '3h', unread: true },
]

const pipeline = [
  { stage: 'Prospecção', count: 8, value: 'R$ 42k', color: 'bg-violet-500' },
  { stage: 'Proposta',   count: 4, value: 'R$ 28k', color: 'bg-sky-500' },
  { stage: 'Negociação', count: 3, value: 'R$ 19k', color: 'bg-amber-500' },
  { stage: 'Fechamento', count: 2, value: 'R$ 14k', color: 'bg-emerald-500' },
]

const priorityClass: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-0',
  high:   'bg-orange-500/15 text-orange-400 border-0',
  medium: 'bg-sky-500/15 text-sky-400 border-0',
  low:    'bg-muted text-muted-foreground border-0',
}

const priorityLabel: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, change, trend, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={17} className={color} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                {trend === 'up' ? (
                  <TrendingUp size={12} className="text-emerald-400" />
                ) : (
                  <TrendingDown size={12} className="text-red-400" />
                )}
                <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {change}
                </span>
                <span className="text-xs text-muted-foreground">esta semana</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Urgent tasks */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="text-primary" />
                  Tarefas Urgentes
                </CardTitle>
                <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  Ver todas <ArrowRight size={11} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {urgentTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                >
                  <div className="w-4 h-4 rounded border border-border group-hover:border-primary/50 transition-colors shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.client}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[10px] px-1.5 h-4 ${priorityClass[task.priority]}`}>
                      {priorityLabel[task.priority]}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={11} />{task.due}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline overview */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pipeline</CardTitle>
              <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver <ArrowRight size={11} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {pipeline.map(({ stage, count, value, color }) => (
              <div key={stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{count} deals</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${(count / 8) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Total pipeline</span>
                <span className="font-bold text-foreground">R$ 103k</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent messages */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare size={15} className="text-primary" />
              Mensagens Recentes
            </CardTitle>
            <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight size={11} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {recentMessages.map(msg => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  msg.unread ? 'bg-primary/8 border border-primary/15' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
                      {msg.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground truncate">{msg.name}</p>
                      {msg.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{msg.company}</p>
                    <p className="text-xs text-foreground/80 mt-1 line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
