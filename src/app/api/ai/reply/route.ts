import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

const FALLBACK_PROMPT = `você é lunna, assistente da propulsor criativo.
missão: entender o momento da marca, identificar necessidades e direcionar o cliente para o atendimento ideal.
regras: mensagens curtas, escrever em minúsculo, tom natural e humano, nunca agir como bot.`

interface AiConfig {
  nome: string
  cargo: string
  missao: string | null
  agencia: string | null
  tom_de_voz: string[]
  regras: string[]
  proibicoes: string[]
  emojis_permitidos: string[]
  emojis_proibidos: string[]
  exemplos: string[]
  conhecimento?: string | null
}

function buildSystemPrompt(c: AiConfig, areas: string[] = [], hasCalendar = false): string {
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
- quando o cliente confirmar um horário, colete (se ainda não tiver): nome completo, nome da empresa, telefone, e-mail e objetivo da reunião
- com TODOS os dados em mãos (incluindo e-mail), chame criar_evento OBRIGATORIAMENTE — nunca confirme o agendamento sem ter chamado a ferramenta primeiro
- se criar_evento retornar erro, diga ao cliente que houve um problema e peça para ele confirmar por outro canal
- após criar_evento retornar sucesso, envie UMA única mensagem confirmando o agendamento com o link meet — ex: "call marcada! aqui está o link da reunião: https://meet.google.com/xxx. até lá!" — nunca use markdown, nunca repita o link em outra mensagem
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

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
          data_inicio:   { type: 'string', description: 'ISO 8601. Ex: 2025-06-10T14:00:00-03:00' },
          data_fim:      { type: 'string', description: 'ISO 8601. Ex: 2025-06-10T15:00:00-03:00' },
          nome_cliente:  { type: 'string' },
          nome_empresa:  { type: 'string' },
          telefone:      { type: 'string' },
          objetivo:      { type: 'string' },
          email_cliente: { type: 'string', description: 'E-mail do cliente para enviar o convite do Google Calendar' },
        },
        required: ['data_inicio', 'data_fim', 'nome_cliente', 'nome_empresa', 'telefone', 'objetivo', 'email_cliente'],
      },
    },
  },
]

async function runCalendarTool(
  name: string,
  args: Record<string, string>,
  gcalToken: string,
): Promise<string> {
  try {
    if (name === 'consultar_disponibilidade') {
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      url.searchParams.set('timeMin', args.data_inicio)
      url.searchParams.set('timeMax', args.data_fim)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('maxResults', '10')
      const res    = await fetch(url.toString(), { headers: { Authorization: `Bearer ${gcalToken}` } })
      const data   = await res.json()
      if (!res.ok) return `erro ao consultar agenda: ${data?.error?.message ?? res.status}`
      const events = data.items ?? []
      if (events.length === 0) return 'horário disponível'
      return `horário ocupado: ${events.map((e: { summary?: string }) => e.summary ?? 'evento').join(', ')}`
    }

    if (name === 'criar_evento') {
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
        {
          method:  'POST',
          headers: { Authorization: `Bearer ${gcalToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary:     `Call — ${args.nome_cliente} (${args.nome_empresa})`,
            description: `Objetivo: ${args.objetivo}\nTelefone: ${args.telefone}`,
            start: { dateTime: args.data_inicio, timeZone: 'America/Sao_Paulo' },
            end:   { dateTime: args.data_fim,    timeZone: 'America/Sao_Paulo' },
            attendees: [{ email: args.email_cliente, displayName: args.nome_cliente }],
            conferenceData: {
              createRequest: {
                requestId: `orbit-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) return `erro ao criar evento: ${data?.error?.message ?? res.status}`
      const meetLink = data.conferenceData?.entryPoints?.find((e: { entryPointType: string; uri: string }) => e.entryPointType === 'video')?.uri ?? ''
      return `evento criado com sucesso: ${data.summary} em ${data.start?.dateTime}. link meet: ${meetLink}. convite enviado para ${args.email_cliente}`
    }
  } catch (err) {
    return `erro na ferramenta: ${err instanceof Error ? err.message : String(err)}`
  }

  return 'tool desconhecida'
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY não configurado' }, { status: 503 })
    }

    const { messages, clientName: _clientName, gcalToken, userId } = await request.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'Nenhuma mensagem fornecida' }, { status: 400 })
    }

    // Fetch user's AI config + areas from Supabase
    let systemPrompt = FALLBACK_PROMPT
    if (userId) {
      try {
        const admin = createAdminClient()
        const [{ data }, { data: { user: authUser } }] = await Promise.all([
          admin.from('ai_config').select('*').eq('user_id', userId).maybeSingle(),
          admin.auth.admin.getUserById(userId),
        ])
        const areas: string[] = Array.isArray(authUser?.user_metadata?.areas_de_atuacao)
          ? (authUser!.user_metadata!.areas_de_atuacao as string[])
          : []
        if (data) systemPrompt = buildSystemPrompt(data as AiConfig, areas, !!gcalToken)
      } catch { /* use fallback */ }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const useTools = !!gcalToken

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(messages as { from: string; content: string }[]).map(m => ({
        role: (['Equipe', 'Lunna'].includes(m.from) ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      })),
    ]

    let response = await openai.chat.completions.create({
      model:       'gpt-4o',
      temperature: 0.75,
      max_tokens:  400,
      messages:    chatMessages,
      ...(useTools ? { tools, tool_choice: 'auto' } : {}),
    })

    while (response.choices[0]?.finish_reason === 'tool_calls') {
      const assistantMsg = response.choices[0].message
      chatMessages.push(assistantMsg)
      for (const tc of assistantMsg.tool_calls ?? []) {
        if (tc.type !== 'function') continue
        const args   = JSON.parse(tc.function.arguments) as Record<string, string>
        const result = await runCalendarTool(tc.function.name, args, gcalToken as string)
        chatMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
      }
      response = await openai.chat.completions.create({
        model:       'gpt-4o',
        temperature: 0.75,
        max_tokens:  400,
        messages:    chatMessages,
        tools,
        tool_choice: 'auto',
      })
    }

    const reply = response.choices[0]?.message?.content?.trim() ?? ''
    return NextResponse.json({ reply })

  } catch (err) {
    console.error('[ai/reply]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
