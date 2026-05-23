'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, ThumbsUp, BarChart2, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Logo } from '@/components/logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { href: '/portal',             label: 'Início',     icon: LayoutDashboard, exact: true },
  { href: '/portal/tarefas',     label: 'Tarefas',    icon: CheckSquare },
  { href: '/portal/aprovacoes',  label: 'Aprovações', icon: ThumbsUp },
  { href: '/portal/relatorios',  label: 'Relatórios', icon: BarChart2 },
]

export function PortalSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    ?? user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="flex flex-col w-56 min-h-screen border-r border-sidebar-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <Logo size={28} className="text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground leading-none truncate">Método ÓRBITA</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Portal do Cliente</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground transition-colors'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-all text-left cursor-pointer bg-transparent border-0">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {(user?.user_metadata?.full_name as string | undefined) ?? 'Cliente'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <ChevronDown size={13} className="text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-44 mb-1">
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
