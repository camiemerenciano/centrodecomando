import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY não configurado — adicione ao .env.local para transcrição de áudio' },
      { status: 503 }
    )
  }

  const formData = await request.formData()
  const audio = formData.get('audio') as File | null

  if (!audio) {
    return NextResponse.json({ error: 'Nenhum arquivo de áudio enviado' }, { status: 400 })
  }

  const oaForm = new FormData()
  oaForm.append('file', audio, audio.name || 'audio.webm')
  oaForm.append('model', 'whisper-1')
  oaForm.append('language', 'pt')

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: oaForm,
  })

  if (!resp.ok) {
    const err = await resp.text()
    return NextResponse.json({ error: `Erro na transcrição: ${err}` }, { status: resp.status })
  }

  const data = await resp.json()
  return NextResponse.json({ transcription: data.text })
}
