'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Unplug,
  Plug,
  Calendar,
  MessageCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

// ── WhatsApp / Evolution ──────────────────────────────────────────────────────

type WaStatus = 'disconnected' | 'saving' | 'connected'

function WhatsAppCard() {
  const [status, setStatus]       = useState<WaStatus>('disconnected')
  const [formUrl, setFormUrl]     = useState('')
  const [formKey, setFormKey]     = useState('')
  const [formInst, setFormInst]   = useState('')
  const [instance, setInstance]   = useState('')
  const [error, setError]         = useState('')
  const supabase = createClient()

  async function saveEvoToSupabase(url: string, key: string, inst: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('integracoes').upsert({
      user_id:          user.id,
      evo_api_url:      url,
      evo_api_key:      key,
      evo_instance:     inst,
      evo_connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    localStorage.setItem('evo_apiUrl',      url)
    localStorage.setItem('evo_apiKey',      key)
    localStorage.setItem('evo_instance',    inst)
    localStorage.setItem('evo_connectedAt', new Date().toISOString())
  }

  async function clearEvoFromSupabase() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('integracoes').upsert({
      user_id:          user.id,
      evo_api_url:      null,
      evo_api_key:      null,
      evo_instance:     null,
      evo_connected_at: null,
    }, { onConflict: 'user_id' })
    localStorage.removeItem('evo_apiUrl')
    localStorage.removeItem('evo_apiKey')
    localStorage.removeItem('evo_instance')
  }

  // Restore from Supabase on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('integracoes')
        .select('evo_api_url, evo_api_key, evo_instance')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data?.evo_api_url && data?.evo_api_key && data?.evo_instance) {
        setInstance(data.evo_instance)
        setFormUrl(data.evo_api_url)
        setFormKey(data.evo_api_key)
        setFormInst(data.evo_instance)
        setStatus('connected')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConnect() {
    const url  = formUrl.trim().replace(/\/$/, '')
    const key  = formKey.trim()
    const inst = formInst.trim()
    if (!url || !key || !inst) { setError('Preencha todos os campos.'); return }
    setError('')
    setStatus('saving')
    try {
      // Verifica se a instância existe e está conectada
      const res  = await fetch('/api/evolution/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: url, apiKey: key, instanceName: inst }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`)
      await saveEvoToSupabase(url, key, inst)
      setInstance(inst)
      setStatus('connected')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar. Verifique as credenciais.')
      setStatus('disconnected')
    }
  }

  async function handleDisconnect() {
    await clearEvoFromSupabase()
    setStatus('disconnected')
    setInstance('')
    setError('')
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <MessageCircle size={22} className="text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">WhatsApp</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">via Evolution API</p>
            </div>
          </div>
          <StatusBadge status={status === 'saving' ? 'connecting' : status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Receba e envie mensagens do WhatsApp diretamente no Orbit™.
          Todas as conversas ficam centralizadas no módulo de Mensagens.
        </p>

        {error && (
          <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {status === 'connected' ? (
          <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-3 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">WhatsApp conectado</p>
              <p className="text-xs text-muted-foreground truncate">{instance}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">URL da API</label>
              <input
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://sua-evolution.com"
                className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">API Key</label>
              <input
                value={formKey}
                onChange={e => setFormKey(e.target.value)}
                placeholder="sua-api-key"
                type="password"
                className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Nome da instância</label>
              <input
                value={formInst}
                onChange={e => setFormInst(e.target.value)}
                placeholder="minha-instancia"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {status === 'connected' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
              onClick={handleDisconnect}
            >
              <Unplug size={13} /> Desconectar
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90"
              disabled={status === 'saving'}
              onClick={handleConnect}
            >
              {status === 'saving'
                ? <><Loader2 size={13} className="animate-spin" /> Conectando…</>
                : <><Plug size={13} /> Conectar</>
              }
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Google Agenda ─────────────────────────────────────────────────────────────

type GcalStatus = 'disconnected' | 'connecting' | 'connected'

type GcalCalendar = { id: string; name: string; primary: boolean; selected: boolean }

function GoogleCalendarCard() {
  const [status, setStatus]                 = useState<GcalStatus>('disconnected')
  const [connectedEmail, setConnectedEmail] = useState('')
  const [connectedName, setConnectedName]   = useState('')
  const [calendars, setCalendars]           = useState<GcalCalendar[]>([])
  const [authError, setAuthError]           = useState('')
  const [syncing, setSyncing]               = useState(false)
  const [syncOk, setSyncOk]                 = useState(false)
  const [accessToken, setAccessToken]       = useState('')
  const supabase = createClient()

  function buildCalendars(email: string): GcalCalendar[] {
    return [
      { id: 'primary', name: email,                primary: true,  selected: true  },
      { id: 'cal2',    name: 'Agência – Entregas', primary: false, selected: true  },
      { id: 'cal3',    name: 'Feriados no Brasil', primary: false, selected: false },
    ]
  }

  // Load from Supabase on mount — auto-refresh token if expired
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('integracoes')
        .select('gcal_access_token, gcal_refresh_token, gcal_email, gcal_name')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data?.gcal_email) return

      let accessToken = data.gcal_access_token

      // Try to refresh the access token if we have a refresh token
      if (data.gcal_refresh_token) {
        try {
          const res = await fetch('/api/auth/google/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: data.gcal_refresh_token }),
          })
          const refreshed = await res.json()
          if (refreshed.access_token) {
            accessToken = refreshed.access_token
            // Persist the fresh token
            await supabase.from('integracoes').upsert({
              user_id:           user.id,
              gcal_access_token: refreshed.access_token,
            }, { onConflict: 'user_id' })
          }
        } catch { /* use stored token as fallback */ }
      }

      if (accessToken && data.gcal_email) {
        setAccessToken(accessToken as string)
        setConnectedEmail(data.gcal_email)
        setConnectedName(data.gcal_name ?? '')
        setCalendars(buildCalendars(data.gcal_email))
        setStatus('connected')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveToSupabase(token: string, refreshToken: string, email: string, name: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('integracoes').upsert({
      user_id:            user.id,
      gcal_access_token:  token,
      gcal_refresh_token: refreshToken,
      gcal_email:         email,
      gcal_name:          name,
      gcal_connected_at:  new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  async function clearFromSupabase() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('integracoes').update({
      gcal_access_token:  null,
      gcal_refresh_token: null,
      gcal_email:         null,
      gcal_name:          null,
      gcal_connected_at:  null,
    }).eq('user_id', user.id)
  }

  function openOAuthPopup() {
    setAuthError('')
    setStatus('connecting')

    const width  = 500
    const height = 640
    const left   = window.screenX + (window.innerWidth  - width)  / 2
    const top    = window.screenY + (window.innerHeight - height) / 2

    const popup = window.open(
      '/api/auth/google',
      'google_oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,location=0`
    )

    if (!popup || popup.closed) {
      setStatus('disconnected')
      setAuthError('O popup foi bloqueado pelo navegador. Permita popups para este site.')
      return
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'google_auth') return
      window.removeEventListener('message', onMessage)

      if (e.data.error) {
        setStatus('disconnected')
        if (e.data.error !== 'cancelled') {
          setAuthError('Erro ao autenticar com o Google. Tente novamente.')
        }
        return
      }

      const email        = e.data.email         ?? ''
      const name         = e.data.name          ?? ''
      const token        = e.data.access_token  ?? ''
      const refreshToken = e.data.refresh_token ?? ''

      saveToSupabase(token, refreshToken, email, name)
      setAccessToken(token)
      setConnectedEmail(email)
      setConnectedName(name)
      setCalendars(buildCalendars(email))
      setStatus('connected')
    }

    window.addEventListener('message', onMessage)

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer)
        window.removeEventListener('message', onMessage)
        setStatus(s => s === 'connecting' ? 'disconnected' : s)
      }
    }, 500)
  }

  function handleDisconnect() {
    clearFromSupabase()
    setStatus('disconnected')
    setConnectedEmail('')
    setConnectedName('')
    setAccessToken('')
  }

  async function handleSync() {
    if (!accessToken) return
    setSyncing(true)
    setSyncOk(false)
    try {
      const now    = new Date()
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      url.searchParams.set('timeMin', now.toISOString())
      url.searchParams.set('timeMax', oneWeek.toISOString())
      url.searchParams.set('maxResults', '5')
      url.searchParams.set('singleEvents', 'true')
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        setSyncOk(true)
        setTimeout(() => setSyncOk(false), 3000)
      } else {
        setAuthError('Falha na sincronização. Tente reconectar.')
      }
    } catch {
      setAuthError('Erro de conexão ao sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  function toggleCalendar(id: string) {
    setCalendars(prev =>
      prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c)
    )
  }

  return (
    <>

      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" className="text-sky-400" />
                  <path d="M16 2v4M8 2v4M3 9h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-sky-400" />
                  <rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor" className="text-sky-400" />
                  <rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor" className="text-sky-400" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Google Agenda</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">via OAuth 2.0</p>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sincronize eventos e prazos com o Google Agenda. Postagens, reuniões e
            deadlines aparecem automaticamente no Calendário do Orbit™.
          </p>

          {status === 'connecting' && (
            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3 flex items-center gap-3">
              <Loader2 size={15} className="text-amber-400 animate-spin shrink-0" />
              <div>
                <p className="text-sm text-foreground">Aguardando autenticação…</p>
                <p className="text-xs text-muted-foreground">Complete o login na janela do Google</p>
              </div>
            </div>
          )}

          {authError && status === 'disconnected' && (
            <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{authError}</p>
            </div>
          )}

          {status === 'connected' && (
            <div className="space-y-3">
              <div className="rounded-lg bg-sky-500/8 border border-sky-500/20 p-3 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-sky-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{connectedName || 'Conta conectada'}</p>
                  <p className="text-xs text-muted-foreground truncate">{connectedEmail}</p>
                </div>
                <button
                  className="text-[10px] text-primary hover:text-primary/80 transition-colors shrink-0"
                  onClick={openOAuthPopup}
                >
                  Trocar conta
                </button>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground/80 mb-2">Agendas sincronizadas</p>
                <div className="space-y-1.5">
                  {calendars.map(cal => (
                    <button
                      key={cal.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group text-left"
                      onClick={() => toggleCalendar(cal.id)}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        cal.selected ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'
                      }`}>
                        {cal.selected && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-foreground truncate flex-1">{cal.name}</span>
                      {cal.primary && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-0 shrink-0">Principal</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <AlertCircle size={12} className="shrink-0" />
                Sincronização automática a cada 15 minutos
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {status === 'connected' ? (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs border-border" onClick={handleSync} disabled={syncing}>
                  {syncing
                    ? <><Loader2 size={13} className="animate-spin" /> Sincronizando…</>
                    : syncOk
                    ? <><CheckCircle2 size={13} className="text-emerald-400" /> Sincronizado!</>
                    : <><RefreshCw size={13} /> Sincronizar agora</>
                  }
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                  onClick={handleDisconnect}
                >
                  <Unplug size={13} /> Desconectar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary/90"
                disabled={status === 'connecting'}
                onClick={openOAuthPopup}
              >
                {status === 'connecting'
                  ? <><Loader2 size={13} className="animate-spin" /> Aguardando…</>
                  : <><Calendar size={13} /> Conectar com Google</>
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[11px] gap-1 px-2 h-6 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Conectado
      </Badge>
    )
  }
  if (status === 'connecting') {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[11px] gap-1 px-2 h-6 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Conectando
      </Badge>
    )
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-0 text-[11px] gap-1 px-2 h-6 shrink-0">
      <XCircle size={11} />
      Desconectado
    </Badge>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConexoesPage() {
  return (
    <div className="max-w-[860px] space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Integrações ativas</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Conecte ferramentas externas para centralizar toda a operação da agência.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <WhatsAppCard />
        <GoogleCalendarCard />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
        <AlertCircle size={15} className="text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          As credenciais inseridas são armazenadas de forma segura e nunca expostas no lado do cliente.
          As conexões são gerenciadas via rotas de servidor.
        </p>
      </div>
    </div>
  )
}
