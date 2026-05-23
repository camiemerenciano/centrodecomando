import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, Mail, Shield, User, Crown, CheckSquare, Users } from 'lucide-react'

type Role = 'owner' | 'admin' | 'member'

interface Member {
  id: number; name: string; email: string; role: Role
  specialty: string; clients: number; tasks: number
  joined: string; status: 'online' | 'away' | 'offline'
  initials: string
}

const members: Member[] = [
  { id: 1, name: 'Maria Gomes',     email: 'maria@nexus.com',     role: 'owner',  specialty: 'Estratégia & Growth',  clients: 8,  tasks: 12, joined: 'Jan/24', status: 'online',  initials: 'MG' },
  { id: 2, name: 'Carlos Ferreira', email: 'carlos@nexus.com',    role: 'admin',  specialty: 'Social Media Manager', clients: 6,  tasks: 18, joined: 'Fev/24', status: 'online',  initials: 'CF' },
  { id: 3, name: 'Larissa Reis',    email: 'larissa@nexus.com',   role: 'member', specialty: 'Design & Criação',     clients: 5,  tasks: 14, joined: 'Mar/24', status: 'away',    initials: 'LR' },
  { id: 4, name: 'Pedro Alves',     email: 'pedro@nexus.com',     role: 'member', specialty: 'Tráfego Pago',        clients: 4,  tasks: 9,  joined: 'Abr/24', status: 'offline', initials: 'PA' },
  { id: 5, name: 'Bianca Torres',   email: 'bianca@nexus.com',    role: 'member', specialty: 'Copywriter',          clients: 3,  tasks: 11, joined: 'Mai/24', status: 'online',  initials: 'BT' },
]

const roleConfig: Record<Role, { label: string; cls: string; icon: React.ReactNode }> = {
  owner:  { label: 'Proprietário', cls: 'bg-amber-500/15 text-amber-400 border-0',  icon: <Crown size={10} /> },
  admin:  { label: 'Admin',        cls: 'bg-violet-500/15 text-violet-400 border-0', icon: <Shield size={10} /> },
  member: { label: 'Membro',       cls: 'bg-muted text-muted-foreground border-0',  icon: <User size={10} /> },
}

const statusConfig = {
  online:  { label: 'Online',  cls: 'bg-emerald-400' },
  away:    { label: 'Ausente', cls: 'bg-amber-400' },
  offline: { label: 'Offline', cls: 'bg-muted-foreground' },
}

export default function EquipePage() {
  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center justify-center">
              <Users size={18} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de membros</p>
              <p className="text-2xl font-bold text-foreground">5</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
              <CheckSquare size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tarefas em aberto</p>
              <p className="text-2xl font-bold text-foreground">64</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 flex items-center justify-center">
              <Users size={18} className="text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes atribuídos</p>
              <p className="text-2xl font-bold text-foreground">24</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar membros..."
            className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
        <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-xs">
          <Plus size={14} /> Convidar membro
        </Button>
      </div>

      {/* Members grid */}
      <div className="grid grid-cols-1 gap-4">
        {members.map(member => (
          <Card key={member.id} className="bg-card border-border hover:border-primary/25 transition-all group">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusConfig[member.status].cls}`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{member.name}</p>
                    <Badge className={`text-[10px] px-1.5 h-4 flex items-center gap-1 ${roleConfig[member.role].cls}`}>
                      {roleConfig[member.role].icon}
                      {roleConfig[member.role].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{member.specialty}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Mail size={10} className="text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-8 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{member.clients}</p>
                    <p className="text-[10px] text-muted-foreground">Clientes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{member.tasks}</p>
                    <p className="text-[10px] text-muted-foreground">Tarefas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-foreground">{member.joined}</p>
                    <p className="text-[10px] text-muted-foreground">Entrou em</p>
                  </div>
                </div>

                {/* Status & actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[member.status].cls}`} />
                    <span className="text-[10px] text-muted-foreground">{statusConfig[member.status].label}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button className="h-7 px-2.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      Editar
                    </button>
                    {member.role !== 'owner' && (
                      <button className="h-7 px-2.5 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Invite card */}
        <Card className="bg-card border-border border-dashed hover:border-primary/40 cursor-pointer transition-all">
          <CardContent className="p-5 flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-dashed border-border flex items-center justify-center">
              <Plus size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Convidar novo membro</p>
              <p className="text-xs text-muted-foreground/60">Envie um convite por e-mail</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
