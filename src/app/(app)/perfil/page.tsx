'use client'

import { useState, useEffect } from 'react'
import {
  User, Mail, Phone, Building2, Shield,
  Eye, EyeOff, LogOut, CheckCircle2,
  AlertCircle, Calendar, Loader2, Plug, Unplug,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function formatDate(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const supabase = createClient()

  // Profile form
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')

  // Password form
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [pwSaving, setPwSaving]       = useState(false)
  const [pwMsg, setPwMsg]             = useState('')
  const [pwError, setPwError]         = useState('')

  // Google connection
  const [gcalStatus, setGcalStatus]   = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [gcalEmail, setGcalEmail]     = useState('')
  const [gcalName, setGcalName]       = useState('')
  const [gcalError, setGcalError]     = useState('')

  const initials = name
    ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  // Load user data
  useEffect(() => {
    if (!user) return
    setName(user.user_metadata?.full_name ?? '')
    setPhone(user.user_metadata?.phone ?? '')
    setCpf(user.user_metadata?.cpf ?? '')
  }, [user])

  // Load Google connection from localStorage
  useEffect(() => {
    const token = localStorage.getItem('gcal_token')
    const email = localStorage.getItem('gcal_email')
    const gname = localStorage.getItem('gcal_name')
    if (token && email) {
      setGcalEmail(email)
      setGcalName(gname ?? '')
      setGcalStatus('connected')
    }
  }, [])

  async function saveProfile() {
    setSaving(true)
    setSaveMsg('')
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, phone, cpf },
    })
    setSaving(false)
    setSaveMsg(error ? `Erro: ${error.message}` : 'Salvo com sucesso!')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function updatePassword() {
    setPwError('')
    setPwMsg('')
    if (!newPw || newPw.length < 6) {
      setPwError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) {
      setPwError(error.message)
    } else {
      setPwMsg('Senha atualizada!')
      setCurrentPw('')
      setNewPw('')
      setTimeout(() => setPwMsg(''), 3000)
    }
  }

  function openOAuthPopup() {
    setGcalError('')
    setGcalStatus('connecting')
    const w = 500, h = 640
    const l = window.screenX + (window.innerWidth - w) / 2
    const t = window.screenY + (window.innerHeight - h) / 2
    const popup = window.open('/api/auth/google', 'google_oauth',
      `width=${w},height=${h},left=${l},top=${t},toolbar=0,menubar=0,location=0`)
    if (!popup || popup.closed) {
      setGcalStatus('disconnected')
      setGcalError('Popup bloqueado. Permita popups para este site.')
      return
    }
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.data?.type !== 'google_auth') return
      window.removeEventListener('message', onMessage)
      if (e.data.error) { setGcalStatus('disconnected'); return }
      localStorage.setItem('gcal_token', e.data.access_token ?? '')
      localStorage.setItem('gcal_email', e.data.email ?? '')
      localStorage.setItem('gcal_name',  e.data.name  ?? '')
      setGcalEmail(e.data.email ?? '')
      setGcalName(e.data.name ?? '')
      setGcalStatus('connected')
    }
    window.addEventListener('message', onMessage)
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer)
        window.removeEventListener('message', onMessage)
        setGcalStatus(s => s === 'connecting' ? 'disconnected' : s)
      }
    }, 500)
  }

  function disconnectGoogle() {
    localStorage.removeItem('gcal_token')
    localStorage.removeItem('gcal_email')
    localStorage.removeItem('gcal_name')
    setGcalStatus('disconnected')
    setGcalEmail('')
    setGcalName('')
  }

  const company = (user?.user_metadata?.company as string | undefined) ?? '—'

  return (
    <div className="max-w-[1100px] space-y-6">
      {/* Header card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{name || user?.email}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{company}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ativo
                </Badge>
                {company !== '—' && (
                  <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">{company}</Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 shrink-0"
            >
              <LogOut size={13} /> Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        {/* Left column — info panels */}
        <div className="space-y-4">
          {/* Conta */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" /> Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { label: 'STATUS',       value: <span className="text-emerald-400 font-medium">Ativo</span> },
                { label: 'CRIADO EM',    value: formatDate(user?.created_at) },
                { label: 'ATUALIZADO EM', value: formatDate(user?.updated_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{label}</span>
                  <span className="text-xs text-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Empresa */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 size={14} className="text-muted-foreground" /> Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">NOME</span>
                <span className="text-xs text-foreground">{company}</span>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail size={14} className="text-muted-foreground" /> Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { label: 'EMAIL',    value: user?.email ?? '—' },
                { label: 'TELEFONE', value: phone || '—'       },
                { label: 'CPF',      value: cpf   || '—'       },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-0.5">{label}</p>
                  <p className="text-xs text-foreground break-all">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column — forms */}
        <div className="space-y-5">
          {/* Dados do perfil */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User size={14} className="text-muted-foreground" /> Dados do perfil
              </CardTitle>
              <p className="text-xs text-muted-foreground">Atualize suas informações pessoais</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Nome</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full h-9 rounded-lg bg-muted border border-border pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={user?.email ?? ''}
                      disabled
                      className="w-full h-9 rounded-lg bg-muted/50 border border-border pl-8 pr-3 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Telefone</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+55 (11) 99999-9999"
                      className="w-full h-9 rounded-lg bg-muted border border-border pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">CPF</label>
                  <input
                    value={cpf}
                    onChange={e => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                {saveMsg && (
                  <span className={`text-xs flex items-center gap-1.5 ${saveMsg.startsWith('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {saveMsg.startsWith('Erro') ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                    {saveMsg}
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={saveProfile}
                  disabled={saving}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 ml-auto"
                >
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando…</> : 'Salvar alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Google Agenda */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" /> Google Agenda
              </CardTitle>
              <p className="text-xs text-muted-foreground">Sincronize eventos com o Calendário</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {gcalStatus === 'connected' ? (
                <div className="rounded-lg bg-sky-500/8 border border-sky-500/20 p-3 flex items-center gap-3">
                  <CheckCircle2 size={15} className="text-sky-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{gcalName || 'Conta conectada'}</p>
                    <p className="text-xs text-muted-foreground truncate">{gcalEmail}</p>
                  </div>
                  <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/20 text-[10px] shrink-0">Conectado</Badge>
                </div>
              ) : gcalStatus === 'connecting' ? (
                <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3 flex items-center gap-3">
                  <Loader2 size={14} className="text-amber-400 animate-spin shrink-0" />
                  <p className="text-sm text-foreground">Aguardando autenticação…</p>
                </div>
              ) : null}

              {gcalError && (
                <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-3 flex items-center gap-2">
                  <AlertCircle size={13} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{gcalError}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                {gcalStatus === 'connected' ? (
                  <>
                    <Button variant="outline" size="sm" className="h-8 text-xs border-border" onClick={openOAuthPopup}>
                      Trocar conta
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                      onClick={disconnectGoogle}
                    >
                      <Unplug size={13} /> Desconectar
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90"
                    disabled={gcalStatus === 'connecting'}
                    onClick={openOAuthPopup}
                  >
                    {gcalStatus === 'connecting'
                      ? <><Loader2 size={13} className="animate-spin" /> Aguardando…</>
                      : <><Plug size={13} /> Conectar com Google</>
                    }
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" /> Segurança
              </CardTitle>
              <p className="text-xs text-muted-foreground">Altere sua senha periodicamente para manter sua conta segura</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Senha atual</label>
                <div className="relative">
                  <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Digite sua senha atual"
                    className="w-full h-9 rounded-lg bg-muted border border-border pl-8 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Nova senha</label>
                <div className="relative">
                  <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="w-full h-9 rounded-lg bg-muted border border-border pl-8 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {pwError && (
                <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-2.5 flex items-center gap-2">
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{pwError}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {pwMsg && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> {pwMsg}
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={updatePassword}
                  disabled={pwSaving || !newPw}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 ml-auto"
                >
                  {pwSaving ? <><Loader2 size={13} className="animate-spin" /> Atualizando…</> : 'Atualizar senha'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
