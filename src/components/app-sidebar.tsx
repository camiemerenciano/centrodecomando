'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  FolderKanban,
  Calendar,
  Users,
  UsersRound,
  Settings,
  ChevronDown,
  Bell,
  LogOut,
  Info,
  Layers,
  Plug,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/mensagens',  label: 'Mensagens',    icon: MessageSquare,   badge: '4' },
  { href: '/tarefas',    label: 'Tarefas',      icon: CheckSquare,     badge: '12' },
  { href: '/pipeline',   label: 'Pipeline',     icon: FolderKanban },
  { href: '/calendario', label: 'Calendário',   icon: Calendar },
  { href: '/clientes',   label: 'Clientes',     icon: Users },
  { href: '/equipe',     label: 'Equipe',       icon: UsersRound },
]

const assistanteItems = [
  { href: '/assistente/informacoes',      label: 'Informações',       icon: Info },
  { href: '/assistente/areas-de-atuacao', label: 'Áreas de Atuação',  icon: Layers },
  { href: '/assistente/conexoes',         label: 'Conexões',          icon: Plug },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r border-sidebar-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-purple shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground leading-none truncate">
            Centro de Comando
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            Nexus Agency
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 pb-2 pt-1 font-medium">
          Principal
        </p>
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                ${active
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }
              `}
            >
              <Icon
                size={16}
                className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground transition-colors'}
              />
              <span className="flex-1 truncate">{label}</span>
              {badge && (
                <Badge
                  className={`text-[10px] px-1.5 py-0 h-4 font-semibold shrink-0 ${
                    active
                      ? 'bg-primary/25 text-primary border-0'
                      : 'bg-muted text-muted-foreground border-0'
                  }`}
                >
                  {badge}
                </Badge>
              )}
            </Link>
          )
        })}

        <div className="pt-4 pb-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 pb-2 font-medium">
            Assistente
          </p>
          {assistanteItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                  ${active
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                `}
              >
                <Icon
                  size={16}
                  className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground transition-colors'}
                />
                <span className="flex-1 truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-3 space-y-0.5 border-t border-sidebar-border pt-3">
        <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all group">
          <Bell size={16} className="text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
          <span className="flex-1 text-left">Notificações</span>
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </button>

        <Link
          href="/configuracoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all group"
        >
          <Settings size={16} className="text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
          <span>Configurações</span>
        </Link>
      </div>

      {/* User */}
      <div className="px-3 pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-all text-left cursor-pointer bg-transparent border-0">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {(user?.user_metadata?.full_name as string | undefined) ?? 'Usuário'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-1">
            <DropdownMenuItem onClick={() => window.location.href = '/perfil'}>
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/configuracoes'}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut size={14} className="mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
