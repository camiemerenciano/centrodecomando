'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Unplug,
  Plug,
  Calendar,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  Smartphone,
} from 'lucide-react'

const QR_TTL = 45 // seconds before QR expires

// ── WhatsApp / Evolution ──────────────────────────────────────────────────────

type WaStatus = 'disconnected' | 'loading_qr' | 'awaiting_scan' | 'connected'

function saveEvoToStorage(url: string, key: string, inst: string) {
  localStorage.setItem('evo_apiUrl',   url)
  localStorage.setItem('evo_apiKey',   key)
  localStorage.setItem('evo_instance', inst)
}

function clearEvoFromStorage() {
  localStorage.removeItem('evo_apiUrl')
  localStorage.removeItem('evo_apiKey')
  localStorage.removeItem('evo_instance')
}

function WhatsAppCard() {
  const [status, setStatus]     = useState<WaStatus>('disconnected')
  const [apiUrl, setApiUrl]     = useState('')
  const [apiKey, setApiKey]     = useState('')
  const [instance, setInstance] = useState('')
  const [showKey, setShowKey]   = useState(false)
  const [qrBase64, setQrBase64] = useState('')
  const [qrCode, setQrCode]     = useState('')
  const [qrError, setQrError]   = useState('')
  const [ttl, setTtl]           = useState(QR_TTL)
  const [expired, setExpired]   = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    const url  = localStorage.getItem('evo_apiUrl')
    const key  = localStorage.getItem('evo_apiKey')
    const inst = localStorage.getItem('evo_instance')
    if (url && key && inst) {
      setApiUrl(url); setApiKey(key); setInstance(inst)
      setStatus('connected')
    }
  }, [])

  // Countdown while QR is visible
  useEffect(() => {
    if (status !== 'awaiting_scan') return
    setTtl(QR_TTL)
    setExpired(false)
    const interval = setInterval(() => {
      setTtl(t => {
        if (t <= 1) { clearInterval(interval); setExpired(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [status, qrBase64, qrCode])

  // Poll connection state while showing QR
  useEffect(() => {
    if (status !== 'awaiting_scan') return
    const poll = setInterval(async () => {
      try {
        const res  = await fetch('/api/evolution/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiUrl, apiKey, instanceName: instance }),
        })
        const data = await res.json()
        if (data?.state === 'open') {
          saveEvoToStorage(apiUrl, apiKey, instance)
          setStatus('connected')
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [status, apiUrl, apiKey, instance])

  async function fetchQr() {
    setQrError('')
    setStatus('loading_qr')
    try {
      const res = await fetch('/api/evolution/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, apiKey, instanceName: instance }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`)
      setQrBase64(data.qrBase64 ?? '')
      setQrCode(data.qrCode ?? '')
      setStatus('awaiting_scan')
    } catch (err: unknown) {
      setQrError(err instanceof Error ? err.message : 'Erro ao gerar QR Code')
      setStatus('disconnected')
    }
  }

  async function handleGenerateQr() {
    if (!apiUrl || !apiKey || !instance) return
    await fetchQr()
  }

  async function handleRefreshQr() {
    setExpired(false)
    setTtl(QR_TTL)
    await fetchQr()
  }

  function handleDisconnect() {
    clearEvoFromStorage()
    setStatus('disconnected')
    setQrBase64('')
    setQrCode('')
    setQrError('')
    setExpired(false)
  }

  const formValid = apiUrl.trim() && apiKey.trim() && instance.trim()

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
          <StatusBadge status={status === 'loading_qr' || status === 'awaiting_scan' ? 'connecting' : status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Receba e envie mensagens do WhatsApp diretamente no Centro de Comando.
          Todas as conversas ficam centralizadas no módulo de Mensagens.
        </p>

        {/* ── form ── */}
        {status === 'disconnected' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">URL da Evolution API</label>
              <input
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://evolution.suaagencia.com"
                className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">Nome da instância</label>
              <input
                value={instance}
                onChange={e => setInstance(e.target.value)}
                placeholder="nexus-agency"
                className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>
        )}

        {/* ── error ── */}
        {qrError && status === 'disconnected' && (
          <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{qrError}</p>
          </div>
        )}

        {/* ── loading QR ── */}
        {status === 'loading_qr' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Conectando à Evolution API…</p>
          </div>
        )}

        {/* ── QR code ── */}
        {status === 'awaiting_scan' && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className={`rounded-xl p-3 bg-white transition-all ${expired ? 'opacity-30 blur-[2px]' : ''}`}>
                {qrBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrBase64} alt="QR Code WhatsApp" width={164} height={164} className="block" />
                ) : (
                  <QRCodeSVG value={qrCode} size={164} bgColor="#ffffff" fgColor="#111111" level="M" />
                )}
              </div>
              {expired && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handleRefreshQr}
                    className="flex flex-col items-center gap-1.5 bg-card/90 rounded-xl px-4 py-3 border border-border shadow-lg backdrop-blur-sm"
                  >
                    <RefreshCw size={20} className="text-primary" />
                    <span className="text-xs font-medium text-foreground">QR expirado</span>
                    <span className="text-[10px] text-muted-foreground">Clique para gerar novo</span>
                  </button>
                </div>
              )}
            </div>

            {!expired && (
              <div className="text-center space-y-1">
                <div className="flex items-center gap-1.5 justify-center">
                  <Smartphone size={12} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Abra o WhatsApp → <span className="text-foreground font-medium">Dispositivos conectados</span> → Conectar
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  QR expira em <span className={`font-semibold ${ttl <= 10 ? 'text-red-400' : 'text-foreground'}`}>{ttl}s</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── connected ── */}
        {status === 'connected' && (
          <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-3 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Instância conectada</p>
              <p className="text-xs text-muted-foreground truncate">{instance || 'nexus-agency'}</p>
            </div>
          </div>
        )}

        {/* ── actions ── */}
        <div className="flex items-center gap-2 pt-1">
          {status === 'connected' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                onClick={fetchQr}
              >
                <RefreshCw size={13} /> Reconectar
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
          ) : status === 'awaiting_scan' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border"
              onClick={handleDisconnect}
            >
              Cancelar
            </Button>
          ) : status === 'disconnected' ? (
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90"
              disabled={!formValid}
              onClick={handleGenerateQr}
            >
              <Plug size={13} /> Gerar QR Code
            </Button>
          ) : null}

          <a
            href="https://doc.evolution-api.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            Documentação <ExternalLink size={11} />
          </a>
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

  // Restore from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('gcal_token')
    const email = localStorage.getItem('gcal_email')
    const name  = localStorage.getItem('gcal_name')
    if (token && email) {
      setConnectedEmail(email)
      setConnectedName(name ?? '')
      setCalendars([
        { id: 'primary', name: email,                primary: true,  selected: true  },
        { id: 'cal2',    name: 'Agência – Entregas', primary: false, selected: true  },
        { id: 'cal3',    name: 'Feriados no Brasil', primary: false, selected: false },
      ])
      setStatus('connected')
    }
  }, [])

  function saveToStorage(token: string, email: string, name: string) {
    localStorage.setItem('gcal_token', token)
    localStorage.setItem('gcal_email', email)
    localStorage.setItem('gcal_name',  name)
  }

  function clearStorage() {
    localStorage.removeItem('gcal_token')
    localStorage.removeItem('gcal_email')
    localStorage.removeItem('gcal_name')
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

      const email = e.data.email ?? ''
      const name  = e.data.name  ?? ''
      const token = e.data.access_token ?? ''

      saveToStorage(token, email, name)
      setConnectedEmail(email)
      setConnectedName(name)
      setCalendars([
        { id: 'primary', name: email,                primary: true,  selected: true  },
        { id: 'cal2',    name: 'Agência – Entregas', primary: false, selected: true  },
        { id: 'cal3',    name: 'Feriados no Brasil', primary: false, selected: false },
      ])
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
    clearStorage()
    setStatus('disconnected')
    setConnectedEmail('')
    setConnectedName('')
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
            deadlines aparecem automaticamente no Calendário do Centro de Comando.
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
                <Button variant="outline" size="sm" className="h-8 text-xs border-border">
                  <RefreshCw size={13} /> Sincronizar agora
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
