import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params
  const { stage } = await request.json()

  const supabase = await createClient()

  const { error } = await supabase
    .from('op_pipeline_items')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', cardId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
