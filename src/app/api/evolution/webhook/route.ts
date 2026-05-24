import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

// In-memory dedup — prevents double-reply if Evolution fires webhook twice
const processedIds = new Set<string>()

interface AiConfig {
  nome: string; cargo: string; missao: string | null; agencia: string | null
  tom_de_voz: string[]; regras: string[]; proibicoes: string[]
  emojis_permitidos: string[]; emojis_proibidos: string[]; exemplos: string[]
}

function buildSystemPrompt(c: AiConfig, areas: string[]): string {
  const parts: string[] = []
  parts.push(`você é ${c.nome}${c.cargo ? `, ${c.cargo}` : ''}${c.agencia ? ` da ${c.agencia}` : ''}.`)
  if (c.missao)            parts.push(`\nmissão: ${c.missao}`)
  if (areas.length)        parts.push(`\nserviços que a agência oferece (SOMENTE ofereça estes, nunca mencione outros): ${areas.join(', ')}`)
  if (c.regras.length)     parts.push(`\nregras obrigatórias:\n${c.regras.map(r => `- ${r}`).join('\n')}`)
  if (c.proibicoes.length) parts.push(`\nproibido:\n${c.proibicoes.map(p => `- ${p}`).join('\n')}`)
  if (c.tom_de_voz.length) parts.push(`\ntom: ${c.tom_de_voz.join(', ')}`)
  if (c.emojis_permitidos.length) parts.push(`\nemojis permitidos (usar com moderação): ${c.emojis_permitidos.join(' ')}`)
  if (c.emojis_proibidos.length)  parts.push(`\nemojis proibidos: ${c.emojis_proibidos.join(' ')}`)
  if (c.exemplos.length) parts.push(`\nexemplos:\n${c.exemplos.map(e => `- "${e}"`).join('\n')}`)
  parts.push(`\nescreva sempre em minúsculo. máximo 2 linhas. retorne APENAS o texto da resposta.`)
  return parts.join('')
}

const FALLBACK_PROMPT = `você é lunna, assistente virtual. responda de forma natural, curta e em minúsculo.`

function extractText(msg: Record<string, unknown>): string {
  const m = (msg.message ?? msg) as Record<string, unknown>
  return (
    (m?.conversation as string) ??
    ((m?.extendedTextMessage as Record<string, unknown>)?.text as string) ??
    ''
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Only handle new incoming messages (not sent by us)
    const event = body?.event as string
    if (event !== 'messages.upsert') return NextResponse.json({ ok: true })

    const data       = body?.data ?? body
    const fromMe     = data?.key?.fromMe as boolean
    if (fromMe) return NextResponse.json({ ok: true })

    const msgId      = data?.key?.id as string
    const remoteJid  = data?.key?.remoteJid as string
    const instanceName = body?.instance as string
    const text       = extractText(data)
    const pushName   = data?.pushName as string ?? 'Cliente'

    if (!text || !remoteJid || !instanceName) return NextResponse.json({ ok: true })

    // Dedup
    if (processedIds.has(msgId)) return NextResponse.json({ ok: true })
    processedIds.add(msgId)
    if (processedIds.size > 2000) {
      const first = processedIds.values().next().value
      if (first) processedIds.delete(first)
    }

    const admin = createAdminClient()

    // Find user by instance name
    const { data: integration } = await admin
      .from('integracoes')
      .select('user_id, evo_api_url, evo_api_key')
      .eq('evo_instance', instanceName)
      .maybeSingle()

    if (!integration?.user_id) return NextResponse.json({ ok: true })

    const { user_id, evo_api_url, evo_api_key } = integration

    // Auto-create pipeline lead if this contact has no existing lead
    const { data: existingLead } = await admin
      .from('pipeline_leads')
      .select('id')
      .eq('user_id', user_id)
      .eq('remote_jid', remoteJid)
      .maybeSingle()
    if (!existingLead) {
      const phone = remoteJid.split('@')[0] ?? remoteJid
      await admin.from('pipeline_leads').insert({
        user_id,
        title:      pushName || `+${phone}`,
        client:     pushName || `+${phone}`,
        stage:      'recepcao',
        priority:   'medium',
        remote_jid: remoteJid,
      })
    }

    // Check if Lunna is paused for this specific conversation
    const { data: pausa } = await admin
      .from('lunna_pausas')
      .select('remote_jid')
      .eq('user_id', user_id)
      .eq('remote_jid', remoteJid)
      .maybeSingle()
    if (pausa) return NextResponse.json({ ok: true })

    // Fetch message history for context
    const base    = (evo_api_url as string).replace(/\/$/, '')
    const headers = { 'Content-Type': 'application/json', apikey: evo_api_key as string }

    async function fetchMsgs(body: unknown) {
      try {
        const res = await fetch(`${base}/chat/findMessages/${instanceName}`, {
          method: 'POST', headers, body: JSON.stringify(body),
        })
        if (!res.ok) return []
        const d = await res.json().catch(() => ({}))
        const records = d?.messages?.records ?? d?.records ?? d?.messages
        return Array.isArray(records) ? records : Array.isArray(d) ? d : []
      } catch { return [] }
    }

    function getTs(m: Record<string, unknown>): number {
      const ts = m?.messageTimestamp
      if (!ts) return 0
      if (typeof ts === 'number') return ts
      if (typeof ts === 'string') return parseInt(ts, 10) || 0
      const o = ts as Record<string, number>
      if (typeof o?.low === 'number') return o.low + (o.high ?? 0) * 2 ** 32
      return 0
    }

    const sent     = await fetchMsgs({ where: { key: { remoteJid, fromMe: true } }, limit: 20 })
    const received = await fetchMsgs({ where: { key: { remoteJidAlt: remoteJid, fromMe: false } }, limit: 20 })
      .then(r => r.length ? r : fetchMsgs({ where: { key: { remoteJid, fromMe: false } }, limit: 20 }))

    const history = [...sent, ...received]
      .sort((a, b) => getTs(a as Record<string, unknown>) - getTs(b as Record<string, unknown>))
      .slice(-20)
      .map((m: Record<string, unknown>) => {
        const mine = (m?.key as Record<string, unknown>)?.fromMe as boolean
        const content = extractText(m)
        return { from: mine ? 'Lunna' : pushName, content }
      })
      .filter(m => m.content)

    // Ensure the latest incoming message is included
    if (!history.find(m => m.from !== 'Lunna' && m.content === text)) {
      history.push({ from: pushName, content: text })
    }

    // Fetch AI config + areas de atuação
    let systemPrompt = FALLBACK_PROMPT
    const [{ data: aiConfig }, { data: { user: authUser } }] = await Promise.all([
      admin.from('ai_config').select('*').eq('user_id', user_id).maybeSingle(),
      admin.auth.admin.getUserById(user_id),
    ])
    const areas: string[] = Array.isArray(authUser?.user_metadata?.areas_de_atuacao)
      ? authUser!.user_metadata!.areas_de_atuacao as string[]
      : []
    if (aiConfig) systemPrompt = buildSystemPrompt(aiConfig as AiConfig, areas)

    // Generate reply
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: true })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({
          role: (['Lunna', 'Equipe'].includes(m.from) ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.content,
        })),
      ],
    })

    const reply = completion.choices[0]?.message?.content?.trim()
    if (!reply) return NextResponse.json({ ok: true })

    // Send reply via Evolution
    await fetch(`${base}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: remoteJid, text: reply }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook]', err)
    return NextResponse.json({ ok: true }) // always 200 to avoid Evolution retries
  }
}
