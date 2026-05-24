import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY não configurado' },
      { status: 503 }
    )
  }

  const { messages, clientName } = await request.json()

  if (!messages?.length) {
    return NextResponse.json({ error: 'Nenhuma mensagem fornecida' }, { status: 400 })
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const transcript = (messages as { from: string; content: string }[])
    .map(m => `${m.from}: ${m.content}`)
    .join('\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Você é um assistente de uma agência de marketing. Analise a conversa com o cliente "${clientName}" e gere um resumo objetivo em português para a equipe interna, com:
- Ponto principal da conversa
- Solicitações ou aprovações do cliente
- Próximos passos identificados

Conversa:
${transcript}

Seja direto e use no máximo 4 itens.`,
      },
    ],
  })

  const summary = response.choices[0]?.message?.content ?? ''

  return NextResponse.json({ summary })
}
