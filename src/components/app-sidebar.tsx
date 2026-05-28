'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  CheckSquare,
  FolderKanban,
  Calendar,
  Users,
  UsersRound,
  Settings,
  ChevronDown,
  Bell,
  LogOut,
  MessagesSquare,
  FolderOpen,
  ShieldCheck,
  MessageSquareDot,
  X,
  CheckCheck,
  TrendingUp,
  Command,
  Files,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Logo } from '@/components/logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string; roleRequired?: string }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Visão',
    items: [
      { href: '/centro-de-comando', label: 'Centro de Comando', icon: Command },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { href: '/pipeline', label: 'Pipeline', icon: FolderKanban },
      { href: '/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/projetos',   label: 'Projetos',   icon: FolderOpen },
      { href: '/tarefas',    label: 'Tarefas',    icon: CheckSquare },
      { href: '/calendario', label: 'Calendário', icon: Calendar },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { href: '/chat', label: 'Chat Interno', icon: MessagesSquare },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/financeiro',  label: 'Financeiro',  icon: TrendingUp },
      { href: '/equipe',      label: 'Equipe',      icon: UsersRound },
      { href: '/documentos',  label: 'Documentos',  icon: Files },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/membros',       label: 'Membros',        icon: Users,    roleRequired: 'superadmin' },
      { href: '/configuracoes', label: 'Configurações',  icon: Settings },
    ],
  },
]

type Notif = { id: number; autor: string; texto: string; isDM: boolean; lida: boolean; at: Date }

export function AppSidebar() {
  const pathname = usePathname()
  const { user, role, signOut } = useAuth()
  const supabase = createClient()

  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const notifIdRef             = useRef(0)

  const unreadCount = notifs.filter(n => !n.lida).length

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

  // Ativa vínculo de equipe se o usuário chegou via convite
  useEffect(() => {
    fetch('/api/team/activate', { method: 'POST' }).catch(() => {})
  }, [])

  // Marca como lidas ao entrar no chat
  useEffect(() => {
    if (pathname.startsWith('/chat')) setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
  }, [pathname])

  // Subscriptions de notificação de chat
  useEffect(() => {
    if (!user) return

    let channelIds: string[] = []
    let dmIds: string[]      = []
    const subs: ReturnType<typeof supabase.channel>[] = []

    function addNotif(autor: string, texto: string, isDM: boolean) {
      if (pathname.startsWith('/chat')) return
      const id = ++notifIdRef.current
      setNotifs(prev => [{ id, autor, texto, isDM, lida: false, at: new Date() }, ...prev.slice(0, 19)])
    }

    async function setup() {
      // Descobre o workspace
      const wsRes = await fetch('/api/team/workspace')
      const ws    = await wsRes.json()
      const ownerId = ws.ownerId ?? user!.id

      // Canais do workspace
      const { data: channels } = await supabase
        .from('chat_canais').select('id').eq('user_id', ownerId)
      channelIds = (channels ?? []).map((c: { id: string }) => c.id)

      // DMs do usuário
      const { data: dms } = await supabase
        .from('chat_dms').select('id')
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
      dmIds = (dms ?? []).map((d: { id: string }) => d.id)

      // Subscriptions de canais
      if (channelIds.length > 0) {
        const sub = supabase.channel('notif:canal:' + user!.id)
        channelIds.forEach(cid => {
          sub.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `canal_id=eq.${cid}` },
            (payload) => {
              const msg = payload.new as { autor_id: string; autor_nome: string; conteudo: string }
              if (msg.autor_id === user!.id) return
              addNotif(msg.autor_nome, msg.conteudo, false)
            }
          )
        })
        sub.subscribe()
        subs.push(sub)
      }

      // Subscriptions de DMs
      if (dmIds.length > 0) {
        const sub = supabase.channel('notif:dm:' + user!.id)
        dmIds.forEach(did => {
          sub.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_dm_mensagens', filter: `dm_id=eq.${did}` },
            (payload) => {
              const msg = payload.new as { autor_id: string; autor_nome: string; conteudo: string }
              if (msg.autor_id === user!.id) return
              addNotif(msg.autor_nome, msg.conteudo, true)
            }
          )
        })
        sub.subscribe()
        subs.push(sub)
      }
    }

    setup()

    return () => { subs.forEach(s => supabase.removeChannel(s)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function dismissNotif(id: number) {
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
  }

  function formatTime(date: Date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60)  return 'agora'
    if (diff < 3600) return `${Math.floor(diff / 60)}min`
    return `${Math.floor(diff / 3600)}h`
  }

  return (
    <>
      <aside className="flex flex-col w-60 min-h-screen border-r border-sidebar-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <Logo size={32} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground leading-none truncate">
              Orbit™
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Método ÓRBITA
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(item => !item.roleRequired || item.roleRequired === role)
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 pb-1.5 font-medium">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(({ href, label, icon: Icon, badge }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    const isChat = href === '/chat'
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
                        {isChat && unreadCount > 0 && !active && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
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
                </div>
              </div>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-3 space-y-0.5 border-t border-sidebar-border pt-3">
          {/* Bell / Notificações */}
          <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all group bg-transparent border-0 cursor-pointer">
              <div className="relative shrink-0">
                <Bell size={16} className="text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="flex-1 text-left">Notificações</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Notificações</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck size={12} />
                    Marcar tudo como lido
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Sem notificações</p>
                  </div>
                ) : (
                  notifs.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors ${!n.lida ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${!n.lida ? 'bg-primary/15' : 'bg-muted'}`}>
                        <MessageSquareDot size={13} className={!n.lida ? 'text-primary' : 'text-muted-foreground'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`text-xs font-semibold truncate ${!n.lida ? 'text-foreground' : 'text-foreground/70'}`}>
                            {n.autor}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(n.at)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {n.isDM ? 'Mensagem privada' : 'Chat Interno'} · {n.texto}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotif(n.id)}
                        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 mt-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifs.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-4 py-2">
                    <button
                      onClick={() => { setNotifs([]); setBellOpen(false) }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                    >
                      Limpar tudo
                    </button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>

        {/* User */}
        <div className="px-3 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-all text-left cursor-pointer bg-transparent border-0">
              <div className="relative shrink-0">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={`text-xs font-semibold ${role === 'superadmin' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {role === 'superadmin' && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm" title="Administrador">
                    <ShieldCheck size={8} className="text-black" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {(user?.user_metadata?.full_name as string | undefined) ?? 'Usuário'}
                  </p>
                  {role === 'superadmin' && (
                    <span className="shrink-0 text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 rounded px-1 py-px leading-none">
                      ADMIN
                    </span>
                  )}
                </div>
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
    </>
  )
}
