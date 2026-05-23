import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, Users, TrendingUp, DollarSign, BarChart3, AtSign, Mail, Phone } from 'lucide-react'

type Status = 'active' | 'paused' | 'churned'

interface Client {
  id: number; name: string; company: string; email: string; phone: string
  status: Status; plan: string; mrr: string; since: string
  instagram: string; assignee: string; tasks: number
}

const clients: Client[] = [
  { id: 1, name: 'Ana Beatriz',   company: 'Loja Bloom',   email: 'ana@lojabloom.com',   phone: '(11) 99234-5678', status: 'active',  plan: 'Premium',  mrr: 'R$ 4.500', since: 'Jan/24', instagram: '@lojabloom',   assignee: 'MG', tasks: 5 },
  { id: 2, name: 'Carlos M.',     company: 'Studio Fit',   email: 'carlos@studiofit.com',phone: '(11) 98765-4321', status: 'active',  plan: 'Pro',      mrr: 'R$ 2.800', since: 'Mar/24', instagram: '@studiofit',   assignee: 'CF', tasks: 3 },
  { id: 3, name: 'Fernanda L.',   company: 'Café Aurora',  email: 'fe@cafeaurora.com',   phone: '(21) 97654-3210', status: 'active',  plan: 'Premium',  mrr: 'R$ 3.200', since: 'Fev/24', instagram: '@cafeaurora',  assignee: 'LR', tasks: 7 },
  { id: 4, name: 'Diego R.',      company: 'Tech Solve',   email: 'diego@techsolve.com', phone: '(31) 96543-2109', status: 'active',  plan: 'Starter',  mrr: 'R$ 1.400', since: 'Abr/24', instagram: '@techsolve',   assignee: 'MG', tasks: 2 },
  { id: 5, name: 'Juliana S.',    company: 'Beleza Pura',  email: 'ju@belezapura.com',   phone: '(41) 95432-1098', status: 'paused',  plan: 'Pro',      mrr: 'R$ 0',     since: 'Mai/24', instagram: '@belezapura',  assignee: 'CF', tasks: 0 },
  { id: 6, name: 'Roberto M.',    company: 'Construção RJ',email: 'rob@constrrj.com',    phone: '(21) 94321-0987', status: 'churned', plan: 'Starter',  mrr: 'R$ 0',     since: 'Jun/23', instagram: '@constrrj',    assignee: 'LR', tasks: 0 },
]

const statusConfig: Record<Status, { label: string; cls: string }> = {
  active:  { label: 'Ativo',    cls: 'bg-emerald-500/15 text-emerald-400 border-0' },
  paused:  { label: 'Pausado',  cls: 'bg-amber-500/15 text-amber-400 border-0' },
  churned: { label: 'Churned',  cls: 'bg-red-500/15 text-red-400 border-0' },
}

const planColor: Record<string, string> = {
  Premium: 'bg-orange-500/15 text-orange-400 border-0',
  Pro:     'bg-sky-500/15 text-sky-400 border-0',
  Starter: 'bg-muted text-muted-foreground border-0',
}

const stats = [
  { label: 'Total Clientes',    value: '24',         icon: Users,      color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { label: 'Ativos',            value: '20',         icon: TrendingUp, color: 'text-emerald-400',bg: 'bg-emerald-400/10' },
  { label: 'MRR Total',         value: 'R$ 38.400',  icon: DollarSign, color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  { label: 'Ticket Médio',      value: 'R$ 1.920',   icon: BarChart3,  color: 'text-sky-400',    bg: 'bg-sky-400/10' },
]

export default function ClientesPage() {
  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative max-w-xs w-full">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar clientes..."
              className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          {(['Todos', 'Ativos', 'Pausados', 'Churned'] as const).map((f, i) => (
            <button
              key={f}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                i === 0
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-xs">
          <Plus size={14} /> Novo cliente
        </Button>
      </div>

      {/* Client table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Cliente', 'Status', 'Plano', 'MRR', 'Instagram', 'Responsável', 'Tarefas', 'Desde', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr
                    key={client.id}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                            {client.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${statusConfig[client.status].cls}`}>
                        {statusConfig[client.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${planColor[client.plan] ?? 'bg-muted text-muted-foreground border-0'}`}>
                        {client.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-foreground">{client.mrr}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <AtSign size={11} /> {client.instagram}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                          {client.assignee}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${client.tasks > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {client.tasks > 0 ? `${client.tasks} abertas` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{client.since}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Mail size={13} />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Phone size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
