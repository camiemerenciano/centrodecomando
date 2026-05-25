import { NextRequest, NextResponse, after } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 30 // seconds — keeps the function alive for after()

// In-memory dedup — prevents double-reply if Evolution fires webhook twice
const processedIds = new Set<string>()

interface AiConfig {
  nome: string; cargo: string; missao: string | null; agencia: string | null
  tom_de_voz: string[]; regras: string[]; proibicoes: string[]
  emojis_permitidos: string[]; emojis_proibidos: string[]; exemplos: string[]
  conhecimento?: string | null
}

function buildSystemPrompt(c: AiConfig, areas: string[], hasCalendar = false): string {
  const parts: string[] = []

  parts.push(`você é ${c.nome}${c.cargo ? `, ${c.cargo}` : ''}${c.agencia ? ` da ${c.agencia}` : ''}.`)
  parts.push(`\n\nvocê é um ser humano conversando pelo whatsapp. nunca admita ser uma ia ou bot, mesmo que perguntem diretamente. se perguntarem, desvie naturalmente.`)

  if (c.missao) parts.push(`\n\nmissão: ${c.missao}`)

  if (c.conhecimento?.trim()) {
    parts.push(`\n\nbase de conhecimento sobre os serviços e a empresa (use isso para responder perguntas com propriedade):\n${c.conhecimento}`)
  }

  if (areas.length) parts.push(`\n\nserviços oferecidos (SOMENTE estes, nunca mencione outros): ${areas.join(', ')}`)

  if (c.regras.length) parts.push(`\n\nregras:\n${c.regras.map(r => `- ${r}`).join('\n')}`)
  if (c.proibicoes.length) parts.push(`\n\nproibido:\n${c.proibicoes.map(p => `- ${p}`).join('\n')}`)
  if (c.tom_de_voz.length) parts.push(`\n\ntom: ${c.tom_de_voz.join(', ')}`)
  if (c.emojis_permitidos.length) parts.push(`\n\nemojis permitidos (usar com moderação, apenas 1 por mensagem no máximo): ${c.emojis_permitidos.join(' ')}`)
  if (c.emojis_proibidos.length) parts.push(`\nemojis proibidos: ${c.emojis_proibidos.join(' ')}`)

  if (c.exemplos.length) parts.push(`\n\nexemplos de como você escreve:\n${c.exemplos.map(e => `- "${e}"`).join('\n')}`)

  if (hasCalendar) {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    parts.push(`\n\nDATA E HORA ATUAL (Brasília): ${now}

agendamento de reuniões (você tem acesso ao Google Agenda):
- quando o cliente demonstrar interesse em uma call ou reunião, conduza ativamente para o agendamento
- use a data atual acima para calcular datas relativas como "quinta", "amanhã", "semana que vem" — converta SEMPRE para ISO 8601 com fuso -03:00
- antes de propor qualquer horário, use consultar_disponibilidade para verificar se está livre
- proponha 2 ou 3 opções de horários disponíveis de forma natural, sem listas
- quando o cliente confirmar um horário, colete (se ainda não tiver): nome completo, nome da empresa, telefone e objetivo da reunião
- com TODOS os dados em mãos, chame criar_evento OBRIGATORIAMENTE — nunca confirme o agendamento sem ter chamado a ferramenta primeiro
- se criar_evento retornar erro, diga ao cliente que houve um problema e peça para ele confirmar por outro canal
- após criar_evento retornar sucesso, confirme o agendamento de forma natural e tranquila
- calls duram 1 hora por padrão, a menos que o cliente diga diferente`)
  }

  parts.push(`\n\nregras de formato:
- escreva SEMPRE em minúsculo
- mensagens curtas como no whatsapp (1-3 linhas)
- nunca use listas com bullet points, pontos ou numeração
- varie o tamanho das mensagens para soar natural
- retorne APENAS o texto da resposta, sem explicações nem aspas`)

  return parts.join('')
}

const FALLBACK_PROMPT = `você é lunna, assistente virtual. responda de forma natural, curta e em minúsculo. nunca admita ser uma ia.`

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

    const data         = body?.data ?? body
    const fromMe       = data?.key?.fromMe as boolean
    if (fromMe) return NextResponse.json({ ok: true })

    const msgId        = data?.key?.id as string
    const remoteJid    = data?.key?.remoteJid as string
    const instanceName = body?.instance as string
    const text         = extractText(data)
    const pushName     = (data?.pushName as string) ?? 'Cliente'

    if (!text || !remoteJid || !instanceName) return NextResponse.json({ ok: true })

    // Dedup
    if (processedIds.has(msgId)) return NextResponse.json({ ok: true })
    processedIds.add(msgId)
    if (processedIds.size > 2000) {
      const first = processedIds.values().next().value
      if (first) processedIds.delete(first)
    }

    const admin = createAdminClient()

    // ── Synchronous: find user + ensure pipeline lead exists ─────────────────
    const { data: integration } = await admin
      .from('integracoes')
      .select('user_id, evo_api_url, evo_api_key, gcal_access_token, gcal_refresh_token')
      .eq('evo_instance', instanceName)
      .maybeSingle()

    if (!integration?.user_id) return NextResponse.json({ ok: true })

    const { user_id, evo_api_url, evo_api_key, gcal_access_token, gcal_refresh_token } = integration

    // Auto-create pipeline lead — done synchronously so it's always guaranteed
    const { data: existingLead } = await admin
      .from('pipeline_leads')
      .select('id')
      .eq('user_id', user_id)
      .eq('remote_jid', remoteJid)
      .maybeSingle()

    if (!existingLead) {
      const phone = remoteJid.split('@')[0] ?? remoteJid
      const { error: insertErr } = await admin.from('pipeline_leads').insert({
        user_id,
        title:      pushName || `+${phone}`,
        client:     pushName || `+${phone}`,
        stage:      'recepcao',
        priority:   'medium',
        remote_jid: remoteJid,
      })
      if (insertErr) console.error('[webhook] pipeline_leads insert error:', insertErr)
    }

    // Check if Lunna is paused — synchronous so we don't waste time in after()
    const { data: pausa } = await admin
      .from('lunna_pausas')
      .select('remote_jid')
      .eq('user_id', user_id)
      .eq('remote_jid', remoteJid)
      .maybeSingle()

    // Return 200 to Evolution before the slow AI work starts
    if (pausa) return NextResponse.json({ ok: true })

    // ── Background: AI reply (slow — history fetch + OpenAI + 35s delay) ────
    after(async () => { try {
      // Refresh Google Calendar token (access tokens expire in 1h)
      let gcalToken: string | null = (gcal_access_token as string) ?? null
      if (gcal_refresh_token) {
        try {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id:     process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: gcal_refresh_token as string,
              grant_type:    'refresh_token',
            }),
          })
          const refreshData = await refreshRes.json()
          if (refreshData.access_token) {
            gcalToken = refreshData.access_token as string
            await admin.from('integracoes').update({ gcal_access_token: gcalToken }).eq('user_id', user_id)
          }
        } catch { /* keep existing token */ }
      }

      // Fetch message history for context
      const base    = (evo_api_url as string).replace(/\/$/, '')
      const headers = { 'Content-Type': 'application/json', apikey: evo_api_key as string }

      async function fetchMsgs(reqBody: unknown) {
        try {
          const res = await fetch(`${base}/chat/findMessages/${instanceName}`, {
            method: 'POST', headers, body: JSON.stringify(reqBody),
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
        .then((r: unknown[]) => r.length ? r : fetchMsgs({ where: { key: { remoteJid, fromMe: false } }, limit: 20 }))

      const history = [...sent, ...received]
        .sort((a, b) => getTs(a as Record<string, unknown>) - getTs(b as Record<string, unknown>))
        .slice(-20)
        .map((m: Record<string, unknown>) => {
          const mine = (m?.key as Record<string, unknown>)?.fromMe as boolean
          const content = extractText(m)
          return { from: mine ? 'Lunna' : pushName, content }
        })
        .filter(m => m.content)

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
        ? (authUser!.user_metadata!.areas_de_atuacao as string[])
        : []
      if (aiConfig) systemPrompt = buildSystemPrompt(aiConfig as AiConfig, areas, !!gcalToken)

      if (!process.env.OPENAI_API_KEY) return

      const PIPELINE_STAGES = `
- recepcao: primeiro contato, cliente ainda não qualificado
- viabilidade: entendendo necessidades, analisando se há fit
- ag_agendamento: cliente interessado, combinando horário para call
- agendado: call/reunião agendada
- contrato_enviado: proposta ou contrato enviado ao cliente
- contrato_assinado: cliente fechou, contrato assinado
- followup: cliente em acompanhamento pós-venda ou retomada
- perdido: cliente desistiu ou não tem fit`

      const allTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        {
          type: 'function',
          function: {
            name: 'classificar_pipeline',
            description: `Atualiza a etapa do pipeline com base no andamento da conversa. Use SEMPRE que a conversa avançar de etapa. Etapas:${PIPELINE_STAGES}`,
            parameters: {
              type: 'object',
              properties: {
                etapa: {
                  type: 'string',
                  enum: ['recepcao','viabilidade','ag_agendamento','agendado','contrato_enviado','contrato_assinado','followup','perdido'],
                  description: 'Nova etapa do pipeline',
                },
              },
              required: ['etapa'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'consultar_disponibilidade',
            description: 'Consulta eventos no Google Agenda para verificar se um horário está disponível.',
            parameters: {
              type: 'object',
              properties: {
                data_inicio: { type: 'string', description: 'ISO 8601. Ex: 2025-06-10T14:00:00-03:00' },
                data_fim:    { type: 'string', description: 'ISO 8601. Ex: 2025-06-10T15:00:00-03:00' },
              },
              required: ['data_inicio', 'data_fim'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'criar_evento',
            description: 'Cria um evento no Google Agenda para a call com o cliente.',
            parameters: {
              type: 'object',
              properties: {
                data_inicio:  { type: 'string' },
                data_fim:     { type: 'string' },
                nome_cliente: { type: 'string' },
                nome_empresa: { type: 'string' },
                telefone:     { type: 'string' },
                objetivo:     { type: 'string' },
              },
              required: ['data_inicio', 'data_fim', 'nome_cliente', 'nome_empresa', 'telefone', 'objetivo'],
            },
          },
        },
      ]

      async function runTool(name: string, args: Record<string, string>): Promise<string> {
        if (name === 'classificar_pipeline') {
          await admin.from('pipeline_leads')
            .update({ stage: args.etapa })
            .eq('user_id', user_id)
            .eq('remote_jid', remoteJid)
          return `pipeline atualizado para: ${args.etapa}`
        }
        if (!gcalToken) return 'google agenda não conectado'
        if (name === 'consultar_disponibilidade') {
          const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
          url.searchParams.set('timeMin', args.data_inicio)
          url.searchParams.set('timeMax', args.data_fim)
          url.searchParams.set('singleEvents', 'true')
          url.searchParams.set('orderBy', 'startTime')
          url.searchParams.set('maxResults', '10')
          const res  = await fetch(url.toString(), { headers: { Authorization: `Bearer ${gcalToken}` } })
          const d    = await res.json()
          const events = d.items ?? []
          if (events.length === 0) return 'horário disponível'
          return `horário ocupado: ${events.map((e: { summary?: string }) => e.summary ?? 'evento').join(', ')}`
        }
        if (name === 'criar_evento') {
          const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { Authorization: `Bearer ${gcalToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary:     `Call — ${args.nome_cliente} (${args.nome_empresa})`,
              description: `Objetivo: ${args.objetivo}\nTelefone: ${args.telefone}`,
              start: { dateTime: args.data_inicio, timeZone: 'America/Sao_Paulo' },
              end:   { dateTime: args.data_fim,    timeZone: 'America/Sao_Paulo' },
            }),
          })
          const d = await res.json()
          if (!res.ok) return `erro ao criar evento: ${JSON.stringify(d.error)}`
          return `evento criado: ${d.summary} em ${d.start?.dateTime}`
        }
        return 'tool desconhecida'
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({
          role: (['Lunna', 'Equipe'].includes(m.from) ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.content,
        })),
      ]

      let response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.75,
        max_tokens: 400,
        messages: chatMessages,
        tools: allTools,
        tool_choice: 'auto',
      })

      while (response.choices[0]?.finish_reason === 'tool_calls') {
        const assistantMsg = response.choices[0].message
        chatMessages.push(assistantMsg)
        for (const tc of assistantMsg.tool_calls ?? []) {
          if (tc.type !== 'function') continue
          const args   = JSON.parse(tc.function.arguments) as Record<string, string>
          const result = await runTool(tc.function.name, args)
          chatMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.75,
          max_tokens: 400,
          messages: chatMessages,
          tools: allTools,
          tool_choice: 'auto',
        })
      }

      const reply = response.choices[0]?.message?.content?.trim()
      if (!reply) return

      // Simulate human typing delay (keep short to avoid Vercel function timeout)
      await new Promise(resolve => setTimeout(resolve, 4_000))

      await fetch(`${base}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ number: remoteJid, text: reply }),
      })
    } catch (err) { console.error('[webhook:after]', err) }
    }) // end after()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook]', err)
    return NextResponse.json({ ok: true })
  }
}
