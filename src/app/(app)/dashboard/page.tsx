import Link from 'next/link'
import {
  TrendingUp,
  Users,
  CheckSquare,
  MessageSquare,
  DollarSign,
  Clock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const stats = [
  { label: 'Clientes Ativos',     value: '–', icon: Users,         color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { label: 'Tarefas em Aberto',   value: '–', icon: CheckSquare,   color: 'text-sky-400',    bg: 'bg-sky-400/10'   },
  { label: 'Mensagens Não Lidas', value: '–', icon: MessageSquare, color: 'text-emerald-400',bg: 'bg-emerald-400/10'},
  { label: 'MRR',                 value: '–', icon: DollarSign,    color: 'text-amber-400',  bg: 'bg-amber-400/10' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
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
                <TrendingUp size={12} className="text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">sem dados ainda</span>
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
                <Link href="/tarefas" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  Ver todas <ArrowRight size={11} />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckSquare size={28} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa urgente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funil placeholder */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Funil de vendas</CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">últimos 30 dias</p>
          </CardHeader>
          <CardContent className="pt-1 pb-4">
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <DollarSign size={28} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground text-center">Conecte seu pipeline<br />para ver o funil</p>
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
            <Link href="/mensagens" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <MessageSquare size={28} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem recente</p>
            <Link href="/mensagens" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              Ir para mensagens <ArrowRight size={11} />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
