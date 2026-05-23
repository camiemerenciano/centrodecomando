-- Add internal notes, AI summary to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS ai_summary      text,
  ADD COLUMN IF NOT EXISTS unread_count    int NOT NULL DEFAULT 0;

-- Extend messages with audio and internal note support
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_internal   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_type  text NOT NULL DEFAULT 'text', -- text | audio
  ADD COLUMN IF NOT EXISTS audio_url     text,
  ADD COLUMN IF NOT EXISTS transcription text;

-- Supabase Storage bucket for audio attachments (run once)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audio-messages', 'audio-messages', false)
-- ON CONFLICT DO NOTHING;

-- Storage policy: org members can upload/read audio in their org folder
-- CREATE POLICY "audio_org_access" ON storage.objects
--   FOR ALL USING (
--     bucket_id = 'audio-messages' AND
--     is_org_member((storage.foldername(name))[1]::uuid)
--   );
